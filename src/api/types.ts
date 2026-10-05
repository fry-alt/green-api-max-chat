// Типы ответов GREEN-API (v3, мессенджер MAX) — только поля, которые использует приложение.
// Документация: https://green-api.com/v3/docs/

export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword';

export interface InstanceSettings {
  wid?: string;
  webhookUrl?: string;
  incomingWebhook?: 'yes' | 'no';
  outgoingMessageWebhook?: 'yes' | 'no';
  outgoingAPIMessageWebhook?: 'yes' | 'no';
}

export interface CheckAccountResult {
  exist: boolean;
  chatId: string;
}

export interface SendMessageResult {
  idMessage: string;
}

export interface SenderData {
  chatId: string;
  chatName?: string;
  chatType?: 'user' | 'group';
  sender?: string;
  senderName?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage: string };
  extendedTextMessageData?: { text: string };
}

// Уведомление из очереди. Тип зависит от typeWebhook; сообщения содержат senderData и messageData.
export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: SenderData;
  messageData?: MessageData;
  stateInstance?: InstanceState;
}

export interface ReceivedNotification {
  receiptId: number;
  body: NotificationBody;
}
