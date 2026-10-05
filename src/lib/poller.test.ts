import { describe, expect, it, vi } from 'vitest';
import type { NotificationBody, ReceivedNotification } from '../api/types';
import { pollNotifications } from './poller';

const note = (receiptId: number): ReceivedNotification => ({
  receiptId,
  body: { typeWebhook: 'incomingMessageReceived', idMessage: String(receiptId) },
});

// Фейковый клиент: отдаёт заранее заданную очередь, после неё останавливает цикл
function fakeClient(queue: Array<ReceivedNotification | null | Error>, controller: AbortController) {
  const deleted: number[] = [];
  return {
    deleted,
    receiveNotification: vi.fn(async () => {
      const next = queue.shift();
      if (next === undefined) {
        controller.abort();
        return null;
      }
      if (next instanceof Error) throw next;
      return next;
    }),
    deleteNotification: vi.fn(async (id: number) => {
      deleted.push(id);
      return true;
    }),
  };
}

const noSleep = async () => {};

describe('pollNotifications', () => {
  it('обрабатывает каждое уведомление и удаляет его из очереди', async () => {
    const controller = new AbortController();
    const client = fakeClient([note(1), null, note(2)], controller);
    const seen: NotificationBody[] = [];

    await pollNotifications(client, (b) => seen.push(b), controller.signal, { sleep: noSleep });

    expect(seen.map((b) => b.idMessage)).toEqual(['1', '2']);
    expect(client.deleted).toEqual([1, 2]);
  });

  it('удаляет уведомление, даже если обработчик упал, — очередь не застревает', async () => {
    const controller = new AbortController();
    const client = fakeClient([note(1), note(2)], controller);
    const handled: string[] = [];
    const onError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await pollNotifications(
      client,
      (b) => {
        if (b.idMessage === '1') throw new Error('сломался разбор');
        handled.push(b.idMessage!);
      },
      controller.signal,
      { sleep: noSleep, onError },
    );

    expect(client.deleted).toEqual([1, 2]);
    expect(handled).toEqual(['2']);
    // Сбой обработчика — не обрыв связи
    expect(onError).not.toHaveBeenCalled();
  });

  it('при ошибках сети ждёт всё дольше, а после восстановления сообщает об этом', async () => {
    const controller = new AbortController();
    const client = fakeClient([new Error('offline'), new Error('offline'), new Error('offline'), note(1)], controller);
    const sleep = vi.fn(async (_ms: number, _signal: AbortSignal) => {});
    const onRecovered = vi.fn();

    await pollNotifications(client, () => {}, controller.signal, { sleep, onRecovered, maxBackoffMs: 3000 });

    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 3000]);
    expect(onRecovered).toHaveBeenCalledOnce();
    expect(client.deleted).toEqual([1]);
  });

  it('останавливается сразу, если сигнал уже отменён', async () => {
    const controller = new AbortController();
    controller.abort();
    const client = fakeClient([note(1)], controller);

    await pollNotifications(client, () => {}, controller.signal);

    expect(client.receiveNotification).not.toHaveBeenCalled();
  });
});
