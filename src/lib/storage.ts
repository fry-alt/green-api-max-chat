import type { Credentials } from '../api/types';
import type { ChatsState } from '../state/chats';

// Данные доступа и переписка живут в sessionStorage: переживают перезагрузку вкладки,
// но стираются при её закрытии. Токен инстанса не должен лежать в браузере дольше нужного.
const CREDS_KEY = 'max-chat:credentials';
const chatsKey = (idInstance: string) => `max-chat:chats:${idInstance}`;

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Приватный режим или переполненное хранилище — приложение работает и без сохранения
  }
}

export const loadCredentials = () => read<Credentials>(CREDS_KEY);
export const saveCredentials = (c: Credentials | null) => write(CREDS_KEY, c);

export const loadChats = (idInstance: string) => read<ChatsState>(chatsKey(idInstance));
export const saveChats = (idInstance: string, state: ChatsState | null) => write(chatsKey(idInstance), state);
