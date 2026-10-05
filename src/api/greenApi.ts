import type {
  CheckAccountResult,
  Credentials,
  InstanceSettings,
  InstanceState,
  ReceivedNotification,
  SendMessageResult,
} from './types';

export class GreenApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }
}

// Хост API выдаётся в личном кабинете вместе с инстансом. Он совпадает с первыми
// четырьмя цифрами idInstance: инстанс 3100123456 → https://3100.api.green-api.com
export function defaultApiUrl(idInstance: string): string {
  const prefix = idInstance.trim().slice(0, 4);
  return /^\d{4}$/.test(prefix) ? `https://${prefix}.api.green-api.com` : '';
}

export interface GreenApiClient {
  getStateInstance(signal?: AbortSignal): Promise<InstanceState>;
  getSettings(signal?: AbortSignal): Promise<InstanceSettings>;
  checkAccount(phoneNumber: string, signal?: AbortSignal): Promise<CheckAccountResult>;
  sendMessage(chatId: string, message: string, signal?: AbortSignal): Promise<SendMessageResult>;
  receiveNotification(timeoutSec: number, signal?: AbortSignal): Promise<ReceivedNotification | null>;
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<boolean>;
}

type FetchFn = typeof fetch;

export function createGreenApiClient(creds: Credentials, fetchFn: FetchFn = fetch): GreenApiClient {
  const base = creds.apiUrl.replace(/\/+$/, '');
  const id = creds.idInstance.trim();
  const token = creds.apiTokenInstance.trim();

  async function call<T>(method: string, init: RequestInit = {}, suffix = ''): Promise<T> {
    const url = `${base}/waInstance${id}/${method}/${token}${suffix}`;
    let res: Response;
    try {
      res = await fetchFn(url, {
        ...init,
        headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new GreenApiError(0, 'Нет связи с GREEN-API. Проверьте интернет и адрес API.');
    }
    const text = await res.text();
    if (!res.ok) throw new GreenApiError(res.status, describeError(res.status, text));
    // receiveNotification отвечает пустым телом или "null", когда очередь пуста
    return (text ? JSON.parse(text) : null) as T;
  }

  const post = (body: unknown, signal?: AbortSignal): RequestInit => ({
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });

  return {
    async getStateInstance(signal) {
      const r = await call<{ stateInstance: InstanceState }>('getStateInstance', { signal });
      return r.stateInstance;
    },

    getSettings(signal) {
      return call<InstanceSettings>('getSettings', { signal });
    },

    async checkAccount(phoneNumber, signal) {
      const r = await call<CheckAccountResult & { status?: boolean; reason?: string }>(
        'checkAccount',
        post({ phoneNumber: Number(phoneNumber) }, signal),
      );
      // Если инстанс не авторизован или упёрся в лимит, вместо exist приходит {status:false, reason}
      if (r.status === false) throw new GreenApiError(200, r.reason ?? 'Не удалось проверить номер');
      return { exist: Boolean(r.exist), chatId: String(r.chatId ?? '') };
    },

    sendMessage(chatId, message, signal) {
      return call<SendMessageResult>('sendMessage', post({ chatId, message }, signal));
    },

    receiveNotification(timeoutSec, signal) {
      return call<ReceivedNotification | null>(
        'receiveNotification',
        { signal },
        `?receiveTimeout=${timeoutSec}`,
      );
    },

    async deleteNotification(receiptId, signal) {
      const r = await call<{ result: boolean }>(
        'deleteNotification',
        { method: 'DELETE', signal },
        `/${receiptId}`,
      );
      return Boolean(r?.result);
    },
  };
}

function describeError(status: number, body: string): string {
  if (status === 401 || status === 403) {
    if (/suspended/i.test(body)) return 'На аккаунте MAX временные ограничения на отправку.';
    return 'Неверный idInstance или apiTokenInstance.';
  }
  if (status === 429) return 'Слишком много запросов. Подождите немного.';
  if (status === 466) return 'Исчерпан лимит тарифа GREEN-API.';
  if (status >= 500) return 'GREEN-API временно недоступен. Попробуйте позже.';
  if (/webhook url is set/i.test(body)) {
    return 'В настройках инстанса задан webhookUrl — очистите его, иначе уведомления не придут через HTTP API.';
  }
  const detail = body.length > 200 ? `${body.slice(0, 200)}…` : body;
  return `Ошибка GREEN-API (${status})${detail ? `: ${detail}` : ''}`;
}
