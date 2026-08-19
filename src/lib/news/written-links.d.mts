export function normalizeWrittenHref(raw: string): string;
export function extractWrittenLinks(text: string): string[];
export function publishedLinksFrom(text: string, skipHref?: string | string[]): string[];
export function stripWrittenLinks(text: string): string;
export function writtenLinkHost(href: string): string;
