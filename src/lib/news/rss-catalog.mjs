/** Seed editorial. Contas pré-computadas (sha256 do URL canônico) para o client não importar crypto. */

export const MAX_RSS_ITEMS = 10;

export const RSS_SEED = [
  {
    url: "https://openai.com/news/rss.xml",
    title: "OpenAI",
    section: "ai",
    group: "labs",
    account: "r_bea4293d5edd",
  },
  {
    url: "https://huggingface.co/blog/feed.xml",
    title: "Hugging Face",
    section: "ai",
    group: "labs",
    account: "r_61d3148bc057",
  },
  {
    url: "https://deepmind.google/blog/rss.xml",
    title: "Google DeepMind",
    section: "ai",
    group: "labs",
    account: "r_9c92f29eb293",
  },
  {
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    title: "MIT Technology Review AI",
    section: "ai",
    group: "imprensa",
    account: "r_4d355be7e910",
  },
  {
    url: "https://importai.substack.com/feed",
    title: "Import AI",
    section: "ai",
    group: "imprensa",
    account: "r_0f90c142536d",
  },
  {
    url: "https://simonwillison.net/atom/everything/",
    title: "Simon Willison",
    section: "ai",
    group: "builders",
    account: "r_3733c65b9abe",
  },
  {
    url: "https://www.theverge.com/rss/index.xml",
    title: "The Verge",
    section: "tech",
    group: "tech-imprensa",
    account: "r_8eb61941edd3",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    title: "Ars Technica",
    section: "tech",
    group: "tech-imprensa",
    account: "r_7170fc473d11",
  },
  {
    url: "https://techcrunch.com/feed/",
    title: "TechCrunch",
    section: "tech",
    group: "tech-imprensa",
    account: "r_7c18f6f34132",
  },
  {
    url: "https://www.wired.com/feed/rss",
    title: "WIRED",
    section: "tech",
    group: "tech-imprensa",
    account: "r_bcd998793f0f",
  },
  {
    url: "https://krebsonsecurity.com/feed/",
    title: "KrebsOnSecurity",
    section: "tech",
    group: "tech-seguranca",
    account: "r_9f2d692b80a4",
  },
  {
    url: "https://github.blog/feed/",
    title: "GitHub Blog",
    section: "tech",
    group: "tech-devs",
    account: "r_f73fd9169bbe",
  },
  {
    url: "https://rss.tecmundo.com.br/feed",
    title: "TecMundo",
    section: "brasil",
    group: "br-jornais",
    account: "r_9c68d283ae03",
  },
  {
    url: "https://g1.globo.com/rss/g1/",
    title: "g1",
    section: "brasil",
    group: "br-jornais",
    account: "r_b4a0f604aed9",
  },
  {
    url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
    title: "Folha",
    section: "brasil",
    group: "br-jornais",
    account: "r_ce0d4980296c",
  },
  {
    url: "https://feeds.bbci.co.uk/portuguese/rss.xml",
    title: "BBC News Brasil",
    section: "brasil",
    group: "br-jornais",
    account: "r_c9bd5634cb80",
  },
  {
    url: "https://www.poder360.com.br/feed/",
    title: "Poder360",
    section: "brasil",
    group: "br-politica",
    account: "r_e7ace0e7fc6c",
  },
  {
    url: "https://feeds.folha.uol.com.br/mercado/rss091.xml",
    title: "Folha Mercado",
    section: "brasil",
    group: "br-economia",
    account: "r_8cfa711f4507",
  },
  {
    url: "https://canaltech.com.br/rss/",
    title: "Canaltech",
    section: "brasil",
    group: "br-jornais",
    account: "r_8a5737767f6a",
  },
  {
    url: "https://developer.nvidia.com/blog/feed/",
    title: "NVIDIA",
    section: "ai",
    group: "labs",
    account: "r_05298ef7ce15",
  },
  {
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    title: "AWS Machine Learning",
    section: "ai",
    group: "labs",
    account: "r_458f4ae1b0fe",
  },
  {
    url: "https://blog.google/technology/ai/rss/",
    title: "Google AI",
    section: "ai",
    group: "labs",
    account: "r_04a252572c9d",
  },
  {
    url: "https://research.google/blog/rss/",
    title: "Google Research",
    section: "ai",
    group: "pesquisa",
    account: "r_904f056d0b57",
  },
  {
    url: "https://ai.stanford.edu/blog/feed.xml",
    title: "Stanford AI Lab",
    section: "ai",
    group: "pesquisa",
    account: "r_53042e54e057",
  },
  {
    url: "https://www.interconnects.ai/feed",
    title: "Interconnects",
    section: "ai",
    group: "builders",
    account: "r_38bb04bcb74c",
  },
  {
    url: "https://www.latent.space/feed",
    title: "Latent Space",
    section: "ai",
    group: "imprensa",
    account: "r_5f96ca82b9e1",
  },
  {
    url: "https://www.oneusefulthing.org/feed",
    title: "One Useful Thing",
    section: "ai",
    group: "imprensa",
    account: "r_37ee50b515f9",
  },
  {
    url: "https://www.theregister.com/headlines.atom",
    title: "The Register",
    section: "tech",
    group: "tech-imprensa",
    account: "r_217ddb781732",
  },
  {
    url: "https://www.404media.co/rss/",
    title: "404 Media",
    section: "tech",
    group: "tech-imprensa",
    account: "r_b4799863715a",
  },
  {
    url: "https://www.engadget.com/rss.xml",
    title: "Engadget",
    section: "tech",
    group: "tech-gadgets",
    account: "r_aae61297d147",
  },
  {
    url: "https://9to5mac.com/feed/",
    title: "9to5Mac",
    section: "tech",
    group: "tech-gadgets",
    account: "r_bbbfa707e98d",
  },
  {
    url: "https://www.apple.com/newsroom/rss-feed.rss",
    title: "Apple Newsroom",
    section: "tech",
    group: "tech-empresas",
    account: "r_dfbca54d3720",
  },
  {
    url: "https://blog.google/rss/",
    title: "Google Blog",
    section: "tech",
    group: "tech-empresas",
    account: "r_f420170e7172",
  },
  {
    url: "https://blog.cloudflare.com/rss/",
    title: "Cloudflare",
    section: "tech",
    group: "tech-devs",
    account: "r_2f3b69ac7003",
  },
  {
    url: "https://www.bleepingcomputer.com/feed/",
    title: "BleepingComputer",
    section: "tech",
    group: "tech-seguranca",
    account: "r_50fbf262f48a",
  },
  {
    url: "https://www.cnnbrasil.com.br/feed/",
    title: "CNN Brasil",
    section: "brasil",
    group: "br-jornais",
    account: "r_4e2716087926",
  },
  {
    url: "https://www.nexojornal.com.br/rss.xml",
    title: "Nexo Jornal",
    section: "brasil",
    group: "br-colunistas",
    account: "r_6849184f5922",
  },
  {
    url: "https://www.jota.info/feed",
    title: "JOTA",
    section: "brasil",
    group: "br-politica",
    account: "r_92961d4095fc",
  },
  {
    url: "https://valor.globo.com/rss/valor",
    title: "Valor",
    section: "brasil",
    group: "br-economia",
    account: "r_826d58b51a2e",
  },
  {
    url: "https://exame.com/feed/",
    title: "Exame",
    section: "brasil",
    group: "br-economia",
    account: "r_440047ba7974",
  },
  {
    url: "https://agenciabrasil.ebc.com.br/rss.xml",
    title: "Agência Brasil",
    section: "brasil",
    group: "br-instituicoes",
    account: "r_4d56cd0d3616",
  },
  {
    url: "https://www12.senado.leg.br/noticias/rss",
    title: "Senado",
    section: "brasil",
    group: "br-instituicoes",
    account: "r_1b54d5c54093",
  },
  {
    url: "https://www.camara.leg.br/noticias/rss/ultimas-noticias",
    title: "Câmara",
    section: "brasil",
    group: "br-instituicoes",
    account: "r_bc6c322beddb",
  },
  {
    url: "https://mistral.ai/news/rss",
    title: "Mistral",
    section: "ai",
    group: "labs",
    account: "r_6c99bcc6780c",
  },
  {
    url: "https://the-decoder.com/feed/",
    title: "The Decoder",
    section: "ai",
    group: "imprensa",
    account: "r_05dcc2d9cd93",
  },
  {
    url: "https://www.platformer.news/feed",
    title: "Platformer",
    section: "ai",
    group: "imprensa",
    account: "r_e00c7e248848",
  },
  {
    url: "https://www.aisnakeoil.com/feed",
    title: "AI Snake Oil",
    section: "ai",
    group: "pesquisa",
    account: "r_f132c432a277",
  },
  {
    url: "https://lilianweng.github.io/index.xml",
    title: "Lilian Weng",
    section: "ai",
    group: "pesquisa",
    account: "r_c4683e6fa717",
  },
  {
    url: "https://thegradient.pub/rss/",
    title: "The Gradient",
    section: "ai",
    group: "imprensa",
    account: "r_3e6265e1f190",
  },
  {
    url: "https://venturebeat.com/category/ai/feed/",
    title: "VentureBeat AI",
    section: "ai",
    group: "imprensa",
    account: "r_39256bb1bf07",
  },
  {
    url: "https://www.microsoft.com/en-us/research/feed/",
    title: "Microsoft Research",
    section: "ai",
    group: "pesquisa",
    account: "r_8406f0532dc1",
  },
  {
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    title: "The Verge AI",
    section: "ai",
    group: "imprensa",
    account: "r_7999cc56576e",
  },
  {
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    title: "WIRED AI",
    section: "ai",
    group: "imprensa",
    account: "r_84e52e14c791",
  },
  {
    url: "https://arstechnica.com/ai/feed/",
    title: "Ars Technica AI",
    section: "ai",
    group: "imprensa",
    account: "r_1f367bf02912",
  },
  {
    url: "https://9to5google.com/feed/",
    title: "9to5Google",
    section: "tech",
    group: "tech-gadgets",
    account: "r_0ac90e462f09",
  },
  {
    url: "https://feeds.macrumors.com/MacRumors-All",
    title: "MacRumors",
    section: "tech",
    group: "tech-gadgets",
    account: "r_b5e99905f8a6",
  },
  {
    url: "https://www.cnet.com/rss/news/",
    title: "CNET",
    section: "tech",
    group: "tech-imprensa",
    account: "r_0590a2809287",
  },
  {
    url: "https://blogs.microsoft.com/feed/",
    title: "Microsoft Blog",
    section: "tech",
    group: "tech-empresas",
    account: "r_aabe72796b0b",
  },
  {
    url: "https://aws.amazon.com/blogs/aws/feed/",
    title: "AWS News",
    section: "tech",
    group: "tech-empresas",
    account: "r_017a74fc55c6",
  },
  {
    url: "https://stackoverflow.blog/feed/",
    title: "Stack Overflow",
    section: "tech",
    group: "tech-devs",
    account: "r_21549c0b576a",
  },
  {
    url: "https://daringfireball.net/feeds/main",
    title: "Daring Fireball",
    section: "tech",
    group: "tech-gadgets",
    account: "r_6eaf402c6927",
  },
  {
    url: "https://www.androidpolice.com/feed/",
    title: "Android Police",
    section: "tech",
    group: "tech-gadgets",
    account: "r_7cbe657321ce",
  },
  {
    url: "https://www.ycombinator.com/blog/rss",
    title: "Y Combinator",
    section: "tech",
    group: "tech-startups",
    account: "r_62e5656fc906",
  },
  {
    url: "https://www.sequoiacap.com/feed/",
    title: "Sequoia",
    section: "tech",
    group: "tech-startups",
    account: "r_38dc84176405",
  },
  {
    url: "https://github.blog/engineering/feed/",
    title: "GitHub Engineering",
    section: "tech",
    group: "tech-devs",
    account: "r_636f392f7cf6",
  },
  {
    url: "https://nextjs.org/feed.xml",
    title: "Next.js",
    section: "tech",
    group: "tech-devs",
    account: "r_00557911586e",
  },
  {
    url: "https://react.dev/rss.xml",
    title: "React",
    section: "tech",
    group: "tech-devs",
    account: "r_4d0d6458fb83",
  },
  {
    url: "https://nodejs.org/en/feed/blog.xml",
    title: "Node.js",
    section: "tech",
    group: "tech-devs",
    account: "r_81c31b07e539",
  },
  {
    url: "https://blog.cloudflare.com/tag/security/rss/",
    title: "Cloudflare Security",
    section: "tech",
    group: "tech-seguranca",
    account: "r_92a114c73b35",
  },
  {
    url: "https://engineering.fb.com/feed/",
    title: "Engineering at Meta",
    section: "tech",
    group: "tech-devs",
    account: "r_bc4d10019cb4",
  },
  {
    url: "https://blog.google/technology/developers/rss/",
    title: "Google Developers",
    section: "tech",
    group: "tech-devs",
    account: "r_eef3e0389991",
  },
  {
    url: "https://feeds.feedburner.com/TheHackersNews",
    title: "The Hacker News",
    section: "tech",
    group: "tech-seguranca",
    account: "r_636032c91a0b",
  },
  {
    url: "https://rss.uol.com.br/feed/noticias.xml",
    title: "UOL",
    section: "brasil",
    group: "br-jornais",
    account: "r_128202b93732",
  },
  {
    url: "https://rss.uol.com.br/feed/economia.xml",
    title: "UOL Economia",
    section: "brasil",
    group: "br-economia",
    account: "r_e0d5de43db4c",
  },
  {
    url: "https://www.infomoney.com.br/feed/",
    title: "InfoMoney",
    section: "brasil",
    group: "br-economia",
    account: "r_2bcaeeef1fd7",
  },
  {
    url: "https://www.congressoemfoco.com.br/feed/",
    title: "Congresso em Foco",
    section: "brasil",
    group: "br-politica",
    account: "r_e89bd33fca9c",
  },
  {
    url: "https://feeds.folha.uol.com.br/poder/rss091.xml",
    title: "Folha Poder",
    section: "brasil",
    group: "br-politica",
    account: "r_0eceb4e5679e",
  },
  {
    url: "https://www.intercept.com.br/feed/",
    title: "Intercept Brasil",
    section: "brasil",
    group: "br-politica",
    account: "r_27d0be251292",
  },
  {
    url: "https://piaui.uol.com.br/feed/",
    title: "piauí",
    section: "brasil",
    group: "br-colunistas",
    account: "r_2a71b6ffca19",
  },
  {
    url: "https://www.cartacapital.com.br/feed/",
    title: "CartaCapital",
    section: "brasil",
    group: "br-politica",
    account: "r_dd68631de528",
  },
  {
    url: "https://veja.abril.com.br/feed/",
    title: "VEJA",
    section: "brasil",
    group: "br-jornais",
    account: "r_fae663c3d7cf",
  },
  {
    url: "https://www.estadao.com.br/arc/outboundfeeds/rss/?outputType=xml",
    title: "Estadão",
    section: "brasil",
    group: "br-jornais",
    account: "r_1f5f488eab04",
  },
  {
    url: "https://g1.globo.com/rss/g1/economia/",
    title: "g1 Economia",
    section: "brasil",
    group: "br-economia",
    account: "r_88c10d6880ec",
  },
  {
    url: "https://g1.globo.com/rss/g1/politica/",
    title: "g1 Política",
    section: "brasil",
    group: "br-politica",
    account: "r_e7b794e83304",
  },
  {
    url: "https://rss.dw.com/rdf/rss-br-all",
    title: "DW Brasil",
    section: "brasil",
    group: "br-jornais",
    account: "r_fb0783720028",
  },
  {
    url: "https://feeds.bbci.co.uk/portuguese/topics/economia/rss.xml",
    title: "BBC Economia",
    section: "brasil",
    group: "br-economia",
    account: "r_f734d8c9c0b9",
  },
  {
    url: "https://www.nist.gov/news-events/news/rss.xml",
    title: "NIST",
    section: "ai",
    group: "regulacao",
    account: "r_1c0bfc994e71",
  },
  {
    url: "https://digital-strategy.ec.europa.eu/en/rss.xml",
    title: "UE Digital",
    section: "ai",
    group: "regulacao",
    account: "r_bb6b18aab5af",
  },
  {
    url: "https://foundation.mozilla.org/en/blog/rss/",
    title: "Mozilla Foundation",
    section: "ai",
    group: "regulacao",
    account: "r_4a5b00a12149",
  },
  {
    url: "https://incidentdatabase.ai/rss.xml",
    title: "AI Incidents",
    section: "ai",
    group: "ai-riscos",
    account: "r_b5d88f57ebc7",
  },
  {
    url: "https://newsletter.safe.ai/feed",
    title: "CAIS",
    section: "ai",
    group: "ai-riscos",
    account: "r_34ce00ef4603",
  },
  {
    url: "https://www.eff.org/rss/updates.xml",
    title: "EFF",
    section: "ai",
    group: "ai-riscos",
    account: "r_f0824f315038",
  },
  {
    url: "https://futureoflife.org/feed/",
    title: "Future of Life",
    section: "ai",
    group: "ai-riscos",
    account: "r_d39f28f65ae4",
  },
  {
    url: "https://www.linuxfoundation.org/blog/rss.xml",
    title: "Linux Foundation",
    section: "tech",
    group: "tech-opensource",
    account: "r_cba3ebfdae13",
  },
  {
    url: "https://www.cncf.io/feed/",
    title: "CNCF",
    section: "tech",
    group: "tech-opensource",
    account: "r_c657f5839356",
  },
  {
    url: "https://news.apache.org/feed/",
    title: "Apache",
    section: "tech",
    group: "tech-opensource",
    account: "r_a551b4960a45",
  },
  {
    url: "https://kubernetes.io/feed.xml",
    title: "Kubernetes",
    section: "tech",
    group: "tech-opensource",
    account: "r_74a7d8675f99",
  },
  {
    url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    title: "NASA",
    section: "tech",
    group: "tech-ciencia",
    account: "r_3b8b6784cf00",
  },
  {
    url: "https://www.quantamagazine.org/feed/",
    title: "Quanta",
    section: "tech",
    group: "tech-ciencia",
    account: "r_e65544731b4a",
  },
  {
    url: "https://www.sciencedaily.com/rss/all.xml",
    title: "ScienceDaily",
    section: "tech",
    group: "tech-ciencia",
    account: "r_d5630219201c",
  },
  {
    url: "https://agencia.fapesp.br/rss",
    title: "Agência FAPESP",
    section: "brasil",
    group: "br-ciencia",
    account: "r_a568cfde8bf8",
  },
  {
    url: "https://revistapesquisa.fapesp.br/feed/",
    title: "Pesquisa FAPESP",
    section: "brasil",
    group: "br-ciencia",
    account: "r_8b6a0c3802b2",
  },
  {
    url: "https://g1.globo.com/rss/g1/ciencia-e-saude/",
    title: "g1 Ciência",
    section: "brasil",
    group: "br-ciencia",
    account: "r_b6b2f511e248",
  },
  {
    url: "https://feeds.folha.uol.com.br/ciencia/rss091.xml",
    title: "Folha Ciência",
    section: "brasil",
    group: "br-ciencia",
    account: "r_7ff95a77d18e",
  },
  {
    url: "https://abori.com.br/feed/",
    title: "Bori",
    section: "brasil",
    group: "br-ciencia",
    account: "r_e1eab45398c9",
  },
  {
    url: "https://news.un.org/feed/subscribe/pt/news/all/rss.xml",
    title: "ONU News",
    section: "brasil",
    group: "br-mundo",
    account: "r_52bcc135f5e9",
  },
  {
    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/america/portada",
    title: "El País América",
    section: "brasil",
    group: "br-mundo",
    account: "r_1e3731ecfa41",
  },
  {
    url: "https://feeds.bbci.co.uk/portuguese/topics/internacional/rss.xml",
    title: "BBC Internacional",
    section: "brasil",
    group: "br-mundo",
    account: "r_60c7fd4109ca",
  },
  {
    url: "https://www.rfi.fr/br/rss",
    title: "RFI Brasil",
    section: "brasil",
    group: "br-mundo",
    account: "r_51329902462f",
  },
  {
    url: "https://feeds.folha.uol.com.br/ilustrada/rss091.xml",
    title: "Folha Ilustrada",
    section: "brasil",
    group: "br-cultura",
    account: "r_318a1036156f",
  },
  {
    url: "https://g1.globo.com/rss/g1/pop-arte/",
    title: "g1 Pop & Arte",
    section: "brasil",
    group: "br-cultura",
    account: "r_23a17c6af65e",
  },
  {
    url: "https://www.estadao.com.br/arc/outboundfeeds/rss/section/cultura/?outputType=xml",
    title: "Estadão Cultura",
    section: "brasil",
    group: "br-cultura",
    account: "r_fd58b9ef9a75",
  },
];

