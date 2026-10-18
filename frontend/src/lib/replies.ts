export type Lang = 'en' | 'hi';

export interface Suggestion {
    id: string;
    text: string;
}

interface Phrase {
    id: string;
    en: string;
    hi: string;
}

interface Rule {
    id: string;
    keywords: string[];
    replies: Phrase[];
}

const p = (id: string, en: string, hi: string): Phrase => ({ id, en, hi });

const RULES: Rule[] = [
    {
        id: 'howareyou',
        keywords: [
            'how are you', 'how do you feel', 'how are you feeling', 'feeling better',
            'kaise ho', 'kaise hain', 'kaisa lag raha', 'kaisa mehsoos',
            'कैसे हो', 'कैसे हैं', 'कैसा लग रहा', 'कैसा महसूस', 'तबीयत',
        ],
        replies: [
            p('howareyou.ok', 'I am okay', 'मैं ठीक हूँ'),
            p('howareyou.unwell', 'I am not feeling well', 'मेरी तबीयत ठीक नहीं है'),
            p('howareyou.pain', 'I am in pain', 'मुझे दर्द हो रहा है'),
            p('howareyou.tired', 'I am tired', 'मुझे थकान है'),
        ],
    },
    {
        id: 'greeting',
        keywords: [
            'hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good afternoon', 'good evening',
            'नमस्ते', 'नमस्कार', 'सुप्रभात',
        ],
        replies: [
            p('greeting.hello', 'Hello', 'नमस्ते'),
            p('greeting.good', 'Good to see you', 'आपको देखकर अच्छा लगा'),
            p('greeting.sit', 'Please sit with me', 'कृपया मेरे पास बैठिए'),
        ],
    },
    {
        id: 'pain',
        keywords: [
            'pain', 'painful', 'hurt', 'hurts', 'hurting', 'ache', 'aching', 'sore',
            'dard', 'chot', 'दर्द', 'चोट', 'तकलीफ',
        ],
        replies: [
            p('pain.yes', 'Yes, I am in pain', 'हाँ, मुझे दर्द हो रहा है'),
            p('pain.no', 'No pain right now', 'अभी दर्द नहीं है'),
            p('pain.alot', 'It hurts a lot', 'बहुत दर्द हो रहा है'),
            p('pain.nurse', 'Please call the nurse', 'कृपया नर्स को बुलाइए'),
        ],
    },
    {
        id: 'water',
        keywords: ['water', 'thirsty', 'thirst', 'drink', 'paani', 'pani', 'pyaas', 'पानी', 'प्यास', 'पीना'],
        replies: [
            p('water.yes', 'Yes, I want water', 'हाँ, मुझे पानी चाहिए'),
            p('water.no', 'No, thank you', 'नहीं, धन्यवाद'),
            p('water.little', 'A little water, please', 'थोड़ा पानी दीजिए'),
        ],
    },
    {
        id: 'tea',
        keywords: [
            'tea', 'coffee', 'juice', 'milk', 'chai', 'doodh',
            'चाय', 'कॉफी', 'जूस', 'दूध',
        ],
        replies: [
            p('tea.yes', 'Yes, I would like that', 'हाँ, मुझे वह चाहिए'),
            p('tea.no', 'No, thank you', 'नहीं, धन्यवाद'),
            p('tea.water', 'Just water, please', 'सिर्फ़ पानी दीजिए'),
            p('tea.later', 'Maybe later', 'शायद बाद में'),
        ],
    },
    {
        id: 'food',
        keywords: [
            'hungry', 'hunger', 'eat', 'eating', 'food', 'meal', 'breakfast', 'lunch', 'dinner', 'snack',
            'khana', 'bhookh', 'bhukh', 'nashta', 'खाना', 'भूख', 'नाश्ता', 'खाओ', 'खाइए',
        ],
        replies: [
            p('food.yes', 'Yes, I am hungry', 'हाँ, मुझे भूख लगी है'),
            p('food.no', 'No, I am not hungry', 'नहीं, मुझे भूख नहीं है'),
            p('food.little', 'A little food, please', 'थोड़ा खाना दीजिए'),
            p('food.later', 'Maybe later', 'शायद बाद में'),
        ],
    },
    {
        id: 'medicine',
        keywords: [
            'medicine', 'medicines', 'medication', 'pill', 'pills', 'tablet', 'injection', 'dose',
            'dawai', 'dawa', 'goli', 'दवा', 'दवाई', 'गोली', 'इंजेक्शन',
        ],
        replies: [
            p('medicine.yes', 'Yes, I need my medicine', 'हाँ, मुझे दवा चाहिए'),
            p('medicine.taken', 'I already took it', 'दवा पहले ही ली जा चुकी है'),
            p('medicine.ask', 'Please ask the doctor first', 'पहले डॉक्टर से पूछ लीजिए'),
            p('medicine.notnow', 'Not right now', 'अभी नहीं'),
        ],
    },
    {
        id: 'toilet',
        keywords: [
            'toilet', 'bathroom', 'washroom', 'restroom', 'commode', 'shauchalay',
            'शौचालय', 'बाथरूम', 'टॉयलेट', 'वॉशरूम',
        ],
        replies: [
            p('toilet.yes', 'Yes, I need the toilet', 'हाँ, मुझे शौचालय जाना है'),
            p('toilet.no', 'Not right now', 'अभी नहीं'),
            p('toilet.help', 'Please help me quickly', 'कृपया जल्दी मदद कीजिए'),
        ],
    },
    {
        id: 'comfort',
        keywords: [
            'comfortable', 'comfort', 'cold', 'hot', 'warm', 'fan', 'light', 'lamp', 'blanket', 'pillow',
            'thand', 'thandi', 'garmi', 'aaram', 'आराम', 'ठंड', 'ठंडा', 'गर्मी', 'पंखा', 'तकिया', 'कंबल',
        ],
        replies: [
            p('comfort.ok', 'I am comfortable', 'मुझे आराम है'),
            p('comfort.cold', 'I feel cold', 'मुझे ठंड लग रही है'),
            p('comfort.hot', 'I feel hot', 'मुझे गर्मी लग रही है'),
            p('comfort.pillow', 'Please adjust my pillow', 'कृपया मेरा तकिया ठीक कर दीजिए'),
        ],
    },
    {
        id: 'sleep',
        keywords: [
            'sleep', 'sleepy', 'tired', 'rest', 'nap', 'exhausted',
            'neend', 'thak', 'thaka', 'नींद', 'थक', 'थका', 'थकान', 'सोना', 'सो',
        ],
        replies: [
            p('sleep.tired', 'I am tired', 'मुझे थकान है'),
            p('sleep.rest', 'I want to rest', 'मुझे आराम करना है'),
            p('sleep.notsleepy', 'I am not sleepy', 'मुझे नींद नहीं आ रही'),
            p('sleep.letme', 'Please let me sleep', 'कृपया मुझे सोने दीजिए'),
        ],
    },
    {
        id: 'family',
        keywords: [
            'family', 'visitor', 'visitors', 'visit', 'son', 'daughter', 'wife', 'husband', 'mother',
            'father', 'brother', 'sister', 'parents', 'ghar', 'parivar',
            'परिवार', 'बेटा', 'बेटी', 'पत्नी', 'पति', 'माँ', 'पापा', 'भाई', 'बहन', 'घर', 'मिलने',
        ],
        replies: [
            p('family.happy', 'I am happy you came', 'आप आए, मुझे खुशी हुई'),
            p('family.stay', 'Please stay a little longer', 'कृपया थोड़ी देर और रुकिए'),
            p('family.call', 'Please call my family', 'कृपया मेरे परिवार को बुलाइए'),
            p('family.miss', 'I miss everyone', 'मुझे सबकी याद आती है'),
        ],
    },
    {
        id: 'doctor',
        keywords: [
            'doctor', 'nurse', 'hospital', 'checkup', 'check up', 'emergency',
            'daktar', 'dr', 'डॉक्टर', 'नर्स', 'अस्पताल', 'जाँच',
        ],
        replies: [
            p('doctor.call', 'Please call the doctor', 'कृपया डॉक्टर को बुलाइए'),
            p('doctor.nurse', 'Please call the nurse', 'कृपया नर्स को बुलाइए'),
            p('doctor.ok', 'I am okay for now', 'अभी मैं ठीक हूँ'),
            p('doctor.help', 'I need help', 'मुझे मदद चाहिए'),
        ],
    },
    {
        id: 'thanks',
        keywords: [
            'thank you', 'thanks', 'thankful', 'grateful', 'dhanyavad', 'shukriya',
            'धन्यवाद', 'शुक्रिया', 'आभार',
        ],
        replies: [
            p('thanks.welcome', 'You are welcome', 'कोई बात नहीं'),
            p('thanks.too', 'Thank you too', 'आपको भी धन्यवाद'),
            p('thanks.grateful', 'I am grateful for your help', 'मैं आपकी मदद के लिए आभारी हूँ'),
            p('thanks.stay', 'Please stay with me', 'कृपया मेरे साथ रुकिए'),
        ],
    },
    {
        id: 'love',
        keywords: ['love', 'miss you', 'care about you', 'pyaar', 'pyar', 'प्यार', 'याद'],
        replies: [
            p('love.too', 'I love you too', 'मुझे भी आपसे बहुत प्यार है'),
            p('love.miss', 'I miss you', 'मुझे आपकी याद आती है'),
            p('love.grateful', 'I am grateful for you', 'मैं आपके लिए आभारी हूँ'),
            p('love.hand', 'Please hold my hand', 'कृपया मेरा हाथ थामिए'),
        ],
    },
];

