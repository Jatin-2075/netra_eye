


export type KbItemKind = 'group' | 'char' | 'action';
export type KbAction = 'space' | 'delete' | 'clear' | 'speak' | 'exit' | 'ungroup';

export interface KbItem {
    id: string; 
    kind: KbItemKind;
    label: string;
    icon?: string;
    group?: number; 
    char?: string; 
    action?: KbAction; 
}

export const KB_GROUPS: { label: string; keys: string[] }[] = [
    { label: 'A–E', keys: [...'ABCDE'] },
    { label: 'F–J', keys: [...'FGHIJ'] },
    { label: 'K–O', keys: [...'KLMNO'] },
    { label: 'P–T', keys: [...'PQRST'] },
    { label: 'U–Z', keys: [...'UVWXYZ'] },
    { label: '0–9', keys: [...'0123456789'] },
    { label: '. , ? !', keys: ['.', ',', '?', '!', "'", '-'] },
];

const A = (action: KbAction, label: string, icon: string): KbItem => ({
    id: `kb-item-${action}`,
    kind: 'action',
    label,
    icon,
    action,
});

                                                                         
export function keyboardItems(group: number | null): KbItem[] {
    if (group === null) {
        return [
            ...KB_GROUPS.map((g, i): KbItem => ({ id: `kb-item-group-${i}`, kind: 'group', label: g.label, group: i })),
            A('space', 'Space', 'next'),
            A('delete', 'Delete', 'backspace'),
            A('speak', 'Speak', 'speaker'),
            A('clear', 'Clear', 'trash'),
            A('exit', 'Menu', 'home'),
        ];
    }
    const g = KB_GROUPS[group];
    return [
        ...g.keys.map((c): KbItem => ({ id: `kb-item-char-${c}`, kind: 'char', label: c, char: c })),
        A('ungroup', 'Back', 'back'),
    ];
}

                                                                                                           
export function applyToMessage(message: string, item: KbItem): string | null {
    if (item.kind === 'char') return message + (item.char ?? '');
    if (item.kind !== 'action') return null;
    switch (item.action) {
        case 'space':
            return message.endsWith(' ') || message === '' ? message : message + ' ';
        case 'delete':
            return message.slice(0, -1);
        case 'clear':
            return '';
        default:
            return null;
    }
}

const PUNCT_NAMES: Record<string, string> = {
    '.': 'full stop',
    ',': 'comma',
    '?': 'question mark',
    '!': 'exclamation mark',
    "'": 'apostrophe',
    '-': 'dash',
};

                                                                                               
export const spokenKeyName = (char: string): string => PUNCT_NAMES[char] ?? char;

                                                                                    
export function lastWord(message: string): string {
    if (!message || message.endsWith(' ')) return '';
    const parts = message.split(/\s+/);
    return parts[parts.length - 1] ?? '';
}