export function rssGroupFor(section) {
  if (section === "tech") return "tech-imprensa";
  if (section === "brasil") return "br-jornais";
  return "imprensa";
}

/** @param {string} section @param {Array<Record<string, string>>} [owned] */
export function rssExtrasFor(section, owned = []) {
  const slug = String(section || "");
  return [...RSS_SEED, ...(Array.isArray(owned) ? owned : [])]
    .filter((row) => String(row.section || "") === slug && row.account)
    .map((row) => ({
      handle: String(row.account).replace(/^@+/, ""),
      name: String(row.title || row.account),
      section: slug,
      group: String(row.group || rssGroupFor(slug)),
      url: String(row.url || ""),
    }));
}

export function rssAvatarUrl(url) {
  const host = hostnameOf(url);
  return host ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}` : "";
}

export function rssBlurb(url, title) {
  const host = hostnameOf(url);
  if (host) return `Feed em ${host}`;
  return title ? `${title} é um site acompanhado neste tema.` : "";
}

export function rssSiteHref(account, owned = []) {
  const key = String(account || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  const hit = [...RSS_SEED, ...(Array.isArray(owned) ? owned : [])].find(
    (row) => String(row.account || "").toLowerCase() === key,
  );
  if (!hit?.url) return "";
  try {
    return new URL(hit.url).origin;
  } catch {
    return "";
  }
}

/** Mesmo shape de InfluenceRow para misturar RSS na lista de Fontes. */
export function rssFonteRow(p) {
  const url = String(p?.url || "");
  const handle = String(p?.handle || "").replace(/^@+/, "");
  return {
    handle,
    name: String(p?.name || handle),
    group: String(p?.group || "novos"),
    followers: 0,
    verified: false,
    avatar: rssAvatarUrl(url) || null,
    bio: rssBlurb(url, p?.name) || null,
    siteUrl: rssSiteHref(handle, url ? [{ account: handle, url }] : []) || null,
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

export function mergeRssFontes(base, owned, section) {
  if (!Array.isArray(base)) return [];
  const seen = new Set(base.map((row) => String(row?.handle || "").toLowerCase()));
  const added = rssExtrasFor(section, owned)
    .filter((row) => !seen.has(row.handle.toLowerCase()))
    .map(rssFonteRow);
  return added.length ? [...base, ...added] : base;
}

export function rssLabelFor(account, owned = []) {
  const key = String(account || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  const hit = [...RSS_SEED, ...(Array.isArray(owned) ? owned : [])].find(
    (row) => String(row.account || "").toLowerCase() === key,
  );
  return hit?.title || "";
}

export function isRssAccount(handle) {
  return /^r_[a-f0-9]{12}$/i.test(String(handle || "").replace(/^@+/, "").trim());
}

/** Ordem estável: X, depois RSS. Grupo só-X, só-RSS ou ambos. */
export function originsInHandles(handles) {
  let x = false;
  let rss = false;
  for (const handle of handles) {
    if (isRssAccount(handle)) rss = true;
    else x = true;
    if (x && rss) break;
  }
  const origins = [];
  if (x) origins.push("x");
  if (rss) origins.push("rss");
  return origins;
}

function bareHandle(value) {
  return String(value || "")
    .replace(/^@+/, "")
    .trim();
}

function hostnameOf(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Campos source/sourceLabel da história — RSS nunca vaza o id interno como @handle. */
export function storySourceFromAccount(account, opts = {}) {
  const source = bareHandle(account) || "fonte";
  if (isRssAccount(source) || opts.source === "rss") {
    const sourceLabel =
      rssLabelFor(source, opts.owned) || hostnameOf(opts.postUrl) || "Site";
    return { source, sourceLabel };
  }
  return { source, sourceLabel: `@${source}` };
}

/** Texto da byline: título do site para RSS, @handle para X. */
export function displaySourceByline(source, sourceLabel) {
  const handle = bareHandle(source);
  const label = bareHandle(sourceLabel);
  if (isRssAccount(handle)) {
    if (label && !isRssAccount(label)) return label;
    return rssLabelFor(handle) || "Site";
  }
  const raw = String(sourceLabel || "").trim();
  return raw || (handle ? `@${handle}` : "");
}

export function displaySourceInitial(source, sourceLabel) {
  const text = displaySourceByline(source, sourceLabel).replace(/^@+/, "");
  return (text.charAt(0) || "?").toUpperCase();
}

/** @handle só quando a conta é do X; RSS devolve vazio. */
export function displaySourceAt(source) {
  const handle = bareHandle(source);
  if (!handle || isRssAccount(handle)) return "";
  return `@${handle}`;
}

export function storyIsRss(story) {
  const source = bareHandle(story?.source);
  const id = String(story?.id || "");
  return isRssAccount(source) || id.startsWith("rss_");
}

/** Recorta X e/ou RSS sem reordenar. */
export function filterStoriesByOrigin(stories, { showX = true, showRss = true } = {}) {
  if (!Array.isArray(stories)) return [];
  if (showX && showRss) return stories;
  return stories.filter((story) => (storyIsRss(story) ? showRss : showX));
}

/** Mesmo recorte para a lista de Fontes: r_* é RSS, o resto é X. */
export function filterFontesByOrigin(rows, { showX = true, showRss = true } = {}) {
  if (!Array.isArray(rows)) return [];
  if (showX && showRss) return rows;
  return rows.filter((row) => (isRssAccount(row?.handle) ? showRss : showX));
}

export function fontesEmptyHint({ showX = true, showRss = true, sort = "recent" } = {}) {
  if (!showX && !showRss) return "Ligue o X ou o RSS no topo para ver fontes.";
  if (!showX) return "Ligue o X no topo para ver as contas.";
  if (sort === "starred") return "Nenhum favorito ainda. Toque na estrela de um perfil.";
  return "Nenhum perfil.";
}
