function LogoSymbol({ size = 32 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 8h38a5 5 0 015 5v25a5 5 0 01-5 5H27.5l-11.9 9.6A2 2 0 0112.4 51l1.6-8H13a5 5 0 01-5-5V13a5 5 0 015-5z"
        fill="#1F2A44"
      />
      <rect x="19" y="18.5" width="27" height="4.6" rx="2.3" fill="#0E7C66" />
      <rect x="19" y="28.5" width="16" height="4.6" rx="2.3" fill="#0E7C66" opacity="0.5" />
    </svg>
  );
}

export function Logo({
  size = 32,
  withWordmark = true,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoSymbol size={size} />
      {withWordmark && (
        <span
          className="font-[family-name:var(--font-space-grotesk)] font-bold tracking-tight text-[#1F2A44]"
          style={{ fontSize: size * 0.6 }}
        >
          Hubdesk
        </span>
      )}
    </span>
  );
}
