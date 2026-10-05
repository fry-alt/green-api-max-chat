import type { NotificationBody } from '../api/types';

export interface ParsedMessage {
  chatId: string;
  chatTitle: string;
  phone?: string;
  id: string;
  text: string;
  direction: 'in' | 'out';
  timestamp: number; // мс
}

// Входящее сообщение, отправленное с телефона/веб-версии MAX и отправленное через API.
// Последнее нужно, чтобы видеть сообщения, отправленные из другой вкладки или программы.
const DIRECTION: Record<string, ParsedMessage['direction']> = {
  incomingMessageReceived: 'in',
  outgoingMessageReceived: 'out',
  outgoingAPIMessageReceived: 'out',
};

// Достаёт из уведомления текстовое сообщение личного чата.
// Всё остальное (статусы, файлы, группы) приложение не показывает — возвращает null.
export function parseNotification(body: NotificationBody): ParsedMessage | null {
  const direction = DIRECTION[body.typeWebhook];
  if (!direction || !body.senderData || !body.messageData || !body.idMessage) return null;
  if (body.senderData.chatType === 'group') return null;

  const text = extractText(body.messageData);
  if (text === null) return null;

  const s = body.senderData;
  const phone = s.senderPhoneNumber ? String(s.senderPhoneNumber) : undefined;
  return {
    chatId: String(s.chatId),
    // Для исходящих senderName — это мы сами, поэтому имя собеседника берём из chatName
    chatTitle: s.chatName || (direction === 'in' ? s.senderContactName || s.senderName : '') || '',
    // Номер в senderData — номер отправителя, для исходящих это наш собственный
    phone: direction === 'in' ? phone : undefined,
    id: body.idMessage,
    text,
    direction,
    timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
  };
}

function extractText(data: NonNullable<NotificationBody['messageData']>): string | null {
  if (data.typeMessage === 'textMessage') return data.textMessageData?.textMessage ?? null;
  // Текст со ссылкой или с цитатой приходит как extendedTextMessage / quotedMessage
  if (data.typeMessage === 'extendedTextMessage' || data.typeMessage === 'quotedMessage') {
    return data.extendedTextMessageData?.text ?? data.textMessageData?.textMessage ?? null;
  }
  return null;
}
