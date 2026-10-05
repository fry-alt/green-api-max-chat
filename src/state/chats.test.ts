import { describe, expect, it } from 'vitest';
import type { ParsedMessage } from '../lib/notifications';
import { chatsReducer, initialChatsState, restoreChats, sortedChats, type ChatsState } from './chats';

const opened = chatsReducer(initialChatsState, {
  type: 'chatOpened',
  chatId: '100',
  title: '+7 999 123-45-67',
  phone: '79991234567',
  createdAt: 1000,
});

const incoming = (over: Partial<ParsedMessage> = {}): ParsedMessage => ({
  chatId: '100',
  chatTitle: 'Аня',
  id: 'in-1',
  text: 'Привет',
  direction: 'in',
  timestamp: 2000,
  ...over,
});

describe('chatsReducer', () => {
  it('создание чата делает его активным', () => {
    expect(opened.activeChatId).toBe('100');
    expect(opened.chats['100']?.messages).toEqual([]);
  });

  it('повторная доставка того же уведомления не дублирует сообщение', () => {
    const once = chatsReducer(opened, { type: 'messageReceived', message: incoming() });
    const twice = chatsReducer(once, { type: 'messageReceived', message: incoming() });
    expect(twice.chats['100']?.messages).toHaveLength(1);
    expect(twice).toBe(once);
  });

  it('входящее в неактивный чат увеличивает счётчик непрочитанных, выбор чата его сбрасывает', () => {
    const elsewhere = chatsReducer(opened, { type: 'chatSelected', chatId: null });
    const received = chatsReducer(elsewhere, { type: 'messageReceived', message: incoming() });
    expect(received.chats['100']?.unread).toBe(1);
    expect(chatsReducer(received, { type: 'chatSelected', chatId: '100' }).chats['100']?.unread).toBe(0);
  });

  it('сообщение от незнакомого чата создаёт новый чат с именем из MAX', () => {
    const state = chatsReducer(initialChatsState, {
      type: 'messageReceived',
      message: incoming({ chatId: '200', chatTitle: 'Макс', phone: '79990000000' }),
    });
    expect(state.chats['200']).toMatchObject({ title: 'Макс', phone: '79990000000', unread: 1 });
  });

  it('имя из MAX заменяет номер в заголовке чата', () => {
    const state = chatsReducer(opened, { type: 'messageReceived', message: incoming() });
    expect(state.chats['100']?.title).toBe('Аня');
  });

  describe('отправка', () => {
    const queued = chatsReducer(opened, {
      type: 'messageQueued',
      chatId: '100',
      tempId: 'local-1',
      text: 'Как дела?',
      timestamp: 3000,
    });

    it('после ответа API временный id меняется на настоящий', () => {
      const sent = chatsReducer(queued, { type: 'messageSent', chatId: '100', tempId: 'local-1', id: 'api-1' });
      expect(sent.chats['100']?.messages).toEqual([
        { id: 'api-1', text: 'Как дела?', direction: 'out', timestamp: 3000, status: 'sent' },
      ]);
    });

    it('если эхо из очереди пришло раньше ответа API, остаётся одно сообщение', () => {
      const echoed = chatsReducer(queued, {
        type: 'messageReceived',
        message: incoming({ id: 'api-1', text: 'Как дела?', direction: 'out', timestamp: 3000 }),
      });
      const sent = chatsReducer(echoed, { type: 'messageSent', chatId: '100', tempId: 'local-1', id: 'api-1' });
      expect(sent.chats['100']?.messages.map((m) => m.id)).toEqual(['api-1']);
    });

    it('ошибка помечает сообщение, повтор возвращает его в отправку', () => {
      const failed = chatsReducer(queued, { type: 'messageFailed', chatId: '100', tempId: 'local-1' });
      expect(failed.chats['100']?.messages[0]?.status).toBe('failed');
      const retried = chatsReducer(failed, { type: 'messageRetried', chatId: '100', tempId: 'local-1' });
      expect(retried.chats['100']?.messages[0]?.status).toBe('sending');
    });
  });

  it('сообщения стоят по времени, даже если пришли не по порядку', () => {
    let state = chatsReducer(opened, { type: 'messageReceived', message: incoming({ id: 'b', timestamp: 5000 }) });
    state = chatsReducer(state, { type: 'messageReceived', message: incoming({ id: 'a', timestamp: 4000 }) });
    expect(state.chats['100']?.messages.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('sortedChats', () => {
  it('сверху чат с самой свежей активностью, пустой новый чат — по времени создания', () => {
    let state: ChatsState = chatsReducer(opened, { type: 'messageReceived', message: incoming({ timestamp: 2000 }) });
    state = chatsReducer(state, { type: 'chatOpened', chatId: '300', title: 'Новый', createdAt: 9000 });
    expect(sortedChats(state).map((c) => c.chatId)).toEqual(['300', '100']);
  });
});

describe('restoreChats', () => {
  it('незавершённые отправки после перезагрузки считаются неотправленными', () => {
    const queued = chatsReducer(opened, {
      type: 'messageQueued',
      chatId: '100',
      tempId: 'local-1',
      text: 'x',
      timestamp: 3000,
    });
    expect(restoreChats(queued).chats['100']?.messages[0]?.status).toBe('failed');
    expect(restoreChats(null)).toEqual(initialChatsState);
  });
});
