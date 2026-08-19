import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { ThemeMode } from "@/lib/news/theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: ReactNode }[] = [
  { id: "system", label: "Sistema", icon: <Monitor className="size-3.5" aria-hidden /> },
  { id: "light", label: "Claro", icon: <Sun className="size-3.5" aria-hidden /> },
  { id: "dark", label: "Escuro", icon: <Moon className="size-3.5" aria-hidden /> },
];

function SegmentedSwitch<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (id: T) => void;
  options: { id: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] text-mute">{label}</p>
      <div
        data-theme-switch=""
        className="grid grid-cols-3 gap-0.5 rounded-full bg-paper-2 p-0.5"
      >
        {options.map((opt) => {
          const on = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={on}
              aria-label={opt.label}
              onClick={() => onChange(opt.id)}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1 rounded-full text-[11px] font-semibold",
                on ? "bg-ink text-paper" : "text-mute",
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeSwitch({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (id: ThemeMode) => void;
}) {
  return (
    <SegmentedSwitch
      label="Tema"
      value={value}
      onChange={onChange}
      options={THEME_OPTIONS}
    />
  );
}

export function SettingsSection({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-mute">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SettingsChoice({
  active,
  onClick,
  label,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid min-h-11 place-items-center rounded-md border px-2 py-2 text-sm",
        active ? "border-ink bg-paper-2 text-ink" : "border-line text-mute",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SettingsToggle({
  on,
  onClick,
  title,
  hint,
  disabled,
  busy,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left last:border-0"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-mute">{hint}</span>
      </span>
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full", on ? "bg-ink" : "bg-paper-2")}>
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-paper",
            on ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function SettingsRow({
  title,
  hint,
  action,
  disabled,
}: {
  title: string;
  hint: string;
  action: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={action}
      disabled={disabled}
      className="flex w-full flex-col items-start border-b border-line py-3.5 text-left last:border-0 disabled:opacity-40"
    >
      <span className="text-sm text-ink">{title}</span>
      <span className="mt-0.5 text-xs text-mute">{hint}</span>
    </button>
  );
}
