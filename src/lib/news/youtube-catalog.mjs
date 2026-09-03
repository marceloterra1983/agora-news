/** Catálogo seed de canais do YouTube */

export const MAX_YOUTUBE_ITEMS = 10;

export const YOUTUBE_SEED = [
  {
    channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
    title: "OpenAI",
    section: "ai",
    group: "labs",
    account: "y_bdebf4a1823d",
  },
  {
    channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCP7jMXSY2xbc3KCAE0MHQ-A",
    title: "Google DeepMind",
    section: "ai",
    group: "labs",
    account: "y_3d00e486280b",
  },
  {
    channelId: "UCbfYPyITQ-7l4upoX8nvctg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg",
    title: "Two Minute Papers",
    section: "ai",
    group: "creators",
    account: "y_434c876fd910",
  },
  {
    channelId: "UCsBjURrPoezykLs9EqgamOA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA",
    title: "Fireship",
    section: "tech",
    group: "creators",
    account: "y_aed40adb51dd",
  },
  {
    channelId: "UCBJycsmduvYEL83R_U4JriQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ",
    title: "Marques Brownlee",
    section: "tech",
    group: "creators",
    account: "y_c042af24ad7d",
  },
  {
    channelId: "UCHnyfMqiRRG1u-2MsSQLbXA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA",
    title: "Veritasium",
    section: "tech",
    group: "ciencia",
    account: "y_fb133728b2ee",
  },
  {
    channelId: "UCKHhA5hN2UohhFDfNXB_cvQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCKHhA5hN2UohhFDfNXB_cvQ",
    title: "Manual do Mundo",
    section: "brasil",
    group: "ciencia",
    account: "y_6f68d1502930",
  },
];

export function youtubeGroupFor(section) {
  if (section === "tech") return "tech-video";
  if (section === "brasil") return "br-video";
  return "ai-video";
}

export function youtubeSeedHit(account) {
  const key = String(account || "").replace(/^@+/, "").trim().toLowerCase();
  return YOUTUBE_SEED.find((row) => String(row.account || "").toLowerCase() === key);
}

export function youtubeLabelFor(account) {
  return youtubeSeedHit(account)?.title || "YouTube";
}
