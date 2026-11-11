import type { SVGProps } from 'react';

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function BasketIcon() {
  return (
    <Icon>
      <path d="M5 9h14l-1.3 9.1a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5 9Z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
    </Icon>
  );
}

export function PlusIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function MinusIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M5 12h14" />
    </Icon>
  );
}

export function TagIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M3.5 12.3V5a1.5 1.5 0 0 1 1.5-1.5h7.3a1.5 1.5 0 0 1 1 .4l7.3 7.3a1.5 1.5 0 0 1 0 2.1l-7.3 7.3a1.5 1.5 0 0 1-2.1 0l-7.3-7.3a1.5 1.5 0 0 1-.4-1Z" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </Icon>
  );
}

export function TruckIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M3 6.5h11v9H3zM14 9.5h3.6l3.4 3.4v2.6h-7" />
      <circle cx="7" cy="17.5" r="1.75" />
      <circle cx="17" cy="17.5" r="1.75" />
    </Icon>
  );
}

export function AlertIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </Icon>
  );
}
