import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const blockedList = new BlockList();

// IPv4 subnets
blockedList.addSubnet("0.0.0.0", 8, "ipv4");
blockedList.addSubnet("10.0.0.0", 8, "ipv4");
blockedList.addSubnet("100.64.0.0", 10, "ipv4");
blockedList.addSubnet("127.0.0.0", 8, "ipv4");
blockedList.addSubnet("169.254.0.0", 16, "ipv4");
blockedList.addSubnet("172.16.0.0", 12, "ipv4");
blockedList.addSubnet("192.168.0.0", 16, "ipv4");
blockedList.addSubnet("224.0.0.0", 4, "ipv4");
blockedList.addSubnet("240.0.0.0", 4, "ipv4");

// IPv6 subnets
blockedList.addSubnet("::1", 128, "ipv6");
blockedList.addSubnet("fc00::", 7, "ipv6");
blockedList.addSubnet("fe80::", 10, "ipv6");

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 0) return false;
  return blockedList.check(ip, version === 6 ? "ipv6" : "ipv4");
}

export async function assertSafeRssFetchUrl(raw: string): Promise<string> {
  const input = String(raw || "").trim();
  if (!/^https:\/\//i.test(input)) {
    throw new Error("rss_https_only");
  }
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("rss_url_invalid");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("rss_https_only");
  }
  if (parsed.username || parsed.password) {
    throw new Error("rss_url_invalid");
  }
  if (parsed.port && parsed.port !== "443" && parsed.port !== "8443") {
    throw new Error("rss_port_denied");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("rss_host_denied");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error("rss_ip_denied");
    }
    return parsed.href;
  }

  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("rss_dns_failed");
  }
  if (!addrs.length) {
    throw new Error("rss_dns_failed");
  }

  for (const { address, family } of addrs) {
    if (blockedList.check(address, family === 6 ? "ipv6" : "ipv4")) {
      throw new Error("rss_ip_denied");
    }
  }

  return parsed.href;
}

export async function safeRssFetch(
  url: string,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<Response> {
  let current = await assertSafeRssFetchUrl(url);
  let redirectsRemaining = maxRedirects;

  while (true) {
    const res = await fetch(current, {
      ...init,
      redirect: "manual",
    });

    const isRedirect =
      res.status === 301 ||
      res.status === 302 ||
      res.status === 303 ||
      res.status === 307 ||
      res.status === 308;

    if (!isRedirect) {
      return res;
    }

    if (redirectsRemaining <= 0) {
      throw new Error("rss_too_many_redirects");
    }
    redirectsRemaining -= 1;

    const location = res.headers.get("location");
    if (!location) {
      return res;
    }

    const nextUrl = new URL(location, current).href;
    current = await assertSafeRssFetchUrl(nextUrl);
  }
}
