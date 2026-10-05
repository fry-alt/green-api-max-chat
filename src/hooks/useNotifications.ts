import { useEffect, useState } from 'react';
import type { GreenApiClient } from '../api/greenApi';
import { GreenApiError } from '../api/greenApi';
import type { NotificationBody } from '../api/types';
import { pollNotifications } from '../lib/poller';

export type Connection = { ok: true } | { ok: false; error: string };

// Держит цикл получения уведомлений, пока компонент смонтирован.
// При размонтировании (выход, смена инстанса) запрос обрывается через AbortController.
export function useNotifications(client: GreenApiClient, onNotification: (body: NotificationBody) => void) {
  const [connection, setConnection] = useState<Connection>({ ok: true });

  useEffect(() => {
    const controller = new AbortController();
    void pollNotifications(client, onNotification, controller.signal, {
      onError: (err) =>
        setConnection({
          ok: false,
          error: err instanceof GreenApiError ? err.message : 'Нет связи с GREEN-API',
        }),
      onRecovered: () => setConnection({ ok: true }),
    });
    return () => controller.abort();
  }, [client, onNotification]);

  return connection;
}