const QUESTION_DEFAULTS: Phrase[] = [
    p('default.yes', 'Yes', 'हाँ'),
    p('default.no', 'No', 'नहीं'),
    p('default.repeat', 'Please say that again', 'कृपया दोबारा कहिए'),
    p('default.unsure', 'I am not sure', 'मुझे पक्का नहीं पता'),
];

const STATEMENT_DEFAULTS: Phrase[] = [
    p('default.okay', 'Okay, I understand', 'ठीक है, मुझे समझ आ गया'),
    p('default.thanks', 'Thank you', 'धन्यवाद'),
    p('default.help', 'I need help', 'मुझे मदद चाहिए'),
    p('default.wait', 'Please wait', 'कृपया रुकिए'),
];

const QUESTION_STARTERS = new Set([
    'do', 'does', 'did', 'are', 'is', 'am', 'can', 'could', 'will', 'would', 'shall', 'should',
    'have', 'has', 'kya', 'kab', 'क्या', 'कब',
]);

const WORD_SPLIT = /[^\p{L}\p{M}\p{N}]+/u;

function tokenize(text: string): string[] {
    return text.toLowerCase().split(WORD_SPLIT).filter(Boolean);
}

function looksLikeQuestion(raw: string, tokens: string[]): boolean {
    return raw.includes('?') || raw.includes('？') || QUESTION_STARTERS.has(tokens[0] ?? '');
}

