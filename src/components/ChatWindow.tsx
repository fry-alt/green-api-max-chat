import { Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatDay, formatTime, isSameDay } from '../lib/format';
import { formatPhone } from '../lib/phone';
import type { Chat, Message } from '../state/chats';
import { Avatar } from './Avatar';
import { BackIcon, CheckIcon, ClockIcon, SendIcon } from './icons';

const MAX_LENGTH = 4000; // ограничение SendMessage

interface Props {
  chat: Chat | undefined;
  onSend: (text: string) => void;
  onRetry: (tempId: string) => void;
  onBack: () => void;
}

export function ChatWindow({ chat, onSend, onRetry, onBack }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const messageCount = chat?.messages.length ?? 0;

  // Новое сообщение — прокручиваем вниз
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.chatId, messageCount]);

  if (!chat) {
    return (
      <main className="chat wallpaper chat-placeholder">
        <p>Выберите чат или создайте новый по номеру телефона</p>
      </main>
    );
  }

  const subtitle = chat.phone && formatPhone(chat.phone) !== chat.title ? formatPhone(chat.phone) : 'MAX';

  return (
    <main className="chat wallpaper">
      <header className="chat-header">
        <button className="icon-button back-button" onClick={onBack} aria-label="К списку чатов">
          <BackIcon />
        </button>
        <Avatar id={chat.chatId} title={chat.title} size={40} />
        <div className="chat-header-text">
          <h2>{chat.title}</h2>
          <span>{subtitle}</span>
        </div>
      </header>

      <div className="messages" ref={listRef}>
        {chat.messages.length === 0 && <p className="messages-empty">Напишите первое сообщение</p>}
        {chat.messages.map((m, i) => {
          const prev = chat.messages[i - 1];
          return (
            <Fragment key={m.id}>
              {(!prev || !isSameDay(prev.timestamp, m.timestamp)) && (
                <div className="day-separator">
                  <span>{formatDay(m.timestamp)}</span>
                </div>
              )}
              <Bubble message={m} onRetry={onRetry} />
            </Fragment>
          );
        })}
      </div>

      <Composer key={chat.chatId} onSend={onSend} />
    </main>
  );
}

function Bubble({ message, onRetry }: { message: Message; onRetry: (tempId: string) => void }) {
  return (
    <div className={`bubble-row ${message.direction === 'out' ? 'is-out' : 'is-in'}`}>
      <div className={`bubble ${message.status === 'failed' ? 'is-failed' : ''}`}>
        <span className="bubble-text">{message.text}</span>
        <span className="bubble-meta">
          {formatTime(message.timestamp)}
          {message.direction === 'out' && message.status === 'sending' && <ClockIcon />}
          {message.direction === 'out' && message.status === 'sent' && <CheckIcon />}
        </span>
      </div>
      {message.status === 'failed' && (
        <button className="retry" onClick={() => onRetry(message.id)}>
          Не отправлено. Повторить
        </button>
      )}
    </div>
  );
}

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();

  // Поле растёт вместе с текстом, но не выше пяти строк (ограничение в CSS)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  function submit() {
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter — отправить, Shift+Enter — перенос строки. Во время набора через IME не отправляем.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={MAX_LENGTH}
        placeholder="Сообщение"
        aria-label="Текст сообщения"
        autoFocus
      />
      <button className="send-button" disabled={!trimmed} aria-label="Отправить">
        <SendIcon />
      </button>
    </form>
  );
}
