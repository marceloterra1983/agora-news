export type Status = {
  id?: string;
  text?: string;
  url?: string;
  created_timestamp?: number;
  created_at?: string;
  replying_to?: unknown;
  quote?: { id?: string; text?: string; author?: { screen_name?: string } };
  retweet?: { id?: string; text?: string; author?: { screen_name?: string } };
  card?: { title?: string };
  article?: { id?: string; title?: string };
  media?: {
    photos?: Array<{ url?: string }>;
    videos?: Array<{ thumbnail_url?: string | null; url?: string }>;
  };
  author?: {
    screen_name?: string;
    name?: string;
    description?: string | null;
    avatar_url?: string | null;
    followers?: number;
  };
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: JsonObject, key: string): boolean {
  return value[key] === undefined || typeof value[key] === "string";
}

function nullableString(value: JsonObject, key: string): boolean {
  return value[key] === null || optionalString(value, key);
}

function validAuthor(value: unknown): boolean {
  return (
    value === undefined ||
    (isObject(value) &&
      optionalString(value, "screen_name") &&
      optionalString(value, "name") &&
      nullableString(value, "description") &&
      nullableString(value, "avatar_url") &&
      (value.followers === undefined ||
        (typeof value.followers === "number" && Number.isFinite(value.followers))))
  );
}

function validQuoted(value: unknown): boolean {
  return (
    value === undefined ||
    (isObject(value) &&
      optionalString(value, "id") &&
      optionalString(value, "text") &&
      validAuthor(value.author))
  );
}

function validMedia(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isObject(value)) return false;
  for (const key of ["photos", "videos"]) {
    const items = value[key];
    if (
      items !== undefined &&
      (!Array.isArray(items) ||
        !items.every(
          (item) =>
            isObject(item) &&
            optionalString(item, "url") &&
            nullableString(item, "thumbnail_url"),
        ))
    ) {
      return false;
    }
  }
  return true;
}

function validStatus(value: unknown): value is Status {
  if (!isObject(value)) return false;
  const timestamp = value.created_timestamp;
  const createdAt = value.created_at;
  const validTime =
    (typeof timestamp === "number" &&
      Number.isFinite(timestamp) &&
      Number.isFinite(new Date(timestamp * 1000).getTime())) ||
    (typeof createdAt === "string" && Number.isFinite(Date.parse(createdAt)));
  return (
    typeof value.id === "string" &&
    /^\d{1,30}$/.test(value.id) &&
    typeof value.text === "string" &&
    validTime &&
    optionalString(value, "url") &&
    validQuoted(value.quote) &&
    validQuoted(value.retweet) &&
    validMedia(value.media) &&
    validAuthor(value.author) &&
    (value.card === undefined ||
      (isObject(value.card) && optionalString(value.card, "title"))) &&
    (value.article === undefined ||
      (isObject(value.article) &&
        optionalString(value.article, "id") &&
        optionalString(value.article, "title")))
  );
}

export function statusesFromPayload(value: unknown): Status[] | null {
  if (!isObject(value) || !Array.isArray(value.results)) return null;
  return value.results.every(validStatus) ? value.results : null;
}
