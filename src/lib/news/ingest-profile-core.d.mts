export function profileFieldsFromAuthor(
  handle: string,
  author?: {
    screen_name?: string;
    name?: string;
    description?: string | null;
    avatar_url?: string | null;
    followers?: number;
  } | null,
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
