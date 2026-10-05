// GREEN-API для MAX принимает номера только РФ (7…, 11 цифр) и РБ (375…, 12 цифр)

export type PhoneResult = { ok: true; phone: string } | { ok: false; error: string };

export function normalizePhone(input: string): PhoneResult {
  let digits = input.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Введите номер телефона' };

  // Российский номер часто пишут через 8: 8 999 123-45-67
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  // …или без кода страны: 999 123-45-67
  if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`;

  if (digits.length === 11 && digits.startsWith('7')) return { ok: true, phone: digits };
  if (digits.length === 12 && digits.startsWith('375')) return { ok: true, phone: digits };

  return { ok: false, error: 'Нужен номер РФ (+7) или Беларуси (+375)' };
}

export function formatPhone(phone: string): string {
  if (phone.length === 11 && phone.startsWith('7')) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`;
  }
  if (phone.length === 12 && phone.startsWith('375')) {
    return `+375 ${phone.slice(3, 5)} ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10)}`;
  }
  return `+${phone}`;
}
