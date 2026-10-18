import os, tempfile
from fastapi.testclient import TestClient

tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.db'); tmp.close()
os.environ['NETRA_DB_PATH'] = tmp.name
from netra_backend.main import app
client = TestClient(app)

def test_health():
    r=client.get('/api/health'); assert r.status_code==200 and r.json()['status']=='ok'
def test_question_suggestions_and_learning():
    q=client.post('/api/questions',json={'text':'Do you want water?'}); assert q.status_code==200
    data=q.json(); assert data['category']=='water' and len(data['suggestions'])>=2
    picked=data['suggestions'][0]['text']
    s=client.post('/api/speak',json={'text':picked,'questionId':data['question']['id']}); assert s.status_code==200
    qa=client.get('/api/qa').json()['items']; assert any(x['answer_text']==picked for x in qa)
def test_urgent_reply_has_help():
    r=client.post('/api/questions',json={'text':'I cannot breathe, help me'}).json()
    texts=[x['text'] for x in r['suggestions']]; assert 'I need help now' in texts and 'Please call the nurse' in texts
def test_settings_patch():
    r=client.patch('/api/settings',json={'voice':{'lang':'hi-IN'}}); assert r.status_code==200 and r.json()['voice']['lang']=='hi-IN'
def test_emergency_lifecycle():
    a=client.post('/api/emergency/trigger',json={'message':'Please help'}).json()['emergency']; assert a['status']=='active'
    assert client.post(f"/api/emergency/{a['id']}/acknowledge",json={'by':'nurse'}).status_code==200
    assert client.post(f"/api/emergency/{a['id']}/resolve").status_code==200
def test_device_toggle_and_poll_token():
    d=client.post('/api/devices',json={'name':'Demo lamp','type':'lamp'}).json()
    assert client.post(f"/api/devices/{d['id']}/toggle").json()['state']=='on'
    assert client.get(f"/api/devices/{d['id']}/poll",params={'token':d['token']}).text=='on'
