// Градиенты в духе аватарок MAX; цвет закреплён за чатом, чтобы не прыгал между рендерами
const GRADIENTS = [
  ['#00b8ff', '#007aff'],
  ['#b186ff', '#6965e5'],
  ['#ff9a4c', '#e64646'],
  ['#5af3c2', '#1abe43'],
  ['#f1b941', '#ff6f00'],
  ['#d5a5ff', '#a100f1'],
] as const;

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function initials(title: string): string {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/);
  const letters = words.filter((w) => /\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]);
  // Если имени нет, а есть только номер — показываем две последние цифры
  return (letters.length ? letters.join('') : title.replace(/\D/g, '').slice(-2)).toUpperCase();
}

interface Props {
  id: string;
  title: string;
  size?: number;
}

export function Avatar({ id, title, size = 48 }: Props) {
  const [from, to] = GRADIENTS[hash(id) % GRADIENTS.length]!;
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden="true"
    >
      {initials(title)}
    </div>
  );
}
