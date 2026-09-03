/** Catálogo seed de canais do YouTube e integração de fontes. */

export const MAX_YOUTUBE_ITEMS = 10;

export const YOUTUBE_SEED = [
  // IA
  {
    channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
    title: "OpenAI",
    section: "ai",
    group: "labs",
    account: "y_bdebf4a1823d",
    blurb: "Conta oficial da OpenAI. Demos, lançamentos de modelos e eventos de desenvolvedores.",
    avatar: "https://yt3.googleusercontent.com/MopgmVAFV9BqlzOJ-UINtmutvEPcNe5IbKMmP_4vZZo3vnJXcZGtybUBsXaEVxkmxKyGqX9R=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCP7jMXSY2xbc3KCAE0MHQ-A",
    title: "Google DeepMind",
    section: "ai",
    group: "labs",
    account: "y_3d00e486280b",
    blurb: "Pesquisa e modelos da DeepMind. Gemini, AlphaFold e avanços fundamentais de IA.",
    avatar: "https://yt3.googleusercontent.com/xofhdRNoyqgAB_YpJgAQeasGtE6gTEXpR2v1D14vLwI58K5wLOUeM8L8h2VebwZp5u7GZ1Q=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCrDwWp7EBBv4NwvScIpBDOA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrDwWp7EBBv4NwvScIpBDOA",
    title: "Anthropic",
    section: "ai",
    group: "labs",
    account: "y_b01b6db24262",
    blurb: "Pesquisa em alinhamento, IA constitucional e lançamentos do Claude.",
    avatar: "https://yt3.googleusercontent.com/ux-GXUpB4PkI-qXVOpj9gGEiCkytT0Q78ka4srlxOm_Y3m1gEh5qy8Vu6vTjGSDztMT0NybtC7I=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCXUPKJO5MZQN11PqgIvyuvQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXUPKJO5MZQN11PqgIvyuvQ",
    title: "Andrej Karpathy",
    section: "ai",
    group: "pesquisa",
    account: "y_1e520be6e017",
    blurb: "Ex-diretor de IA da Tesla e OpenAI. Aulas aprofundadas sobre arquitetura de redes e LLMs.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nDvyq2NoPL626bk1IbxQ94SfQs2qZ5-B_1u9zE3GjDkw=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCZHmQk67mSJgfCCTn7xBfew",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew",
    title: "Yannic Kilcher",
    section: "ai",
    group: "pesquisa",
    account: "y_e2e48136195f",
    blurb: "Walkthroughs minuciosos e análise crítica dos principais papers científicos de IA.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nqmmpWC-iPIeVF4grbJGcGmoWy2b-3aH9b3R7m7g=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCbfYPyITQ-7l4upoX8nvctg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg",
    title: "Two Minute Papers",
    section: "ai",
    group: "pesquisa",
    account: "y_434c876fd910",
    blurb: "Resumos visuais rápidos e precisos de pesquisas em computação gráfica e IA.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_ljAkSpv16cJNUsE_rI1X-Kz9s7Z5aC7c9A=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCYO_jab_esuFRV4b17AJtAw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw",
    title: "3Blue1Brown",
    section: "ai",
    group: "pesquisa",
    account: "y_454e29b5ecf6",
    blurb: "Intuição matemática visual sobre redes neurais, álgebra linear e cálculo.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nFzZFPLxPZRHcE3SSwzdrbuWqf8_j5qf8=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCNJ1Ymd5yFuUPtn21xtRbbw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw",
    title: "AI Explained",
    section: "ai",
    group: "imprensa",
    account: "y_0bc3661870ce",
    blurb: "Análise aprofundada de lançamentos, benchmarks e implicações de modelos de ponta.",
    avatar: "https://yt3.googleusercontent.com/GFuvgO3IZvs5XkYOxyLoWQto2lyY6-7Ob-7sE2Zk=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCMLtBahI5DMrt0NPvDSoIRQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMLtBahI5DMrt0NPvDSoIRQ",
    title: "Machine Learning Street Talk",
    section: "ai",
    group: "imprensa",
    account: "y_0765ad77052a",
    blurb: "Conversas longas e técnicas com grandes pesquisadores e filósofos da IA.",
    avatar: "https://yt3.googleusercontent.com/15Akj76BG8IsM5ctgqVwKXArl6IfIVFAbuGaUq-I=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCzi5kcwU8aT4aLR7LcYhfWQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCzi5kcwU8aT4aLR7LcYhfWQ",
    title: "Matthew Berman",
    section: "ai",
    group: "builders",
    account: "y_6f10a402c8cd",
    blurb: "Testes práticos de agentes de IA, modelos locais, open-source e automações.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nC6E4INV4ak3zzTSxuS2ZxWes3bZ5_K4E=s900-c-k-c0x00ffffff-no-rj",
  },

  // Tech
  {
    channelId: "UCsBjURrPoezykLs9EqgamOA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA",
    title: "Fireship",
    section: "tech",
    group: "tech-devs",
    account: "y_aed40adb51dd",
    blurb: "Vídeos rápidos de 100 segundos sobre ferramentas, linguagens e notícias de tecnologia.",
    avatar: "https://yt3.googleusercontent.com/3fPNbkf_xPyCleq77ZhcxyeorY97NtMHVNUbaAON_RBDH9ydL4hJkjxC8x_4mpuopkB8oI7Ct6Y=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCUyeluBRhGPCW4rPe_UvBZQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCUyeluBRhGPCW4rPe_UvBZQ",
    title: "The PrimeTime",
    section: "tech",
    group: "tech-devs",
    account: "y_c76182749393",
    blurb: "ThePrimeagen. Opiniões, arquitetura de sistemas e o dia a dia do ecossistema de software.",
    avatar: "https://yt3.googleusercontent.com/Eu_xR4JfLlrruwj1lrmfDiOpe8GARBs8M0hg5yJ_3F4=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC_ML5xP23TOWKUcc-oAE_Eg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_ML5xP23TOWKUcc-oAE_Eg",
    title: "Hussein Nasser",
    section: "tech",
    group: "tech-devs",
    account: "y_244f000d540c",
    blurb: "Engenharia de backend profunda: bancos de dados, proxies, protocolos HTTP e redes.",
    avatar: "https://yt3.googleusercontent.com/wdZxAigelIgebOT-NlWwVnvOijYuHttaa5jS7L4h=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCZgt6AzoyjslHTC9dz0UoTw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZgt6AzoyjslHTC9dz0UoTw",
    title: "ByteByteGo",
    section: "tech",
    group: "tech-devs",
    account: "y_174961750f1f",
    blurb: "Diagramas e conceitos visuais de arquitetura de sistemas distribuídos e alta escala.",
    avatar: "https://yt3.googleusercontent.com/ZDRUyBUwc2WXZzvNKP9VS9myI6Mg2puQLaWyJ5V=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCBJycsmduvYEL83R_U4JriQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ",
    title: "Marques Brownlee",
    section: "tech",
    group: "tech-gadgets",
    account: "y_c042af24ad7d",
    blurb: "MKBHD. Análises e reviews dos principais smartphones, hardware e eletrônicos.",
    avatar: "https://yt3.googleusercontent.com/qu4TmIaYUlS41-dJ9gZ7DUR3nilvmB5_11i6b8K=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCVYamHliCI9rw1tHR1xbkfw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCVYamHliCI9rw1tHR1xbkfw",
    title: "Dave2D",
    section: "tech",
    group: "tech-gadgets",
    account: "y_9248c1cf62da",
    blurb: "Reviews limpos e diretos de laptops, GPUs e hardware sem enrolação.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_lltZkOAE5XVIlI8U5QVXmdASgYuK9Z_1M=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCHnyfMqiRRG1u-2MsSQLbXA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA",
    title: "Veritasium",
    section: "tech",
    group: "tech-ciencia",
    account: "y_fb133728b2ee",
    blurb: "Vídeos sobre física, matemática, engenharia e experimentos científicos.",
    avatar: "https://yt3.googleusercontent.com/7vCbvtCqtjQ3YLgsJt7Y952MQV1sBvhllSCS5fG_3hA=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCsXVk37bltHxD1rDPwtNM8Q",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q",
    title: "Kurzgesagt",
    section: "tech",
    group: "tech-ciencia",
    account: "y_8cbd3eece02f",
    blurb: "Animações científicas sobre astronomia, tecnologia, energia e futuro da humanidade.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_n1Ribd7LwdP_qKtqWL3ZDfIgv9zE3Q=s900-c-k-c0x00ffffff-no-rj",
  },

  // Brasil
  {
    channelId: "UCKHhA5hN2UohhFDfNXB_cvQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCKHhA5hN2UohhFDfNXB_cvQ",
    title: "Manual do Mundo",
    section: "brasil",
    group: "br-ciencia",
    account: "y_6f68d1502930",
    blurb: "Experimentos, tecnologia, ciência prática e engenhocas com Iberê Thenório.",
    avatar: "https://yt3.googleusercontent.com/eeXFm7_mIItuMYmrE9HRFjtwjXEG6Qvs7yJTZBdHmNyFwbi1v28gDd3tQ9JjzsjE1lSTOtb_=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCn9Erjy00mpnWeLnRqhsA1g",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCn9Erjy00mpnWeLnRqhsA1g",
    title: "Ciência Todo Dia",
    section: "brasil",
    group: "br-ciencia",
    account: "y_c48cf9f15183",
    blurb: "Física, espaço e curiosidades científicas explicadas de forma didática por Pedro Loos.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_lQoeh3pIl35H0tiDQ6fG3YeSrn5aC=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UClu474HMt895mVxZdlIHXEA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UClu474HMt895mVxZdlIHXEA",
    title: "Nerdologia",
    section: "brasil",
    group: "br-ciencia",
    account: "y_dca8bec799f1",
    blurb: "Ciência, tecnologia e cultura pop explicadas por especialistas e referências.",
    avatar: "https://yt3.googleusercontent.com/8qsA80UNk6TB3_8ougMVFOblJ_0OWCWWytYe5E3Z=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCib793mnUOhWymCh2VJKplQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCib793mnUOhWymCh2VJKplQ",
    title: "Fábio Akita",
    section: "brasil",
    group: "tech-devs",
    account: "y_83cbea10449e",
    blurb: "Akitando. Ensaios aprofundados sobre computação, Unix, carreira técnica e história da tecnologia.",
    avatar: "https://yt3.googleusercontent.com/DnsLS63P8rHr4qdXZ9yuQTV4IkY8YBK1_pE24fG_=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCU5JicSrEM5A63jkJ2QvGYw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCU5JicSrEM5A63jkJ2QvGYw",
    title: "Filipe Deschamps",
    section: "brasil",
    group: "tech-devs",
    account: "y_e6b0ab678ab3",
    blurb: "Notícias para programadores, projetos práticos e discussões de tecnologia.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_l2dYLob_k5biaqXR_dOPX6yOtT3Z=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCFuIUoyHB12qpYa8Jpxoxow",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFuIUoyHB12qpYa8Jpxoxow",
    title: "Código Fonte TV",
    section: "brasil",
    group: "tech-devs",
    account: "y_db0119052ccb",
    blurb: "Gabriel e Vanessa falando sobre mercado de trabalho, programação e tecnologias.",
    avatar: "https://yt3.googleusercontent.com/2CkMHl_lxrIpACXMFUxU6rPiJ85SBGw7kG5S3E_1=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCEf5U1dB5a2e2S-XUlnhxSA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCEf5U1dB5a2e2S-XUlnhxSA",
    title: "Diolinux",
    section: "brasil",
    group: "tech-devs",
    account: "y_e83e7e79e62f",
    blurb: "Canal referência em Linux, código aberto, produtividade e hardware.",
    avatar: "https://yt3.googleusercontent.com/SLBk_zBM2dQJIt4YIzK6kMi2I3xyvSpDnxa64E=s900-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC_bXJnsgwOqEPA_-6N6faKw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_bXJnsgwOqEPA_-6N6faKw",
    title: "Canaltech",
    section: "brasil",
    group: "br-jornais",
    account: "y_bfcadd1ca989",
    blurb: "Noticiário diário das principais novidades de tecnologia, produtos e mercado.",
    avatar: "https://yt3.googleusercontent.com/LoKQuEeRQuLLhfqQ-cl-axuwQa51dFNnULEy5f=s900-c-k-c0x00ffffff-no-rj",
  },
];

