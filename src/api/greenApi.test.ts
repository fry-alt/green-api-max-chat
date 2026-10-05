import { describe, expect, it, vi } from 'vitest';
import { createGreenApiClient, defaultApiUrl, GreenApiError } from './greenApi';

const creds = { apiUrl: 'https://3100.api.green-api.com/', idInstance: '3100123456', apiTokenInstance: 'token' };

function mockFetch(status: number, body: string) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(body, { status }));
}

describe('defaultApiUrl', () => {
  it('берёт хост из первых четырёх цифр idInstance', () => {
    expect(defaultApiUrl('3100123456')).toBe('https://3100.api.green-api.com');
    expect(defaultApiUrl('12')).toBe('');
  });
});

describe('createGreenApiClient', () => {
  it('sendMessage шлёт POST с chatId и текстом на адрес инстанса', async () => {
    const fetchFn = mockFetch(200, '{"idMessage":"42"}');
    const result = await createGreenApiClient(creds, fetchFn).sendMessage('100', 'Привет');

    expect(result).toEqual({ idMessage: '42' });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://3100.api.green-api.com/waInstance3100123456/sendMessage/token');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ chatId: '100', message: 'Привет' });
  });

  it('receiveNotification возвращает null, когда очередь пуста', async () => {
    const fetchFn = mockFetch(200, 'null');
    const client = createGreenApiClient(creds, fetchFn);

    await expect(client.receiveNotification(20)).resolves.toBeNull();
    expect(String(fetchFn.mock.calls[0]![0])).toContain('/receiveNotification/token?receiveTimeout=20');
  });

  it('deleteNotification вызывает DELETE с receiptId', async () => {
    const fetchFn = mockFetch(200, '{"result":true}');
    await expect(createGreenApiClient(creds, fetchFn).deleteNotification(7)).resolves.toBe(true);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://3100.api.green-api.com/waInstance3100123456/deleteNotification/token/7');
    expect(init?.method).toBe('DELETE');
  });

  it('checkAccount отдаёт chatId и превращает {status:false} в ошибку', async () => {
    const ok = createGreenApiClient(creds, mockFetch(200, '{"exist":true,"chatId":"10000000"}'));
    await expect(ok.checkAccount('79991234567')).resolves.toEqual({ exist: true, chatId: '10000000' });

    const limited = createGreenApiClient(
      creds,
      mockFetch(200, '{"status":false,"reason":"User get contact info limit reached"}'),
    );
    await expect(limited.checkAccount('79991234567')).rejects.toThrow('limit reached');
  });

  it('переводит коды ошибок в понятный текст', async () => {
    const unauthorized = createGreenApiClient(creds, mockFetch(401, 'Unauthorized'));
    await expect(unauthorized.getStateInstance()).rejects.toThrow('Неверный idInstance или apiTokenInstance');

    const err = await createGreenApiClient(creds, mockFetch(429, '')).getSettings().catch((e) => e);
    expect(err).toBeInstanceOf(GreenApiError);
    expect(err.status).toBe(429);
  });

  it('сетевую ошибку превращает в GreenApiError, а отмену пробрасывает как есть', async () => {
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(createGreenApiClient(creds, offline).getSettings()).rejects.toThrow('Нет связи');

    const aborted = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(createGreenApiClient(creds, aborted).getSettings()).rejects.toMatchObject({ name: 'AbortError' });
  });
});
