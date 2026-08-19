import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function FontePostLink({
  href,
  className,
  children,
  testId,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  testId?: string;
}) {
  if (href.startsWith("/materia/")) {
    const id = decodeURIComponent(href.slice("/materia/".length).split(/[?#]/)[0] || "");
    if (id) {
      return (
        <Link to="/materia/$id" params={{ id }} className={className} data-testid={testId}>
          {children}
        </Link>
      );
    }
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={className}
      data-testid={testId}
    >
      {children}
    </a>
  );
}
