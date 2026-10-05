import type { ParsedMessage } from '../lib/notifications';

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface Message {
  id: string;
  text: string;
  direction: 'in' | 'out';
  timestamp: number;
  status: MessageStatus;
}

export interface Chat {
  chatId: string;
  title: string;
  phone?: string;
  messages: Message[];
  unread: number;
  createdAt: number;
}

export interface ChatsState {
  chats: Record<string, Chat>;
  activeChatId: string | null;
}

export const initialChatsState: ChatsState = { chats: {}, activeChatId: null };

export type ChatsAction =
  | { type: 'chatOpened'; chatId: string; title: string; phone?: string; createdAt: number }
  | { type: 'chatSelected'; chatId: string | null }
  | { type: 'messageReceived'; message: ParsedMessage }
  | { type: 'messageQueued'; chatId: string; tempId: string; text: string; timestamp: number }
  | { type: 'messageSent'; chatId: string; tempId: string; id: string }
  | { type: 'messageFailed'; chatId: string; tempId: string }
  | { type: 'messageRetried'; chatId: string; tempId: string };

export function chatsReducer(state: ChatsState, action: ChatsAction): ChatsState {
  switch (action.type) {
    case 'chatOpened': {
      const existing = state.chats[action.chatId];
      const chat: Chat = existing
        ? { ...existing, phone: existing.phone ?? action.phone, unread: 0 }
        : {
            chatId: action.chatId,
            title: action.title,
            phone: action.phone,
            messages: [],
            unread: 0,
            createdAt: action.createdAt,
          };
      return { chats: { ...state.chats, [chat.chatId]: chat }, activeChatId: chat.chatId };
    }

    case 'chatSelected': {
      if (action.chatId === null) return { ...state, activeChatId: null };
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      return {
        chats: { ...state.chats, [chat.chatId]: { ...chat, unread: 0 } },
        activeChatId: chat.chatId,
      };
    }

    case 'messageReceived': {
      const m = action.message;
      const existing = state.chats[m.chatId];
      // Повторная доставка уведомления (или эхо нашего же сообщения из API) — пропускаем
      if (existing?.messages.some((x) => x.id === m.id)) return state;

      const chat: Chat = existing ?? {
        chatId: m.chatId,
        title: m.chatTitle || (m.phone ? `+${m.phone}` : `Чат ${m.chatId}`),
        phone: m.phone,
        messages: [],
        unread: 0,
        createdAt: m.timestamp,
      };
      const message: Message = {
        id: m.id,
        text: m.text,
        direction: m.direction,
        timestamp: m.timestamp,
        status: 'sent',
      };
      const isActive = state.activeChatId === m.chatId;
      return withChat(state, {
        ...chat,
        // Имя из MAX точнее того, что мы придумали по номеру
        title: m.chatTitle && m.direction === 'in' ? m.chatTitle : chat.title,
        phone: chat.phone ?? m.phone,
        messages: insertByTime(chat.messages, message),
        unread: m.direction === 'in' && !isActive ? chat.unread + 1 : chat.unread,
      });
    }

    case 'messageQueued': {
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      const message: Message = {
        id: action.tempId,
        text: action.text,
        direction: 'out',
        timestamp: action.timestamp,
        status: 'sending',
      };
      return withChat(state, { ...chat, messages: [...chat.messages, message] });
    }

    case 'messageSent': {
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      // Уведомление outgoingAPIMessageReceived могло прийти раньше ответа sendMessage
      const echoed = chat.messages.some((x) => x.id === action.id);
      const messages = echoed
        ? chat.messages.filter((x) => x.id !== action.tempId)
        : chat.messages.map((x) => (x.id === action.tempId ? { ...x, id: action.id, status: 'sent' as const } : x));
      return withChat(state, { ...chat, messages });
    }

    case 'messageFailed':
    case 'messageRetried': {
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      const status: MessageStatus = action.type === 'messageFailed' ? 'failed' : 'sending';
      const messages = chat.messages.map((x) => (x.id === action.tempId ? { ...x, status } : x));
      return withChat(state, { ...chat, messages });
    }
  }
}

function withChat(state: ChatsState, chat: Chat): ChatsState {
  return { ...state, chats: { ...state.chats, [chat.chatId]: chat } };
}

// Уведомления приходят по порядку, но наше сообщение может «обогнать» входящее
function insertByTime(messages: Message[], message: Message): Message[] {
  let i = messages.length;
  while (i > 0 && messages[i - 1]!.timestamp > message.timestamp) i--;
  return [...messages.slice(0, i), message, ...messages.slice(i)];
}

// Чаты в порядке последней активности — как в списке чатов мессенджера
export function sortedChats(state: ChatsState): Chat[] {
  const last = (c: Chat) => c.messages[c.messages.length - 1]?.timestamp ?? c.createdAt;
  return Object.values(state.chats).sort((a, b) => last(b) - last(a));
}

// После перезагрузки вкладки запрос отправки уже оборван: «отправляется» превращаем в «не отправлено»
export function restoreChats(saved: ChatsState | null): ChatsState {
  if (!saved?.chats) return initialChatsState;
  const chats: Record<string, Chat> = {};
  for (const [id, chat] of Object.entries(saved.chats)) {
    chats[id] = {
      ...chat,
      messages: chat.messages.map((m) => (m.status === 'sending' ? { ...m, status: 'failed' as const } : m)),
    };
  }
  return { chats, activeChatId: saved.activeChatId };
}
