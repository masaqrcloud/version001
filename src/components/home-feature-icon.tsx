import type { ReactNode } from "react";

type IconName =
  | "allergen"
  | "print"
  | "bolt"
  | "hygiene"
  | "screens"
  | "floor"
  | "stock"
  | "wifi"
  | "qr"
  | "cart";

const paths: Record<IconName, ReactNode> = {
  allergen: (
    <>
      <path d="M12 3.5c.8 2.4 1.2 4.2 1.2 6.2 0 2.4-1.2 4.3-3.2 4.3S6.8 12.1 6.8 9.7c0-2 .4-3.8 1.2-6.2" />
      <path d="M12 20.5c2.6-1.4 4.4-3.6 4.4-6.6 0-1.4-.3-2.7-.8-3.9" />
      <path d="M8.4 10.2c.5 1.6 1.4 2.6 2.6 2.6" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V4.5h10V9" />
      <rect x="5" y="9" width="14" height="7" rx="1.5" />
      <path d="M8 16v3.5h8V16" />
      <path d="M15 12h2" />
    </>
  ),
  bolt: (
    <path d="M13 3.5 7.5 13h4.2L11 20.5 16.5 11h-4.2L13 3.5Z" />
  ),
  hygiene: (
    <>
      <rect x="8" y="3.5" width="8" height="14" rx="2" />
      <path d="M10 17.5h4V20a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2.5Z" />
      <path d="M11 7h2M11 10h2" />
    </>
  ),
  screens: (
    <>
      <rect x="3.5" y="5" width="10" height="8" rx="1.2" />
      <rect x="10.5" y="10" width="10" height="7" rx="1.2" />
      <path d="M7 16.5h2.5" />
    </>
  ),
  floor: (
    <>
      <rect x="4" y="5" width="6.5" height="5" rx="1" />
      <rect x="13.5" y="5" width="6.5" height="5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="5.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="5.5" rx="1" />
    </>
  ),
  stock: (
    <>
      <path d="M4.5 8.5 12 4.5l7.5 4v8L12 20.5 4.5 16.5v-8Z" />
      <path d="M12 12v8.5M4.5 8.5 12 12l7.5-3.5" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 9.2a10 10 0 0 1 14 0" />
      <path d="M7.8 12a6 6 0 0 1 8.4 0" />
      <path d="M10.5 14.8a2.4 2.4 0 0 1 3 0" />
      <circle cx="12" cy="18" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <path d="M13.5 13.5h2.5V16H19v4h-2.5v-2.5H13.5V13.5Z" />
      <path d="M6.2 6.2h2.2v2.2H6.2V6.2Zm9.5 0h2.2v2.2h-2.2V6.2ZM6.2 15.7h2.2v2.2H6.2v-2.2Z" />
    </>
  ),
  cart: (
    <>
      <path d="M4 5.5h1.8l1.4 9.2h9.8l1.6-6.4H7.2" />
      <circle cx="9.2" cy="18.2" r="1.2" />
      <circle cx="15.8" cy="18.2" r="1.2" />
    </>
  ),
};

export function HomeFeatureIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <span className={className ?? "home-feature-icon"} aria-hidden>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </svg>
    </span>
  );
}

export type { IconName };
