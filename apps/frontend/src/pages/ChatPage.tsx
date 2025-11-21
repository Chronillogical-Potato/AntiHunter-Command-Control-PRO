import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { sendChatMessage } from '../api/chat';
import { useAuthStore } from '../stores/auth-store';
import { useChatKeyStore } from '../stores/chat-key-store';
import { useChatStore } from '../stores/chat-store';
import { encryptText } from '../utils/chat-crypto';

export function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const { messages, sendLocal, popupEnabled, setPopupEnabled, updateStatus, clearLocal } =
    useChatStore();
  const { getKey } = useChatKeyStore();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const [targetSiteId, setTargetSiteId] = useState<string>('local');

  const sortedMessages = useMemo(() => [...messages].sort((a, b) => a.ts - b.ts), [messages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [sortedMessages.length]);

  const siteOptions =
    user?.siteAccess?.map((s) => ({ id: s.siteId, label: s.siteName ?? s.siteId })) ?? [];
  const currentSiteId = siteOptions[0]?.id;
  const activeKey = currentSiteId ? getKey(currentSiteId) : undefined;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    const siteId =
      targetSiteId === 'all' ? '@ALL' : targetSiteId === 'local' ? currentSiteId : targetSiteId;
    const role = user.role;
    const useKey = activeKey;
    let cipherText: string | undefined;
    if (useKey) {
      cipherText = await encryptText(useKey, trimmed);
    }
    const tempId = sendLocal(trimmed, user.email ?? 'me', siteId, role, 'pending');
    setText('');
    const response = await sendChatMessage({
      siteId,
      encrypted: Boolean(useKey),
      cipherText,
      text: useKey ? undefined : trimmed,
    });

    const ts = Date.parse(response.ts);
    updateStatus(tempId, 'sent', response.id, Number.isFinite(ts) ? ts : undefined);
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
        <div className="chat-controls">
          <div className="chat-targets">
            <select
              className="control-input"
              value={targetSiteId}
              onChange={(e) => setTargetSiteId(e.target.value)}
            >
              <option value="local">This site ({currentSiteId ?? 'n/a'})</option>
              <option value="all">@ALL (broadcast)</option>
              {siteOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <label className="control-chip">
            <input
              type="checkbox"
              checked={popupEnabled}
              onChange={(event) => setPopupEnabled(event.target.checked)}
            />
            Pop up on new messages
          </label>
          <button type="button" className="control-chip control-chip--danger" onClick={clearLocal}>
            Clear local
          </button>
        </div>
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
