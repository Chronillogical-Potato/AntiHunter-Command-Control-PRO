import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useChatStore, type ChatMessage } from '../stores/chat-store';

type Toast = {
  id: string;
  message: ChatMessage;
  expiresAt: number;
};

export function ChatPopupHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const popupEnabled = useChatStore((state) => state.popupEnabled);
  const messages = useChatStore((state) => state.messages);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const isChatPage = useMemo(() => location.pathname.startsWith('/chat'), [location.pathname]);

  useEffect(() => {
    if (!popupEnabled || isChatPage) {
      return;
    }
    const latest = messages[messages.length - 1];
    if (!latest || latest.origin !== 'remote') {
      return;
    }
    setToasts((prev) => {
      // avoid duplicate toast if same id
      if (prev.some((toast) => toast.id === latest.id)) {
        return prev;
      }
      const next: Toast = {
        id: latest.id,
        message: latest,
        expiresAt: Date.now() + 8000,
      };
      return [...prev.slice(-3), next];
    });
  }, [messages, popupEnabled, isChatPage]);

  useEffect(() => {
    if (!toasts.length) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((toast) => toast.expiresAt > now));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [toasts.length]);

  if (!toasts.length) return null;

  return (
    <div className="chat-popups">
      {toasts.map((toast) => (
        <div key={toast.id} className="chat-popup">
          <div className="chat-popup__meta">
            <strong>{toast.message.from}</strong>
            <span>{new Date(toast.message.ts).toLocaleTimeString()}</span>
          </div>
          <div className="chat-popup__text">{toast.message.text}</div>
          <button
            type="button"
            className="chat-popup__action"
            onClick={() => {
              setToasts([]);
              navigate('/chat');
            }}
          >
            Open chat
          </button>
        </div>
      ))}
    </div>
  );
}
