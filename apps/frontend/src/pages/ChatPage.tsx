import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthStore } from '../stores/auth-store';
import { useChatStore } from '../stores/chat-store';

export function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const { messages, sendLocal, addIncoming, popupEnabled, setPopupEnabled } = useChatStore();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const sortedMessages = useMemo(() => [...messages].sort((a, b) => a.ts - b.ts), [messages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [sortedMessages.length]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    sendLocal(trimmed, user.email ?? 'me', user.siteId ?? undefined, user.role);
    setText('');
    // Stub for remote echo to demonstrate popup: remove this when wiring MQTT.
    window.setTimeout(() => {
      addIncoming({
        text: trimmed,
        from: 'Echo Bot',
        ts: Date.now(),
        role: 'SYSTEM',
        siteId: user.siteId ?? undefined,
      });
    }, 300);
  };

  return (
    <section className="panel chat-page">
      <header className="panel__header">
        <div>
          <h1 className="panel__title">Operator Chat</h1>
          <p className="panel__subtitle">
            Secure operator chat over MQTT. Incoming messages appear here and can trigger pop-ups.
          </p>
        </div>
        <label className="control-chip">
          <input
            type="checkbox"
            checked={popupEnabled}
            onChange={(event) => setPopupEnabled(event.target.checked)}
          />
          Pop up on new messages
        </label>
      </header>

      <div className="chat-body">
        <div className="chat-messages" ref={listRef}>
          {sortedMessages.length === 0 ? (
            <div className="empty-state">No messages yet. Start the conversation.</div>
          ) : (
            sortedMessages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.origin === 'self' ? 'chat-message--self' : ''}`}
              >
                <div className="chat-message__meta">
                  <strong>{msg.from}</strong>
                  {msg.role ? <span className="chat-message__role">{msg.role}</span> : null}
                  <span className="chat-message__time">
                    {new Date(msg.ts).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="chat-message__text">{msg.text}</div>
              </div>
            ))
          )}
        </div>
        <form className="chat-compose" onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type a message and press Enter to send. Shift+Enter for newline."
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event as unknown as FormEvent);
              }
            }}
          />
          <button type="submit" className="control-chip" disabled={!text.trim()}>
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
