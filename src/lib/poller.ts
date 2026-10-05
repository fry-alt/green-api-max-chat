import type { GreenApiClient } from '../api/greenApi';
import type { NotificationBody } from '../api/types';

export interface PollOptions {
  // Сколько секунд сервер держит запрос, если очередь пуста (5–60)
  receiveTimeoutSec?: number;
  maxBackoffMs?: number;
  onError?: (err: unknown) => void;
  onRecovered?: () => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

// Цикл получения уведомлений по технологии HTTP API:
// receiveNotification (long polling) → обработка → deleteNotification.
// Уведомление удаляется, даже если обработчик упал: иначе очередь застрянет на нём навсегда.
// Ошибка обработчика — баг приложения, а не проблема связи, поэтому в onError она не идёт.
// Если упадёт сам deleteNotification, уведомление придёт повторно — поэтому
// сообщения в состоянии чата дедуплицируются по idMessage.
export async function pollNotifications(
  client: Pick<GreenApiClient, 'receiveNotification' | 'deleteNotification'>,
  handle: (body: NotificationBody) => void,
  signal: AbortSignal,
  options: PollOptions = {},
): Promise<void> {
  const { receiveTimeoutSec = 20, maxBackoffMs = 15_000, onError, onRecovered, sleep = abortableSleep } = options;
  let backoff = 0;

  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification(receiveTimeoutSec, signal);
      if (backoff) {
        backoff = 0;
        onRecovered?.();
      }
      if (!notification) continue;
      try {
        handle(notification.body);
      } catch (err) {
        console.error('Не удалось обработать уведомление', notification.body, err);
      }
      await client.deleteNotification(notification.receiptId, signal);
    } catch (err) {
      if (signal.aborted) return;
      onError?.(err);
      backoff = Math.min(backoff ? backoff * 2 : 1000, maxBackoffMs);
      await sleep(backoff, signal);
    }
  }
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
  });
}
