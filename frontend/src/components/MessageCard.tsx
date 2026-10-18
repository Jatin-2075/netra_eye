export interface MessageCardProps {
    message: string;
    speaking: boolean;
    label: string;
    onTypedText: (text: string) => void;
}


export default function MessageCard({ message, speaking, label, onTypedText }: MessageCardProps) {
    return (
        <section className={`msgcard${speaking ? ' speaking' : ''}`} aria-label="Custom message">
            <div className="msgbody">
                <div className="sec-lab">{label}</div>
                <div className={`msgtext${message ? '' : ' ph'}`} aria-live="polite">
                    {message || 'Pick letters with your eyes…'}
                    <span className="caret" />
                </div>
                <input
                    id="custom-message"
                    className="msgin"
                    type="text"
                    aria-label="Custom message (type normally or use the eye keyboard)"
                    value={message}
                    placeholder="…or type here with a physical keyboard"
                    onChange={(e) => onTypedText(e.target.value)}
                />
            </div>
            <span className="bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        </section>
    );
}
