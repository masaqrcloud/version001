"use client";

export function GoogleJoinButton({
  href,
  label,
  disabled,
  className = "",
}: {
  href: string;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={`google-join ${className}`.trim()}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
    >
      <span className="google-join-icon" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path
            fill="#4285F4"
            d="M23.5 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.56-5.17 3.56-8.74Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.95-2.99l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.19A7.2 7.2 0 0 1 4.89 12c0-.76.13-1.5.38-2.19V6.7H1.27A12 12 0 0 0 0 12c0 1.94.46 3.78 1.27 5.3l4-3.11Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.14 15.23 0 12 0 7.31 0 3.26 2.69 1.27 6.7l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
          />
        </svg>
      </span>
      <span>{label}</span>
    </a>
  );
}