export function youtubeGroupFor(section) {
  if (section === "tech") return "tech-devs";
  if (section === "brasil") return "br-ciencia";
  return "labs";
}

export function youtubeSeedHit(account) {
  const key = String(account || "").replace(/^@+/, "").trim().toLowerCase();
  return YOUTUBE_SEED.find((row) => String(row.account || "").toLowerCase() === key);
}

export function youtubeLabelFor(account) {
  return youtubeSeedHit(account)?.title || "YouTube";
}

export function youtubeAvatarFor(account) {
  return youtubeSeedHit(account)?.avatar || null;
}

export function youtubeExtrasFor(section) {
  const slug = String(section || "");
  return YOUTUBE_SEED.filter((row) => String(row.section || "") === slug).map((row) => ({
    handle: row.account,
    name: row.title,
    section: slug,
    group: row.group || youtubeGroupFor(slug),
    url: row.url,
    channelId: row.channelId,
    blurb: row.blurb || "",
    avatar: row.avatar || null,
  }));
}

export function youtubeFonteRow(p) {
  const handle = String(p?.account || p?.handle || "").replace(/^@+/, "");
  const channelId = String(p?.channelId || "");
  const siteUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : "https://www.youtube.com";
  const avatar = p?.avatar || youtubeAvatarFor(handle) || "https://www.google.com/s2/favicons?sz=64&domain=youtube.com";
  return {
    handle,
    name: String(p?.title || p?.name || handle),
    group: String(p?.group || "novos"),
    followers: 0,
    verified: false,
    avatar,
    bio: String(p?.blurb || p?.bio || "Canal no YouTube."),
    siteUrl,
    lastPost: null,
    lastPosts: [],
    inFeed: 0,
    articles: 0,
    longform: 0,
    likes: 0,
    engagement: 0,
    views: 0,
    er: 0,
  };
}

export function mergeYouTubeFontes(base, section) {
  if (!Array.isArray(base)) return [];
  const slug = String(section || "");
  const seen = new Set(base.map((row) => String(row?.handle || "").toLowerCase()));
  const added = youtubeExtrasFor(slug)
    .filter((row) => !seen.has(row.handle.toLowerCase()))
    .map(youtubeFonteRow);
  return added.length ? [...base, ...added] : base;
}
