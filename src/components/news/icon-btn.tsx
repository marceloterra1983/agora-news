import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactElement,
} from "react";
import { cloneElement } from "react";

export const tapIcon =
  "grid size-[44px] shrink-0 place-items-center rounded-full";

const BASE =
  `${tapIcon} border border-line text-ink transition-colors hover:bg-paper-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50`;

export function Tip({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ title?: string; "aria-label"?: string }>;
}) {
  return cloneElement(children, {
    "aria-label": children.props["aria-label"] ?? label,
  });
}

export function IconBtn({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        className={`${BASE}${className ? ` ${className}` : ""}`}
        {...props}
      >
        {children}
      </button>
    </Tip>
  );
}

export function IconLink({
  label,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string }) {
  return (
    <Tip label={label}>
      <a
        aria-label={label}
        className={`${BASE}${className ? ` ${className}` : ""}`}
        {...props}
      >
        {children}
      </a>
    </Tip>
  );
}

export const iconBtnSolid =
  "!border-ink !bg-ink !text-paper hover:!bg-ink-soft hover:!text-paper";
