// Иконки нарисованы вручную, чтобы не тянуть библиотеку ради пяти значков

interface IconProps {
  className?: string;
}

export function Logo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" width="56" height="56" aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00b8ff" />
          <stop offset="1" stopColor="#b210db" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-gradient)" />
      <path
        d="M9 22V10l7 7 7-7v12"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const SendIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
  </svg>
);

export const BackIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const LogoutIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
  </svg>
);

export const PlusIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// Статусы сообщения: часы — отправляется, галочка — принято сервером
export const ClockIcon = ({ className }: IconProps) => (
  <svg {...base} width={14} height={14} className={className}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 2" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg {...base} width={14} height={14} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
