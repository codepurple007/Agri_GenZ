import type { SVGAttributes } from "react";

/** Brand mark — paths aligned with `public/favicon.svg` (vector, not emoji). */
export function AgriServiceLogo({ size = 36, ...rest }: SVGAttributes<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      {...rest}
    >
      <rect width="64" height="64" rx="14" fill="#1b4332" />
      <path d="M18 42c4-12 10-22 18-26 6 8 8 18 10 26H18z" fill="#95d5b2" />
      <path d="M28 38c3-8 8-14 14-16 3 5 4 11 5 16H28z" fill="#d8f3dc" />
      <circle cx="44" cy="22" r="5" fill="#40916c" />
    </svg>
  );
}
