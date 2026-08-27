type TimelineAuthor = {
  screen_name?: string;
  name?: string;
  description?: string | null;
  avatar_url?: string | null;
  followers?: number;
};

type TimelineStatus = {
  id?: string;
  text?: string;
  author?: TimelineAuthor;
};

export function statusesOwnedByHandle<T extends TimelineStatus>(
  handle: string,
  statuses?: T[] | null,
): T[];

export function ownedAuthorFromStatuses(
  handle: string,
  statuses?: TimelineStatus[] | null,
): TimelineAuthor | null;

export function profileFieldsFromAuthor(
  handle: string,
  author?: TimelineAuthor | null,
  prev?: {
    name?: string;
    bio?: string;
    avatar?: string | null;
    followers?: number;
  },
): {
  name: string;
  bio: string;
  avatar: string | null;
  followers: number;
};
