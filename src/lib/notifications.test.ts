import { describe, expect, it } from 'vitest';
import type { NotificationBody } from '../api/types';
import { parseNotification } from './notifications';

// Пример из документации: https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/
const incoming: NotificationBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: '126543123451133331119',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет от Green-API!' },
  },
};

describe('parseNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    expect(parseNotification(incoming)).toEqual({
      chatId: '10000000',
      chatTitle: 'Ходабрыш Пробешёлов',
      phone: '79876543210',
      id: '126543123451133331119',
      text: 'Привет от Green-API!',
      direction: 'in',
      timestamp: 1763115112000,
    });
  });

  it('сообщение, отправленное с телефона, считает исходящим и не берёт наш номер', () => {
    const parsed = parseNotification({ ...incoming, typeWebhook: 'outgoingMessageReceived' });
    expect(parsed?.direction).toBe('out');
    expect(parsed?.phone).toBeUndefined();
  });

  it('достаёт текст из extendedTextMessage (сообщение со ссылкой)', () => {
    const parsed = parseNotification({
      ...incoming,
      messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://max.ru' } },
    });
    expect(parsed?.text).toBe('https://max.ru');
  });

  it('пропускает статусы, файлы и групповые чаты', () => {
    expect(parseNotification({ typeWebhook: 'outgoingMessageStatus', idMessage: '1' })).toBeNull();
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged', stateInstance: 'authorized' })).toBeNull();
    expect(parseNotification({ ...incoming, messageData: { typeMessage: 'imageMessage' } })).toBeNull();
    expect(
      parseNotification({ ...incoming, senderData: { ...incoming.senderData!, chatId: '-1000', chatType: 'group' } }),
    ).toBeNull();
  });
});
