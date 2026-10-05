import { useState, type FormEvent } from 'react';
import type { Connection } from '../hooks/useNotifications';
import { formatListTime } from '../lib/format';
import { normalizePhone } from '../lib/phone';
import { sortedChats, type ChatsState } from '../state/chats';
import { Avatar } from './Avatar';
import { LogoutIcon, PlusIcon } from './icons';

interface Props {
  state: ChatsState;
  connection: Connection;
  settingsWarning: string;
  onSelect: (chatId: string) => void;
  // Возвращает текст ошибки или null, если чат открыт
  onOpenChat: (phone: string) => Promise<string | null>;
  onLogout: () => void;
}

export function Sidebar({ state, connection, settingsWarning, onSelect, onOpenChat, onLogout }: Props) {
  const chats = sortedChats(state);

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>Чаты</h1>
        <span
          className={`status ${connection.ok ? 'is-online' : 'is-offline'}`}
          title={connection.ok ? 'Получение сообщений работает' : connection.error}
        >
          {connection.ok ? 'в сети' : 'переподключение…'}
        </span>
        <button className="icon-button" onClick={onLogout} title="Выйти" aria-label="Выйти">
          <LogoutIcon />
        </button>
      </header>

      {!connection.ok && <p className="banner banner-error">{connection.error}</p>}
      {settingsWarning && <p className="banner">{settingsWarning}</p>}

      <NewChatForm onOpenChat={onOpenChat} />

      <ul className="chat-list">
        {chats.map((chat) => {
          const last = chat.messages[chat.messages.length - 1];
          return (
            <li key={chat.chatId}>
              <button
                className={`chat-item ${chat.chatId === state.activeChatId ? 'is-active' : ''}`}
                onClick={() => onSelect(chat.chatId)}
              >
                <Avatar id={chat.chatId} title={chat.title} />
                <span className="chat-item-body">
                  <span className="chat-item-top">
                    <span className="chat-item-title">{chat.title}</span>
                    {last && <span className="chat-item-time">{formatListTime(last.timestamp)}</span>}
                  </span>
                  <span className="chat-item-bottom">
                    <span className="chat-item-preview">
                      {last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                    </span>
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {chats.length === 0 && <p className="sidebar-empty">Введите номер, чтобы начать переписку</p>}
    </aside>
  );
}

function NewChatForm({ onOpenChat }: Pick<Props, 'onOpenChat'>) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = normalizePhone(value);
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    setError('');
    const err = await onOpenChat(parsed.phone);
    setBusy(false);
    if (err) setError(err);
    else setValue('');
  }

  return (
    <form className="new-chat" onSubmit={submit} noValidate>
      <div className="new-chat-row">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          type="tel"
          inputMode="tel"
          placeholder="Номер получателя, +7 999 123-45-67"
          aria-label="Номер телефона получателя"
        />
        <button className="icon-button is-filled" disabled={busy} title="Создать чат" aria-label="Создать чат">
          <PlusIcon />
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
