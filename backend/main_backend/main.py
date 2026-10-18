from __future__ import annotations
import os, re, json, sqlite3, secrets, time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any
from fastapi import FastAPI, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel, Field

APP_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv('NETRA_DB_PATH', str(APP_DIR / 'data' / 'netra.db')))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def now(): return datetime.now(timezone.utc).isoformat()
def conn():
    c=sqlite3.connect(DB_PATH, timeout=10); c.row_factory=sqlite3.Row; c.execute('PRAGMA foreign_keys=ON'); return c

def init_db():
    with conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS patients(id INTEGER PRIMARY KEY, name TEXT NOT NULL DEFAULT 'Patient', created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS settings(patient_id INTEGER PRIMARY KEY REFERENCES patients(id), data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS questions(id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, text TEXT NOT NULL, intent TEXT, category TEXT, asker TEXT DEFAULT 'unknown', source TEXT DEFAULT 'browser-stt', created_at TEXT NOT NULL, final INTEGER DEFAULT 1);
        CREATE TABLE IF NOT EXISTS utterances(id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, text TEXT NOT NULL, source TEXT DEFAULT 'keyboard', question_id INTEGER, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS qa_memory(id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, question_text TEXT NOT NULL, answer_text TEXT NOT NULL, category TEXT, use_count INTEGER DEFAULT 1, last_used TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS phrases(id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, text TEXT NOT NULL, category TEXT DEFAULT 'personal', pinned INTEGER DEFAULT 0, position INTEGER DEFAULT 0, use_count INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS devices(id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, name TEXT NOT NULL, type TEXT DEFAULT 'lamp', state TEXT DEFAULT 'off', token TEXT NOT NULL, webhook_url TEXT, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, message TEXT NOT NULL, status TEXT DEFAULT 'active', repeat_count INTEGER DEFAULT 1, acknowledged_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        ''')
        c.execute("INSERT OR IGNORE INTO patients(id,name,created_at) VALUES(1,'Patient',?)",(now(),))
        c.execute('INSERT OR IGNORE INTO settings(patient_id,data) VALUES(1,?)',(json.dumps(default_settings()),))

def default_settings(): return {'patientName':'Patient','historyEnabled':True,'voice':{'lang':'en-IN','name':None,'rate':1.0,'pitch':1.0,'volume':1.0},'keyboard':{'layout':'adaptive','numbers':False,'predictions':4},'eye':{'dwellMs':800,'blinkMinMs':250,'longBlinkMs':700,'emergencyBlinkCount':6,'helpBlinkCount':3,'blinkWindowMs':4000},'suggestions':{'max':4,'useLlm':False},'emergency':{'message':'I need help. Please come now.'}}

def get_settings(pid):
    with conn() as c:
        r=c.execute('SELECT data FROM settings WHERE patient_id=?',(pid,)).fetchone()
        if not r:
            c.execute('INSERT INTO patients(id,name,created_at) VALUES(?,?,?)',(pid,'Patient',now())); c.execute('INSERT INTO settings(patient_id,data) VALUES(?,?)',(pid,json.dumps(default_settings()))); return default_settings()
        return json.loads(r['data'])

def save_settings(pid,data):
    with conn() as c: c.execute('INSERT INTO settings(patient_id,data) VALUES(?,?) ON CONFLICT(patient_id) DO UPDATE SET data=excluded.data',(pid,json.dumps(data)))

def deep_merge(a,b):
    for k,v in b.items():
        if isinstance(v,dict) and isinstance(a.get(k),dict): deep_merge(a[k],v)
        else: a[k]=v
    return a

RULES=[
('pain_where','pain',r'where.*(hurt|pain|ache)', ['My head','My chest','My stomach','My back','My leg','My arm']),
('pain_yn','pain',r'\b(pain|hurt|hurting|ache|sore|discomfort)\b',['Yes','No','A little','Yes, a lot']),
('breathing','breathing',r'\b(breath|breathe|breathing|oxygen|cough)\b',['Yes, it is hard to breathe','No, I can breathe fine','A little','Please call the doctor']),
('water','water',r'\b(thirst|thirsty|water|drink|sip|juice|tea|coffee|milk)\b',['Yes, water please','No, thank you','A small sip please']),
('food','food',r'\b(hungry|food|eat|meal|breakfast|lunch|dinner|snack)\b',['Yes, I am hungry','No, thank you','A little','Later please']),
('toilet','toilet',r'\b(toilet|bathroom|restroom|washroom|urinate|pee|commode|bedpan)\b',['Yes, please help me','No, not now','Soon','Yes, bedpan please']),
('medication','medication',r'\b(medicine|medication|meds|pill|tablet|injection|dose)\b',['Yes, please','No, thank you','Not now','What is it for?']),
('temperature','comfort',r'\b(cold|hot|warm|cool|blanket|fan|heater)\b',['I am cold','I am hot','Please add a blanket','Please turn on the fan','I am fine']),
('sleep','sleep',r'\b(sleep|sleepy|tired|rest|nap)\b',['Yes, I am tired','No','A little','I could not sleep']),
('family','family',r'\b(family|wife|husband|son|daughter|mother|father|brother|sister|visit)\b',['Yes, please call them','No, not now','When will they come?','Please tell them I am okay']),
('greeting','greeting',r'^(hello|hi|hey|good morning|good afternoon|good evening)\b',['Hello','Hello nurse','Thank you']),
('yes_no','general',r'^(do|does|did|are|is|am|can|could|would|will|have|has|was|were)\b',['Yes','No','I am not sure','Please repeat']),
('wh_generic','general',r'^(what|which|who|why|how|where)\b',['I do not know','Please repeat','Please wait','I need help'])]

def classify(q):
    n=re.sub(r'[^\w\s]',' ',q.lower()); n=' '.join(n.split())
    for i,cat,pat,replies in RULES:
        if re.search(pat,n): return i,cat,replies
    return 'general','general',['Yes','No','Please repeat','Please wait','Thank you','I need help']

def urgent(q): return bool(re.search(r'\b(emergency|help|can.t breathe|cannot breathe|difficulty breathing|chest pain|severe pain|choking)\b',q.lower()))
def suggestions_for(pid,q,limit=4):
    intent,cat,defaults=classify(q)
    with conn() as c: rows=c.execute('SELECT id,question_text,answer_text,category,use_count,last_used FROM qa_memory WHERE patient_id=? ORDER BY use_count DESC,last_used DESC',(pid,)).fetchall()
    ranked=[]; words=set(re.findall(r'[a-z]+',q.lower()))
    for r in rows:
        qwords=set(re.findall(r'[a-z]+',r['question_text'].lower())); overlap=len(words&qwords)/max(1,len(words|qwords))
        if r['category']==cat: overlap=max(overlap,0.65)
        if overlap>=0.2:
            ranked.append({'text':r['answer_text'],'source':'history','score':round(overlap*(1+min(r['use_count'],10)*0.08),3),'useCount':r['use_count'],'matchedQuestion':r['question_text'],'qaId':r['id']})
    ranked.sort(key=lambda x:x['score'],reverse=True)
    out=ranked[:limit]
    for x in defaults:
        if len(out)>=limit: break
        if not any(z['text'].lower()==x.lower() for z in out): out.append({'text':x,'source':'default','score':0.5})
    if urgent(q):
        safety=['I need help now','Please call the nurse']
        out=[{'text':x,'source':'default','score':1.0} for x in safety]+[x for x in out if x['text'] not in safety]
    return {'intent':intent,'category':cat,'suggestions':out[:max(limit,2)]}

app=FastAPI(title='Netra Voice API',version='2.0.0',description='Accessible communication backend with SQLite memory and rule-first safety.')
app.add_middleware(CORSMiddleware,allow_origins=os.getenv('CORS_ORIGIN','*').split(','),allow_credentials=False,allow_methods=['*'],allow_headers=['*'])
init_db()

@app.middleware('http')
async def patient_context(request:Request, call_next):
    if request.url.path.startswith('/api') and request.url.path not in ['/api/health']:
        key=os.getenv('API_KEY')
        if key and request.headers.get('x-api-key')!=key and request.query_params.get('api_key')!=key:
            return __import__('fastapi').responses.JSONResponse(status_code=401,content={'error':{'code':'unauthorized','message':'Missing or wrong x-api-key'}})
    return await call_next(request)

def pid_from(x_patient_id: Optional[str], patient_id: Optional[int]):
    try: p=int(x_patient_id) if x_patient_id else (patient_id or 1)
    except: raise HTTPException(400,'patient id must be a positive integer')
    if p<=0: raise HTTPException(400,'patient id must be a positive integer')
    get_settings(p); return p

class QuestionIn(BaseModel):
    text:str=Field(min_length=1,max_length=3000); final:bool=True; asker:str='unknown'; source:str='browser-stt'; useLlm:bool=False; limit:int=4
class SpeakIn(BaseModel):
    text:str=Field(min_length=1,max_length=5000); source:str='keyboard'; questionId:Optional[int]=None; phraseId:Optional[int]=None
class PhraseIn(BaseModel): text:str=Field(min_length=1,max_length=500); category:str='personal'; pinned:bool=False
class DeviceIn(BaseModel): name:str=Field(min_length=1,max_length=80); type:str='lamp'; webhookUrl:Optional[str]=None
class StateIn(BaseModel): state:str
class AlertIn(BaseModel): message:Optional[str]=None

@app.get('/health')
@app.get('/api/health')
def health(): return {'status':'ok','service':'netra-voice-fastapi','database':'sqlite','ai':'optional-gemini','timestamp':now()}

@app.get('/api/settings')
def read_settings(x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None): return get_settings(pid_from(x_patient_id,patient_id))
@app.patch('/api/settings')
def update_settings(body:dict,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); s=deep_merge(get_settings(p),body); save_settings(p,s); return s

@app.post('/api/questions')
async def post_question(body:QuestionIn,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); res=suggestions_for(p,body.text, max(2,min(body.limit,8)))
    if body.useLlm or get_settings(p).get('suggestions',{}).get('useLlm'):
        res=await gemini_suggestions(body.text, res, max(2,min(body.limit,8)))
    if not body.final: return {'question':None,'intent':res['intent'],'category':res['category'],'suggestions':res['suggestions'],'interim':True}
    ts=now()
    with conn() as c:
        cur=c.execute('INSERT INTO questions(patient_id,text,intent,category,asker,source,created_at,final) VALUES(?,?,?,?,?,?,?,1)',(p,body.text,res['intent'],res['category'],body.asker,body.source,ts)); qid=cur.lastrowid
    return {'question':{'id':qid,'text':body.text,'intent':res['intent'],'category':res['category'],'asker':body.asker,'source':body.source,'created_at':ts},**res}

@app.post('/api/speak')
def speak(body:SpeakIn,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); s=get_settings(p); ts=now(); qid=body.questionId
    if qid is None:
        with conn() as c:
            q=c.execute('SELECT id,text FROM questions WHERE patient_id=? AND id NOT IN (SELECT COALESCE(question_id,-1) FROM utterances WHERE patient_id=?) ORDER BY id DESC LIMIT 1',(p,p)).fetchone()
            if q: qid=q['id']; qtext=q['text']
            else: qtext=None
    else:
        with conn() as c:
            q=c.execute('SELECT text FROM questions WHERE id=? AND patient_id=?',(qid,p)).fetchone(); qtext=q['text'] if q else None
    with conn() as c:
        cur=c.execute('INSERT INTO utterances(patient_id,text,source,question_id,created_at) VALUES(?,?,?,?,?)',(p,body.text,body.source,qid,ts)); uid=cur.lastrowid
        if qtext and s.get('historyEnabled',True):
            _,cat,_=classify(qtext)
            old=c.execute('SELECT id,use_count FROM qa_memory WHERE patient_id=? AND lower(question_text)=lower(?) AND lower(answer_text)=lower(?)',(p,qtext,body.text)).fetchone()
            if old: c.execute('UPDATE qa_memory SET use_count=use_count+1,last_used=? WHERE id=?',(ts,old['id']))
            else: c.execute('INSERT INTO qa_memory(patient_id,question_text,answer_text,category,use_count,last_used) VALUES(?,?,?,?,1,?)',(p,qtext,body.text,cat,ts))
        if body.phraseId: c.execute('UPDATE phrases SET use_count=use_count+1 WHERE id=? AND patient_id=?',(body.phraseId,p))
    return {'utterance':{'id':uid,'text':body.text,'source':body.source,'question_id':qid,'created_at':ts},'speech':{'engine':'browser','text':body.text,**s['voice']}}

@app.get('/api/suggestions')
def get_suggestions(q:str='',limit:int=4,llm:bool=False,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    if not q:
        with conn() as c: rows=c.execute('SELECT answer_text,MAX(use_count) n FROM qa_memory WHERE patient_id=? GROUP BY answer_text ORDER BY n DESC LIMIT ?',(p,max(1,min(limit,10)))).fetchall()
        return {'intent':'general','category':'general','suggestions':[{'text':r['answer_text'],'source':'history','score':1,'useCount':r['n']} for r in rows] or [{'text':x,'source':'default','score':.5} for x in ['Yes','No','I need help','Thank you'][:limit]]}
    return suggestions_for(p,q,max(2,min(limit,8)))

@app.get('/api/conversation')
def conversation(limit:int=100,before:Optional[int]=None,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); lim=max(1,min(limit,500))
    with conn() as c:
        qs=c.execute('SELECT id,text,asker by,source,created_at, NULL question_id FROM questions WHERE patient_id=?',(p,)).fetchall()
        us=c.execute('SELECT id,text,source,created_at,question_id FROM utterances WHERE patient_id=?',(p,)).fetchall()
    items=[{'type':'question','id':r['id'],'text':r['text'],'by':r['by'],'source':r['source'],'question_id':None,'created_at':r['created_at']} for r in qs]+[{'type':'utterance','id':r['id'],'text':r['text'],'by':'patient','source':r['source'],'question_id':r['question_id'],'created_at':r['created_at']} for r in us]
    items.sort(key=lambda x:x['id'],reverse=True); return {'items':items[:lim]}

@app.get('/api/qa')
def list_qa(x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: return {'items':[dict(r) for r in c.execute('SELECT * FROM qa_memory WHERE patient_id=? ORDER BY use_count DESC,last_used DESC',(p,)).fetchall()]}
@app.delete('/api/qa/{qa_id}')
def delete_qa(qa_id:int,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: cur=c.execute('DELETE FROM qa_memory WHERE id=? AND patient_id=?',(qa_id,p))
    if not cur.rowcount: raise HTTPException(404,'QA memory not found')
    return {'deleted':True,'id':qa_id}

@app.get('/api/quick-phrases')
def phrases(sort:str='position',x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: rows=c.execute('SELECT * FROM phrases WHERE patient_id=? ORDER BY pinned DESC, position ASC, use_count DESC',(p,)).fetchall()
    return {'items':[dict(r) for r in rows]}
@app.post('/api/quick-phrases')
def add_phrase(body:PhraseIn,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: cur=c.execute('INSERT INTO phrases(patient_id,text,category,pinned,position) VALUES(?,?,?,?,COALESCE((SELECT MAX(position)+1 FROM phrases WHERE patient_id=?),0))',(p,body.text,body.category,int(body.pinned),p)); row=c.execute('SELECT * FROM phrases WHERE id=?',(cur.lastrowid,)).fetchone()
    return dict(row)
@app.patch('/api/quick-phrases/{phrase_id}')
def edit_phrase(phrase_id:int,body:dict,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c:
        row=c.execute('SELECT * FROM phrases WHERE id=? AND patient_id=?',(phrase_id,p)).fetchone()
        if not row: raise HTTPException(404,'Phrase not found')
        data=dict(row); data.update({k:v for k,v in body.items() if k in ['text','category','pinned','position']}); c.execute('UPDATE phrases SET text=?,category=?,pinned=?,position=? WHERE id=?',(data['text'],data['category'],int(data['pinned']),data['position'],phrase_id)); return dict(c.execute('SELECT * FROM phrases WHERE id=?',(phrase_id,)).fetchone())
@app.delete('/api/quick-phrases/{phrase_id}')
def delete_phrase(phrase_id:int,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: cur=c.execute('DELETE FROM phrases WHERE id=? AND patient_id=?',(phrase_id,p))
    if not cur.rowcount: raise HTTPException(404,'Phrase not found')
    return {'deleted':True}

@app.get('/api/keyboard/layouts')
def layouts(): return ['qwerty','abc','adaptive']
@app.get('/api/keyboard/layout')
def layout(name:str='adaptive',numbers:bool=False,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); rows=['qwertyuiop','asdfghjkl','zxcvbnm']
    if name=='abc': rows=['abcdefg','hijklmn','opqrstu','vwxyz']
    elif name=='adaptive':
        with conn() as c: txt=' '.join(r['text'] for r in c.execute('SELECT text FROM utterances WHERE patient_id=?',(p,)).fetchall()).lower()
        freq={ch:txt.count(ch) for ch in 'abcdefghijklmnopqrstuvwxyz'}; rows=[''.join(sorted('qwertyuiop',key=lambda ch:-freq[ch])), ''.join(sorted('asdfghjkl',key=lambda ch:-freq[ch])), ''.join(sorted('zxcvbnm',key=lambda ch:-freq[ch]))]
    keys=[]
    for ri,row in enumerate(rows): keys.append([{'id':ch,'label':ch.upper(),'kind':'char','value':ch} for ch in row])
    if numbers: keys.insert(0,[{'id':str(n),'label':str(n),'kind':'char','value':str(n)} for n in range(10)])
    return {'name':name if name in ['qwerty','abc','adaptive'] else 'adaptive','rows':keys,'actions':[{'id':'space','label':'Space','kind':'action','action':'space'},{'id':'backspace','label':'Delete','kind':'action','action':'backspace'},{'id':'clear','label':'Clear','kind':'action','action':'clear'},{'id':'speak','label':'Speak','kind':'action','action':'speak'}]}
@app.get('/api/keyboard/predict')
def predict(text:str='',limit:int=4,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); partial=text.split()[-1].lower() if text.split() else ''; prev=text.split()[-2].lower() if len(text.split())>1 else ''
    with conn() as c: utterances=[r['text'].lower() for r in c.execute('SELECT text FROM utterances WHERE patient_id=?',(p,)).fetchall()]; ph=[r['text'] for r in c.execute('SELECT text FROM phrases WHERE patient_id=? ORDER BY use_count DESC LIMIT 20',(p,)).fetchall()]
    vocab=set(re.findall(r"[a-z']{2,}", ' '.join(utterances)+' water nurse pain help toilet medicine thank please family tired comfortable yes no later now'))
    completions=sorted([w for w in vocab if partial and w.startswith(partial) and w!=partial])[:limit]
    phrases=[x for x in ph if text.lower() in x.lower()][:limit] if text else ph[:limit]
    return {'partial':partial,'previousWord':prev,'completions':completions,'nextWords':(['please','water','help','now'][:limit] if prev else []),'phrases':phrases}

@app.post('/api/devices')
def create_device(body:DeviceIn,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); token=secrets.token_urlsafe(24)
    with conn() as c: cur=c.execute('INSERT INTO devices(patient_id,name,type,state,token,webhook_url,updated_at) VALUES(?,?,? ,\'off\',?,?,?)',(p,body.name,body.type,token,body.webhookUrl,now())); r=c.execute('SELECT id,name,type,state,webhook_url,updated_at FROM devices WHERE id=?',(cur.lastrowid,)).fetchone()
    return {**dict(r),'token':token}
@app.get('/api/devices')
def list_devices(x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: return {'items':[dict(r) for r in c.execute('SELECT id,name,type,state,webhook_url,updated_at FROM devices WHERE patient_id=?',(p,)).fetchall()]}
@app.get('/api/devices/{device_id}')
def get_device(device_id:int,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: r=c.execute('SELECT id,name,type,state,webhook_url,updated_at FROM devices WHERE id=? AND patient_id=?',(device_id,p)).fetchone()
    if not r: raise HTTPException(404,'Device not found')
    return dict(r)
@app.patch('/api/devices/{device_id}')
def patch_device(device_id:int,body:dict,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c:
        r=c.execute('SELECT * FROM devices WHERE id=? AND patient_id=?',(device_id,p)).fetchone()
        if not r: raise HTTPException(404,'Device not found')
        c.execute('UPDATE devices SET name=?,type=?,webhook_url=? WHERE id=?',(body.get('name',r['name']),body.get('type',r['type']),body.get('webhookUrl',r['webhook_url']),device_id))
    return get_device(device_id,str(p),None)
@app.delete('/api/devices/{device_id}')
def delete_device(device_id:int,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: cur=c.execute('DELETE FROM devices WHERE id=? AND patient_id=?',(device_id,p))
    if not cur.rowcount: raise HTTPException(404,'Device not found')
    return {'deleted':True}
def set_device(device_id,p,state):
    if state not in ['on','off']: raise HTTPException(422,'state must be on or off')
    with conn() as c: cur=c.execute('UPDATE devices SET state=?,updated_at=? WHERE id=? AND patient_id=?',(state,now(),device_id,p)); r=c.execute('SELECT id,name,type,state,updated_at FROM devices WHERE id=? AND patient_id=?',(device_id,p)).fetchone()
    if not r: raise HTTPException(404,'Device not found')
    return dict(r)
@app.post('/api/devices/{device_id}/toggle')
def toggle_device(device_id:int,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: r=c.execute('SELECT state FROM devices WHERE id=? AND patient_id=?',(device_id,p)).fetchone()
    if not r: raise HTTPException(404,'Device not found')
    return set_device(device_id,p,'off' if r['state']=='on' else 'on')
@app.post('/api/devices/{device_id}/state')
def device_state(device_id:int,body:StateIn,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None): return set_device(device_id,pid_from(x_patient_id,patient_id),body.state)
@app.get('/api/devices/{device_id}/poll',response_class=PlainTextResponse)
def poll_device(device_id:int,token:str=Query(...)):
    with conn() as c: r=c.execute('SELECT state FROM devices WHERE id=? AND token=?',(device_id,token)).fetchone()
    if not r: raise HTTPException(401,'Invalid device token')
    return r['state']

@app.post('/api/emergency/trigger')
def trigger_emergency(body:AlertIn=AlertIn(),x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); ts=now(); message=body.message or get_settings(p)['emergency']['message']
    with conn() as c:
        r=c.execute("SELECT * FROM alerts WHERE patient_id=? AND status='active' ORDER BY id DESC LIMIT 1",(p,)).fetchone()
        if r: c.execute('UPDATE alerts SET repeat_count=repeat_count+1,updated_at=? WHERE id=?',(ts,r['id'])); aid=r['id']
        else: aid=c.execute('INSERT INTO alerts(patient_id,message,status,created_at,updated_at) VALUES(?,?,\'active\',?,?)',(p,message,ts,ts)).lastrowid
        r=c.execute('SELECT * FROM alerts WHERE id=?',(aid,)).fetchone()
    return {'emergency':dict(r),'alreadyActive': bool(r['repeat_count'] > 1),'alert':'not_configured','speech':{'engine':'browser','text':message}}
@app.get('/api/emergency/active')
def active_emergency(x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: r=c.execute("SELECT * FROM alerts WHERE patient_id=? AND status='active' ORDER BY id DESC LIMIT 1",(p,)).fetchone()
    return {'emergency':dict(r) if r else None}
@app.get('/api/emergency')
def emergency_history(x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: return {'items':[dict(r) for r in c.execute('SELECT * FROM alerts WHERE patient_id=? ORDER BY id DESC',(p,)).fetchall()]}
@app.post('/api/emergency/{alert_id}/acknowledge')
def acknowledge(alert_id:int,body:dict,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: cur=c.execute("UPDATE alerts SET status='acknowledged',acknowledged_by=?,updated_at=? WHERE id=? AND patient_id=? AND status='active'",(body.get('by','caregiver'),now(),alert_id,p))
    if not cur.rowcount: raise HTTPException(404,'Active alert not found')
    return {'acknowledged':True,'id':alert_id}
@app.post('/api/emergency/{alert_id}/resolve')
def resolve(alert_id:int,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c: cur=c.execute("UPDATE alerts SET status='resolved',updated_at=? WHERE id=? AND patient_id=? AND status!='resolved'",(now(),alert_id,p))
    if not cur.rowcount: raise HTTPException(404,'Alert not found')
    return {'resolved':True,'id':alert_id}

@app.get('/api/insights')
def insights(x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id)
    with conn() as c:
        q=c.execute('SELECT COUNT(*) n FROM questions WHERE patient_id=? AND date(created_at)=date(\'now\')',(p,)).fetchone()['n']; u=c.execute('SELECT COUNT(*) n FROM utterances WHERE patient_id=? AND date(created_at)=date(\'now\')',(p,)).fetchone()['n']; pain=c.execute("SELECT COUNT(*) n FROM questions WHERE patient_id=? AND category='pain' AND created_at >= datetime('now','-7 day')",(p,)).fetchone()['n']; helps=c.execute("SELECT COUNT(*) n FROM alerts WHERE patient_id=? AND created_at >= datetime('now','-7 day')",(p,)).fetchone()['n']; top=c.execute('SELECT answer_text, SUM(use_count) n FROM qa_memory WHERE patient_id=? GROUP BY answer_text ORDER BY n DESC LIMIT 5',(p,)).fetchall()
    return {'date':now()[:10],'summary':f'Today: {q} caregiver questions and {u} spoken responses recorded. This is an activity summary, not a clinical assessment.','questionsToday':q,'responsesToday':u,'painMentionsLast7Days':pain,'helpAlertsLast7Days':helps,'frequentResponses':[{'text':r['answer_text'],'count':r['n']} for r in top],'dataSufficient':q+u>=3}

@app.get('/api/export')
def export_data(x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); out={'patientId':p,'exportedAt':now()}
    with conn() as c:
        for table in ['questions','utterances','qa_memory','phrases','devices','alerts']:
            out[table]=[dict(r) for r in c.execute(f'SELECT * FROM {table} WHERE patient_id=?',(p,)).fetchall()]
        out['settings']=get_settings(p)
    return out
@app.delete('/api/history')
def clear_history(confirm:bool=False,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    if not confirm: raise HTTPException(400,'Set confirm=true to permanently delete patient history')
    p=pid_from(x_patient_id,patient_id)
    with conn() as c:
        for table in ['questions','utterances','qa_memory','alerts']: c.execute(f'DELETE FROM {table} WHERE patient_id=?',(p,))
    return {'deleted':True,'patientId':p}

@app.get('/api/events')
async def events():
    async def stream():
        yield 'event: ready\ndata: {"status":"connected","note":"Reconnect to receive fresh events; polling remains available."}\n\n'
        while True:
            yield ': keep-alive\n\n'; await __import__('asyncio').sleep(15)
    return StreamingResponse(stream(),media_type='text/event-stream',headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})


async def gemini_suggestions(question, fallback, limit=4):
    key=os.getenv('GEMINI_API_KEY')
    if not key: return fallback
    try:
        import httpx
        prompt=f'Give exactly four short first-person communication replies, max 10 words each, as JSON array. Never invent medical facts or names. Include a no/not now option. Respond in the language of the question (English, Hindi, or Hinglish). Question: {question}'
        async with httpx.AsyncClient(timeout=2.0) as client:
            r=await client.post(f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}',json={'contents':[{'parts':[{'text':prompt}]}]}); r.raise_for_status(); raw=r.json()['candidates'][0]['content']['parts'][0]['text']; match=re.search(r'\[[\s\S]*\]',raw); values=json.loads(match.group(0)) if match else []
        vals=[str(x).strip()[:120] for x in values if str(x).strip()][:4]
        if not any(x.lower() in ['no','no, thank you','not now'] for x in vals): vals=vals[:3]+['No, thank you']
        if urgent(question): vals=['I need help now','Please call the nurse']+[x for x in vals if x not in ['I need help now','Please call the nurse']]
        return {'intent':fallback['intent'],'category':fallback['category'],'suggestions':[{'text':x,'source':'llm','score':.8} for x in vals[:limit]]}
    except Exception:
        return fallback

@app.post('/api/ai/reply')
async def ai_reply(body:QuestionIn,x_patient_id:Optional[str]=Header(None),patient_id:Optional[int]=None):
    p=pid_from(x_patient_id,patient_id); key=os.getenv('GEMINI_API_KEY')
    fallback=suggestions_for(p,body.text,body.limit)
    if not key: return {**fallback,'aiEnabled':False,'notice':'GEMINI_API_KEY is not configured; rule-based suggestions returned.'}
    try:
        import httpx
        prompt=f'Give exactly four short first-person communication replies, max 10 words each, as JSON array. Never invent medical facts or names. Include a no/not now option. User language may be English, Hindi or Hinglish. Question: {body.text}'
        async with httpx.AsyncClient(timeout=2.0) as client:
            r=await client.post(f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}',json={'contents':[{'parts':[{'text':prompt}]}]}); r.raise_for_status(); raw=r.json()['candidates'][0]['content']['parts'][0]['text']; match=re.search(r'\[[\s\S]*\]',raw); values=json.loads(match.group(0)) if match else []
        vals=[str(x).strip()[:120] for x in values if str(x).strip()][:4]
        if not any(x.lower() in ['no','no, thank you','not now'] for x in vals): vals=vals[:3]+['No, thank you']
        
        if urgent(body.text): vals=['I need help now','Please call the nurse']+[x for x in vals if x not in ['I need help now','Please call the nurse']]
        return {'intent':fallback['intent'],'category':fallback['category'],'suggestions':[{'text':x,'source':'llm','score':.8} for x in vals[:4]],'aiEnabled':True}
    except Exception:
        return {**fallback,'aiEnabled':True,'aiFallback':True,'notice':'AI was unavailable; safe rule-based suggestions returned.'}
