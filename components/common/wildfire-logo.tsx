import type { ReactElement } from "react";

function WildfireLogo({ className }: { className?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 448 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill="currentColor">
        {/* W */}
        <path d="M0 20h14l16 44 16-44h12l16 44 16-44h14L80 82H66L52 42 38 82H24L0 20z" />
        {/* I - stem */}
        <path d="M108 32h14v50h-14z" />
        {/* I - flame dot accent */}
        <path d="M115 3c0 0-8 8-8 14 0 5 3.5 8 8 8s8-3 8-8c0-6-8-14-8-14z" />
        {/* L */}
        <path d="M136 20h14v48h30v14h-44z" />
        {/* D */}
        <path d="M190 20h28c22 0 38 14 38 31v0c0 17-16 31-38 31h-28V20zm14 14v34h14c14 0 24-8 24-17v0c0-9-10-17-24-17h-14z" />
        {/* F */}
        <path d="M268 20h44v14h-30v14h26v14h-26v20h-14z" />
        {/* I - stem */}
        <path d="M322 32h14v50h-14z" />
        {/* I - flame dot accent */}
        <path d="M329 3c0 0-8 8-8 14 0 5 3.5 8 8 8s8-3 8-8c0-6-8-14-8-14z" />
        {/* R */}
        <path d="M348 20h30c16 0 22 10 22 20v0c0 10-6 16-14 18l18 24h-16l-16-22h-10v22h-14V20zm14 14v14h14c6 0 10-3 10-7v0c0-4-4-7-10-7h-14z" />
        {/* E */}
        <path d="M400 20h44v14h-30v12h26v14h-26v12h30v14h-44z" />
      </g>
    </svg>
  );
}

export { WildfireLogo };
