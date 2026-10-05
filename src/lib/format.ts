const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });

const dayStart = (ts: number) => new Date(ts).setHours(0, 0, 0, 0);

export const formatTime = (ts: number) => timeFormat.format(ts);

// В списке чатов: время для сегодняшних, дата для остальных
export function formatListTime(ts: number, now = Date.now()): string {
  return dayStart(ts) === dayStart(now) ? formatTime(ts) : shortDateFormat.format(ts);
}

export function formatDay(ts: number, now = Date.now()): string {
  const diff = Math.round((dayStart(now) - dayStart(ts)) / 86_400_000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return dateFormat.format(ts);
}

export const isSameDay = (a: number, b: number) => dayStart(a) === dayStart(b);
