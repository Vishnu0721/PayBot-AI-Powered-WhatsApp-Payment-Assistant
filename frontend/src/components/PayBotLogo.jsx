const sizes = {
  sm: { box: 22, radius: 6, word: 'text-[15px]' },
  md: { box: 28, radius: 7, word: 'text-lg' },
  lg: { box: 36, radius: 9, word: 'text-2xl' },
  xl: { box: 56, radius: 8, word: 'text-3xl' },
  hero: { box: 168, radius: 8, word: 'text-4xl' },
};

export default function PayBotLogo({
  size = 'md',
  iconOnly = false,
  variant = 'dark',
  className = '',
}) {
  const s = sizes[size] || sizes.md;
  const light = variant === 'light';
  const word = light ? 'text-white' : 'text-ink';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={s.box}
        height={s.box}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="32"
          height="32"
          rx={s.radius + 1}
          fill={light ? '#F4FBF7' : '#0C3B2E'}
        />
        <path
          d="M8.5 11.2c0-1.3 1.05-2.35 2.35-2.35h7.8c1.3 0 2.35 1.05 2.35 2.35v6.1c0 1.3-1.05 2.35-2.35 2.35h-3.05L11.2 22.4v-2.75h-.35C9.55 19.65 8.5 18.6 8.5 17.3v-6.1Z"
          fill={light ? '#0C3B2E' : 'white'}
        />
        <path
          d="M13.15 14.05h5.7M13.15 16.55h3.6"
          stroke={light ? '#F4FBF7' : '#0C3B2E'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="23.4" cy="22.6" r="4.1" fill={light ? '#0E7A57' : '#3DDC97'} />
        <path
          d="M21.7 22.65 22.95 23.9 25.2 21.4"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span className={`font-semibold tracking-tight leading-none ${s.word} ${word}`}>
          PayBot
        </span>
      )}
    </span>
  );
}
