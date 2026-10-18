import { t, type Lang } from '../lib/i18n';
import Tile from './Tile';

import type { DeviceId } from '../lib/devices';

export type { DeviceId };

interface Props {
    lang: Lang;
    lampOn: boolean;
    fanOn: boolean;
    activeId?: DeviceId | null;
    progress?: number;
    onToggle?: (id: DeviceId) => void;
}

function LampArt() {
    return (
        <svg className="room-art" viewBox="0 0 120 140" aria-hidden="true">
            <defs>
                <radialGradient id="room-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f0b548" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#f0b548" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle className="room-glow" cx="60" cy="52" r="58" fill="url(#room-glow)" />
            <path className="room-shade" d="M34 70 L46 26 H74 L86 70 Z" />
            <rect className="room-stem" x="56.5" y="70" width="7" height="46" rx="3" />
            <ellipse className="room-base" cx="60" cy="122" rx="24" ry="7" />
        </svg>
    );
}

function FanArt() {
    return (
        <svg className="room-art" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="room-guard" cx="60" cy="60" r="52" />
            <g className="room-blades">
                <ellipse className="room-blade" cx="60" cy="30" rx="12" ry="25" />
                <ellipse className="room-blade" cx="60" cy="30" rx="12" ry="25" transform="rotate(120 60 60)" />
                <ellipse className="room-blade" cx="60" cy="30" rx="12" ry="25" transform="rotate(240 60 60)" />
            </g>
            <circle className="room-hub" cx="60" cy="60" r="9" />
        </svg>
    );
}

export default function RoomPanel({ lang, lampOn, fanOn, activeId = null, progress = 0, onToggle }: Props) {
    const dev = (id: DeviceId, on: boolean, index: number) => (
        <Tile
            key={id}
            index={index}
            testId={`device-${id}`}
            label={`${t(lang, id)} · ${t(lang, on ? 'on' : 'off')}`}
            className={`device ${id}${on ? ' on' : ''}`}
            focused={activeId === id}
            progress={progress}
            onClick={() => onToggle?.(id)}
        >
            {id === 'lamp' ? <LampArt /> : <FanArt />}
            <span className="name">{t(lang, id)}</span>
            <span className={`sw${on ? ' on' : ''}`}><i /><b>{t(lang, on ? 'on' : 'off')}</b></span>
        </Tile>
    );
    return (
        <div className="devs" role="listbox" aria-label="Room devices">
            {dev('lamp', lampOn, 0)}
            {dev('fan', fanOn, 1)}
        </div>
    );
}
