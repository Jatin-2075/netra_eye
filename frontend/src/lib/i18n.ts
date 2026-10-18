import type { Lang } from './replies';

export type { Lang };

export const LANGUAGES: Lang[] = ['en', 'hi'];

export const LANGUAGE_NAME: Record<Lang, string> = {
    en: 'English',
    hi: 'हिन्दी',
};

export const SPEECH_LANG: Record<Lang, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
};

export const nextLang = (lang: Lang): Lang => (lang === 'en' ? 'hi' : 'en');

const en = {
    appName: 'Netra Voice',
    tagline: 'Speak and control your room with your eyes',

    menuPhrases: 'Quick phrases',
    menuReplies: 'Replies',
    menuRoom: 'Room',
    menuTalk: 'Talk',
    listen: 'Listen',
    listening: 'Listening…',
    yourMessage: 'Your message',
    back: 'Back',

    lamp: 'Lamp',
    fan: 'Fan',
    on: 'On',
    off: 'Off',
    lampOn: 'Lamp is on',
    lampOff: 'Lamp is off',
    fanOn: 'Fan is on',
    fanOff: 'Fan is off',

    gazeLeft: 'Left',
    gazeRight: 'Right',
    gazeUp: 'Up',
    gazeDown: 'Down',
    gazeCenter: 'Center',
    eyesClosed: 'Eyes closed',

    hintMove: 'Look left, right, up or down. Keep looking to keep moving',
    hintSelect: 'Blink slowly to choose',
    hintBack: 'Pick Back at the bottom to go back',

    menuTalkSub: 'Speak, reply and type',
    menuRoomSub: 'Lamp and fan',
    menuCareSub: 'Phrases and settings',

    faceLost: 'We cannot see your face',
    calibrate: 'Set up your eyes',
    recalibrate: 'Redo setup',
    speaking: 'Speaking',

    heardLabel: 'What did they say?',
    heardPlaceholder: 'Type here',
    suggestReplies: 'Suggest replies',

    autoScan: 'Auto-scan',
    lastInput: 'Last input',
    inputNone: 'none yet',
    inputSelect: 'Select',

    allOff: 'All off',
    allOffDone: 'Lamp and fan are off',
    deviceError: 'Could not reach the device',
    urgentTitle: 'URGENT: help requested',
    urgentHint: 'Press Escape or Cancel alert, or blink slowly after a few seconds, to stop',
    cancelAlert: 'Cancel alert',
    skipSetup: 'Skip setup (keyboard or Auto-scan only)',
};

export type StringKey = keyof typeof en;

