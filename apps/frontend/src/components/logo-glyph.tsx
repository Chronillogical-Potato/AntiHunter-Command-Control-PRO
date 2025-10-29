interface LogoGlyphProps {
  className?: string;
}

export function LogoGlyph({ className }: LogoGlyphProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 82 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <g
        transform="translate(0,-10)"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M41 15 L9 26 V46 C9 68 24.5 87 41 91 C57.5 87 73 68 73 46 V26 L41 15 Z"
          strokeWidth="4.4"
          fill="none"
        />
        <path d="M26 52 L41 31 L56 52" strokeWidth="4.8" fill="none" />
        <circle cx="41" cy="60" r="4" fill="currentColor" />
      </g>
    </svg>
  );
}
