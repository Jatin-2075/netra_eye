import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPEECH_LANG, type Lang } from '../lib/i18n';

export interface SpeakOptions {
    lang?: Lang;
    rate?: number;
    pitch?: number;
    volume?: number;
}

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const normalize = (code: string) => code.toLowerCase().replace('_', '-');

export function pickVoice(
    voices: SpeechSynthesisVoice[],
    code: string
): SpeechSynthesisVoice | null {
    const wanted = normalize(code);
    const base = wanted.split('-')[0];
    return (
        voices.find((v) => normalize(v.lang) === wanted) ??
        voices.find((v) => normalize(v.lang).split('-')[0] === base) ??
        null
    );
}

export function useSpeech(lang: Lang = 'en') {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
        supported ? window.speechSynthesis.getVoices() : []
    );
    const [speaking, setSpeaking] = useState(false);
    const current = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (!supported) return;
        const synth = window.speechSynthesis;
        const load = () => setVoices(synth.getVoices());
        load();
        synth.addEventListener('voiceschanged', load);
        return () => {
            synth.removeEventListener('voiceschanged', load);
            synth.cancel();
        };
    }, []);

    const speak = useCallback(
        (text: string, options: SpeakOptions = {}) => {
            if (!supported || !text.trim()) return;

            const synth = window.speechSynthesis;
            const code = SPEECH_LANG[options.lang ?? lang];

            
            
            if (synth.speaking || synth.pending) synth.cancel();
            if (synth.paused) synth.resume();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = code;
            const voice = pickVoice(synth.getVoices(), code);
            if (voice) utterance.voice = voice;
            utterance.rate = options.rate ?? 0.95;
            utterance.pitch = options.pitch ?? 1;
            utterance.volume = options.volume ?? 1;

            const finish = () => {
                if (current.current === utterance) {
                    current.current = null;
                    setSpeaking(false);
                }
            };
            utterance.onstart = () => setSpeaking(true);
            utterance.onend = finish;
            utterance.onerror = finish;

            current.current = utterance;
            synth.speak(utterance);
        },
        [lang]
    );

    const cancel = useCallback(() => {
        if (!supported) return;
        window.speechSynthesis.cancel();
        current.current = null;
        setSpeaking(false);
    }, []);

    const hasVoice = useMemo(() => pickVoice(voices, SPEECH_LANG[lang]) !== null, [voices, lang]);

    return {
        speak,
        cancel,
        speaking,
        supported,
        voicesReady: voices.length > 0,
        hasVoice,
    };
}