const hi: Record<StringKey, string> = {
    appName: 'नेत्र वॉइस',
    tagline: 'अपनी आँखों से बोलिए और कमरा नियंत्रित कीजिए',

    menuPhrases: 'त्वरित वाक्य',
    menuReplies: 'उत्तर',
    menuRoom: 'कमरा',
    menuTalk: 'बात करें',
    listen: 'सुनो',
    listening: 'सुन रहा है…',
    yourMessage: 'आपका संदेश',
    back: 'वापस',

    lamp: 'लैंप',
    fan: 'पंखा',
    on: 'चालू',
    off: 'बंद',
    lampOn: 'लैंप चालू है',
    lampOff: 'लैंप बंद है',
    fanOn: 'पंखा चालू है',
    fanOff: 'पंखा बंद है',

    gazeLeft: 'बाएँ',
    gazeRight: 'दाएँ',
    gazeUp: 'ऊपर',
    gazeDown: 'नीचे',
    gazeCenter: 'बीच में',
    eyesClosed: 'आँखें बंद',

    hintMove: 'बाएँ, दाएँ, ऊपर या नीचे देखिए। देखते रहिए, चलता रहेगा',
    hintSelect: 'चुनने के लिए धीरे से पलक झपकाइए',
    hintBack: 'वापस जाने के लिए नीचे "वापस" चुनिए',

    menuTalkSub: 'बोलिए, जवाब दीजिए और लिखिए',
    menuRoomSub: 'लैंप और पंखा',
    menuCareSub: 'वाक्य और सेटिंग',

    faceLost: 'आपका चेहरा दिखाई नहीं दे रहा',
    calibrate: 'अपनी आँखें सेट कीजिए',
    recalibrate: 'सेटअप दोबारा कीजिए',
    speaking: 'बोला जा रहा है',

    heardLabel: 'उन्होंने क्या कहा?',
    heardPlaceholder: 'यहाँ लिखिए',
    suggestReplies: 'उत्तर सुझाइए',

    autoScan: 'ऑटो-स्कैन',
    lastInput: 'अंतिम इनपुट',
    inputNone: 'अभी तक नहीं',
    inputSelect: 'चुनें',

    allOff: 'सब बंद',
    allOffDone: 'लैंप और पंखा बंद हैं',
    deviceError: 'डिवाइस तक संदेश नहीं पहुँचा',
    urgentTitle: 'आपातकाल: मदद चाहिए',
    urgentHint: 'रोकने के लिए Escape दबाइए, "अलर्ट रोकें" चुनिए, या कुछ सेकंड बाद धीरे से पलक झपकाइए',
    cancelAlert: 'अलर्ट रोकें',
    skipSetup: 'सेटअप छोड़ें (सिर्फ कीबोर्ड या ऑटो-स्कैन)',
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { en, hi };

export const t = (lang: Lang, key: StringKey): string => STRINGS[lang][key];

export interface QuickPhrase {
    id: string;
    icon: string;
                                            
    label: Record<Lang, string>;
                                                              
    say: Record<Lang, string>;
                                                                           
    urgent?: boolean;
}

export const QUICK_PHRASES: QuickPhrase[] = [
    {
        id: 'yes',
        icon: '✅',
        label: { en: 'Yes', hi: 'हाँ' },
        say: { en: 'Yes', hi: 'हाँ' },
    },
    {
        id: 'no',
        icon: '❌',
        label: { en: 'No', hi: 'नहीं' },
        say: { en: 'No', hi: 'नहीं' },
    },
    {
        id: 'help',
        icon: '🆘',
        label: { en: 'Help', hi: 'मदद' },
        say: { en: 'I need help now', hi: 'मुझे अभी मदद चाहिए' },
        urgent: true,
    },
    {
        id: 'water',
        icon: '💧',
        label: { en: 'Water', hi: 'पानी' },
        say: { en: 'I would like some water, please', hi: 'कृपया मुझे थोड़ा पानी दीजिए' },
    },
    {
        id: 'food',
        icon: '🍽️',
        label: { en: 'Food', hi: 'खाना' },
        say: { en: 'I am hungry', hi: 'मुझे भूख लगी है' },
    },
    {
        id: 'toilet',
        icon: '🚻',
        label: { en: 'Toilet', hi: 'शौचालय' },
        say: { en: 'I need to use the toilet', hi: 'मुझे शौचालय जाना है' },
    },
    {
        id: 'pain',
        icon: '🤕',
        label: { en: 'Pain', hi: 'दर्द' },
        say: { en: 'I am in pain', hi: 'मुझे दर्द हो रहा है' },
        urgent: true,
    },
    {
        id: 'medicine',
        icon: '💊',
        label: { en: 'Medicine', hi: 'दवा' },
        say: { en: 'I need my medicine', hi: 'मुझे मेरी दवा चाहिए' },
    },
    {
        id: 'cold',
        icon: '🥶',
        label: { en: 'Cold', hi: 'ठंड' },
        say: { en: 'I feel cold', hi: 'मुझे ठंड लग रही है' },
    },
    {
        id: 'hot',
        icon: '🥵',
        label: { en: 'Hot', hi: 'गर्मी' },
        say: { en: 'I feel hot', hi: 'मुझे गर्मी लग रही है' },
    },
    {
        id: 'tired',
        icon: '😴',
        label: { en: 'Tired', hi: 'थकान' },
        say: { en: 'I am tired and want to rest', hi: 'मुझे थकान है और आराम करना है' },
    },
    {
        id: 'doctor',
        icon: '🩺',
        label: { en: 'Doctor', hi: 'डॉक्टर' },
        say: { en: 'Please call the doctor', hi: 'कृपया डॉक्टर को बुलाइए' },
    },
    {
        id: 'family',
        icon: '👨‍👩‍👧',
        label: { en: 'Family', hi: 'परिवार' },
        say: { en: 'Please call my family', hi: 'कृपया मेरे परिवार को बुलाइए' },
    },
    {
        id: 'wait',
        icon: '✋',
        label: { en: 'Wait', hi: 'रुकिए' },
        say: { en: 'Please wait a moment', hi: 'कृपया एक क्षण रुकिए' },
    },
    {
        id: 'thanks',
        icon: '🙏',
        label: { en: 'Thank you', hi: 'धन्यवाद' },
        say: { en: 'Thank you', hi: 'आपका धन्यवाद' },
    },
];