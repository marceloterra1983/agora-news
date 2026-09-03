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
  },
  {
    channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCP7jMXSY2xbc3KCAE0MHQ-A",
    title: "Google DeepMind",
    section: "ai",
    group: "labs",
    account: "y_3d00e486280b",
    blurb: "Pesquisa e modelos da DeepMind. Gemini, AlphaFold e avanços fundamentais de IA.",
  },
  {
    channelId: "UCrDwWp7EBBv4NwvScIpBDOA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrDwWp7EBBv4NwvScIpBDOA",
    title: "Anthropic",
    section: "ai",
    group: "labs",
    account: "y_b01b6db24262",
    blurb: "Pesquisa em alinhamento, IA constitucional e lançamentos do Claude.",
  },
  {
    channelId: "UCXUPKJO5MZQN11PqgIvyuvQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXUPKJO5MZQN11PqgIvyuvQ",
    title: "Andrej Karpathy",
    section: "ai",
    group: "pesquisa",
    account: "y_1e520be6e017",
    blurb: "Ex-diretor de IA da Tesla e OpenAI. Aulas aprofundadas sobre arquitetura de redes e LLMs.",
  },
  {
    channelId: "UCZHmQk67mSJgfCCTn7xBfew",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew",
    title: "Yannic Kilcher",
    section: "ai",
    group: "pesquisa",
    account: "y_e2e48136195f",
    blurb: "Walkthroughs minuciosos e análise crítica dos principais papers científicos de IA.",
  },
  {
    channelId: "UCbfYPyITQ-7l4upoX8nvctg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg",
    title: "Two Minute Papers",
    section: "ai",
    group: "pesquisa",
    account: "y_434c876fd910",
    blurb: "Resumos visuais rápidos e precisos de pesquisas em computação gráfica e IA.",
  },
  {
    channelId: "UCYO_jab_esuFRV4b17AJtAw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw",
    title: "3Blue1Brown",
    section: "ai",
    group: "pesquisa",
    account: "y_454e29b5ecf6",
    blurb: "Intuição matemática visual sobre redes neurais, álgebra linear e cálculo.",
  },
  {
    channelId: "UCNJ1Ymd5yFuUPtn21xtRbbw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw",
    title: "AI Explained",
    section: "ai",
    group: "imprensa",
    account: "y_0bc3661870ce",
    blurb: "Análise aprofundada de lançamentos, benchmarks e implicações de modelos de ponta.",
  },
  {
    channelId: "UCMLtBahI5DMrt0NPvDSoIRQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMLtBahI5DMrt0NPvDSoIRQ",
    title: "Machine Learning Street Talk",
    section: "ai",
    group: "imprensa",
    account: "y_0765ad77052a",
    blurb: "Conversas longas e técnicas com grandes pesquisadores e filósofos da IA.",
  },
  {
    channelId: "UCzi5kcwU8aT4aLR7LcYhfWQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCzi5kcwU8aT4aLR7LcYhfWQ",
    title: "Matthew Berman",
    section: "ai",
    group: "builders",
    account: "y_6f10a402c8cd",
    blurb: "Testes práticos de agentes de IA, modelos locais, open-source e automações.",
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
  },
  {
    channelId: "UCUyeluBRhGPCW4rPe_UvBZQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCUyeluBRhGPCW4rPe_UvBZQ",
    title: "The PrimeTime",
    section: "tech",
    group: "tech-devs",
    account: "y_c76182749393",
    blurb: "ThePrimeagen. Opiniões, arquitetura de sistemas e o dia a dia do ecossistema de software.",
  },
  {
    channelId: "UC_ML5xP23TOWKUcc-oAE_Eg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_ML5xP23TOWKUcc-oAE_Eg",
    title: "Hussein Nasser",
    section: "tech",
    group: "tech-devs",
    account: "y_244f000d540c",
    blurb: "Engenharia de backend profunda: bancos de dados, proxies, protocolos HTTP e redes.",
  },
  {
    channelId: "UCZgt6AzoyjslHTC9dz0UoTw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZgt6AzoyjslHTC9dz0UoTw",
    title: "ByteByteGo",
    section: "tech",
    group: "tech-devs",
    account: "y_174961750f1f",
    blurb: "Diagramas e conceitos visuais de arquitetura de sistemas distribuídos e alta escala.",
  },
  {
    channelId: "UCBJycsmduvYEL83R_U4JriQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ",
    title: "Marques Brownlee",
    section: "tech",
    group: "tech-gadgets",
    account: "y_c042af24ad7d",
    blurb: "MKBHD. Análises e reviews dos principais smartphones, hardware e eletrônicos.",
  },
  {
    channelId: "UCVYamHliCI9rw1tHR1xbkfw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCVYamHliCI9rw1tHR1xbkfw",
    title: "Dave2D",
    section: "tech",
    group: "tech-gadgets",
    account: "y_9248c1cf62da",
    blurb: "Reviews limpos e diretos de laptops, GPUs e hardware sem enrolação.",
  },
  {
    channelId: "UCHnyfMqiRRG1u-2MsSQLbXA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA",
    title: "Veritasium",
    section: "tech",
    group: "tech-ciencia",
    account: "y_fb133728b2ee",
    blurb: "Vídeos sobre física, matemática, engenharia e experimentos científicos.",
  },
  {
    channelId: "UCsXVk37bltHxD1rDPwtNM8Q",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q",
    title: "Kurzgesagt",
    section: "tech",
    group: "tech-ciencia",
    account: "y_8cbd3eece02f",
    blurb: "Animações científicas sobre astronomia, tecnologia, energia e futuro da humanidade.",
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
  },
  {
    channelId: "UCn9Erjy00mpnWeLnRqhsA1g",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCn9Erjy00mpnWeLnRqhsA1g",
    title: "Ciência Todo Dia",
    section: "brasil",
    group: "br-ciencia",
    account: "y_c48cf9f15183",
    blurb: "Física, espaço e curiosidades científicas explicadas de forma didática por Pedro Loos.",
  },
  {
    channelId: "UClu474HMt895mVxZdlIHXEA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UClu474HMt895mVxZdlIHXEA",
    title: "Nerdologia",
    section: "brasil",
    group: "br-ciencia",
    account: "y_dca8bec799f1",
    blurb: "Ciência, tecnologia e cultura pop explicadas por especialistas e referências.",
  },
  {
    channelId: "UCib793mnUOhWymCh2VJKplQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCib793mnUOhWymCh2VJKplQ",
    title: "Fábio Akita",
    section: "brasil",
    group: "tech-devs",
    account: "y_83cbea10449e",
    blurb: "Akitando. Ensaios aprofundados sobre computação, Unix, carreira técnica e história da tecnologia.",
  },
  {
    channelId: "UCU5JicSrEM5A63jkJ2QvGYw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCU5JicSrEM5A63jkJ2QvGYw",
    title: "Filipe Deschamps",
    section: "brasil",
    group: "tech-devs",
    account: "y_e6b0ab678ab3",
    blurb: "Notícias para programadores, projetos práticos e discussões de tecnologia.",
  },
  {
    channelId: "UCFuIUoyHB12qpYa8Jpxoxow",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFuIUoyHB12qpYa8Jpxoxow",
    title: "Código Fonte TV",
    section: "brasil",
    group: "tech-devs",
    account: "y_db0119052ccb",
    blurb: "Gabriel e Vanessa falando sobre mercado de trabalho, programação e tecnologias.",
  },
  {
    channelId: "UCEf5U1dB5a2e2S-XUlnhxSA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCEf5U1dB5a2e2S-XUlnhxSA",
    title: "Diolinux",
    section: "brasil",
    group: "tech-devs",
    account: "y_e83e7e79e62f",
    blurb: "Canal referência em Linux, código aberto, produtividade e hardware.",
  },
  {
    channelId: "UC_bXJnsgwOqEPA_-6N6faKw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_bXJnsgwOqEPA_-6N6faKw",
    title: "Canaltech",
    section: "brasil",
    group: "br-jornais",
    account: "y_bfcadd1ca989",
    blurb: "Noticiário diário das principais novidades de tecnologia, produtos e mercado.",
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
  }));
}

export function youtubeFonteRow(p) {
  const handle = String(p?.account || p?.handle || "").replace(/^@+/, "");
  const channelId = String(p?.channelId || "");
  const siteUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : "https://www.youtube.com";
  return {
    handle,
    name: String(p?.title || p?.name || handle),
    group: String(p?.group || "novos"),
    followers: 0,
    verified: false,
    avatar: "https://www.google.com/s2/favicons?sz=64&domain=youtube.com",
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