function scoreRule(rule: Rule, padded: string): number {
    let total = 0;
    for (const keyword of rule.keywords) {
        if (padded.includes(` ${keyword} `)) total += keyword.split(' ').length;
    }
    return total;
}

export function suggestReplies(heard: string, lang: Lang = 'en', max = 4): Suggestion[] {
    const tokens = tokenize(heard);
    const padded = ` ${tokens.join(' ')} `;

    const matched = RULES.map((rule, order) => ({ rule, order, score: scoreRule(rule, padded) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score || a.order - b.order)
        .slice(0, 2)
        .map((m) => m.rule);

    const picked: Phrase[] = [];
    const seen = new Set<string>();
    const add = (phrase?: Phrase) => {
        if (phrase && picked.length < max && !seen.has(phrase.id)) {
            seen.add(phrase.id);
            picked.push(phrase);
        }
    };

    const longest = Math.max(0, ...matched.map((r) => r.replies.length));
    for (let i = 0; i < longest; i++) {
        for (const rule of matched) add(rule.replies[i]);
    }

    const fallback = looksLikeQuestion(heard, tokens) ? QUESTION_DEFAULTS : STATEMENT_DEFAULTS;
    for (const phrase of fallback) add(phrase);

    return picked.map((phrase) => ({ id: phrase.id, text: phrase[lang] }));
}

export function defaultReplies(lang: Lang = 'en', max = 4): Suggestion[] {
    return suggestReplies('', lang, max);
}