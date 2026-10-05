import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createGreenApiClient, GreenApiError } from '../api/greenApi';
import type { Credentials, NotificationBody } from '../api/types';
import { useNotifications } from '../hooks/useNotifications';
import { parseNotification } from '../lib/notifications';
import { formatPhone } from '../lib/phone';
import { loadChats, saveChats } from '../lib/storage';
import { chatsReducer, restoreChats } from '../state/chats';
import { ChatWindow } from './ChatWindow';
import { Sidebar } from './Sidebar';

interface Props {
  credentials: Credentials;
  onLogout: () => void;
}

export function Messenger({ credentials, onLogout }: Props) {
  const client = useMemo(() => createGreenApiClient(credentials), [credentials]);
  const [state, dispatch] = useReducer(
    chatsReducer,
    credentials.idInstance,
    (id) => restoreChats(loadChats(id)),
  );
  const [settingsWarning, setSettingsWarning] = useState('');

  useEffect(() => saveChats(credentials.idInstance, state), [credentials.idInstance, state]);

  const onNotification = useCallback((body: NotificationBody) => {
    const message = parseNotification(body);
    if (message) dispatch({ type: 'messageReceived', message });
  }, []);
  const connection = useNotifications(client, onNotification);

  // Без этих настроек входящие просто не попадут в очередь — лучше сказать сразу
  useEffect(() => {
    const controller = new AbortController();
    client
      .getSettings(controller.signal)
      .then((s) => {
        if (s.webhookUrl) {
          setSettingsWarning('В настройках инстанса задан webhookUrl — очистите его, чтобы получать сообщения в этом чате.');
        } else if (s.incomingWebhook !== 'yes') {
          setSettingsWarning('Включите в настройках инстанса «Получать уведомления о входящих сообщениях и файлах».');
        }
      })
      .catch(() => {
        // Не критично: если настройки неверны, это всё равно будет видно по ошибкам опроса
      });
    return () => controller.abort();
  }, [client]);

  async function openChat(phone: string): Promise<string | null> {
    try {
      const { exist, chatId } = await client.checkAccount(phone);
      if (!exist || !chatId) return 'На этом номере нет аккаунта MAX';
      dispatch({ type: 'chatOpened', chatId, title: formatPhone(phone), phone, createdAt: Date.now() });
      return null;
    } catch (err) {
      return err instanceof GreenApiError ? err.message : 'Не удалось проверить номер';
    }
  }

  async function deliver(chatId: string, tempId: string, text: string) {
    try {
      const { idMessage } = await client.sendMessage(chatId, text);
      dispatch({ type: 'messageSent', chatId, tempId, id: idMessage });
    } catch {
      dispatch({ type: 'messageFailed', chatId, tempId });
    }
  }

  function send(text: string) {
    const chatId = state.activeChatId;
    if (!chatId) return;
    const tempId = `local-${crypto.randomUUID()}`;
    dispatch({ type: 'messageQueued', chatId, tempId, text, timestamp: Date.now() });
    void deliver(chatId, tempId, text);
  }

  function retry(tempId: string) {
    const chatId = state.activeChatId;
    const message = chatId ? state.chats[chatId]?.messages.find((m) => m.id === tempId) : undefined;
    if (!chatId || !message) return;
    dispatch({ type: 'messageRetried', chatId, tempId });
    void deliver(chatId, tempId, message.text);
  }

  const activeChat = state.activeChatId ? state.chats[state.activeChatId] : undefined;

  return (
    <div className={`messenger ${activeChat ? 'has-active-chat' : ''}`}>
      <Sidebar
        state={state}
        connection={connection}
        settingsWarning={settingsWarning}
        onSelect={(chatId) => dispatch({ type: 'chatSelected', chatId })}
        onOpenChat={openChat}
        onLogout={onLogout}
      />
      <ChatWindow
        chat={activeChat}
        onSend={send}
        onRetry={retry}
        onBack={() => dispatch({ type: 'chatSelected', chatId: null })}
      />
    </div>
  );
}
