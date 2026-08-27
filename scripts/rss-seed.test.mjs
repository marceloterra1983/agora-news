import assert from "node:assert/strict";
import test from "node:test";
import { RSS_SEED, rssExtrasFor } from "../src/lib/news/rss-catalog.mjs";
import { rssAccountId } from "../src/lib/news/rss-id.mjs";
import { isReservedGroup } from "../src/lib/news/catalog-taxonomy.mjs";

const REQUIRED = [
  { url: "https://openai.com/news/rss.xml", title: "OpenAI", section: "ai", group: "labs" },
  { url: "https://huggingface.co/blog/feed.xml", title: "Hugging Face", section: "ai", group: "labs" },
  { url: "https://deepmind.google/blog/rss.xml", title: "Google DeepMind", section: "ai", group: "labs" },
  {
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    title: "MIT Technology Review AI",
    section: "ai",
    group: "imprensa",
  },
  { url: "https://importai.substack.com/feed", title: "Import AI", section: "ai", group: "imprensa" },
  { url: "https://simonwillison.net/atom/everything/", title: "Simon Willison", section: "ai", group: "builders" },
  { url: "https://www.theverge.com/rss/index.xml", title: "The Verge", section: "tech", group: "tech-imprensa" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", title: "Ars Technica", section: "tech", group: "tech-imprensa" },
  { url: "https://techcrunch.com/feed/", title: "TechCrunch", section: "tech", group: "tech-imprensa" },
  { url: "https://www.wired.com/feed/rss", title: "WIRED", section: "tech", group: "tech-imprensa" },
  { url: "https://krebsonsecurity.com/feed/", title: "KrebsOnSecurity", section: "tech", group: "tech-seguranca" },
  { url: "https://github.blog/feed/", title: "GitHub Blog", section: "tech", group: "tech-devs" },
  { url: "https://rss.tecmundo.com.br/feed", title: "TecMundo", section: "brasil", group: "br-jornais" },
  { url: "https://g1.globo.com/rss/g1/", title: "g1", section: "brasil", group: "br-jornais" },
  {
    url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
    title: "Folha",
    section: "brasil",
    group: "br-jornais",
  },
  { url: "https://feeds.bbci.co.uk/portuguese/rss.xml", title: "BBC News Brasil", section: "brasil", group: "br-jornais" },
  { url: "https://www.poder360.com.br/feed/", title: "Poder360", section: "brasil", group: "br-politica" },
  {
    url: "https://feeds.folha.uol.com.br/mercado/rss091.xml",
    title: "Folha Mercado",
    section: "brasil",
    group: "br-economia",
  },
  { url: "https://canaltech.com.br/rss/", title: "Canaltech", section: "brasil", group: "br-jornais" },
  { url: "https://developer.nvidia.com/blog/feed/", title: "NVIDIA", section: "ai", group: "labs" },
  {
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    title: "AWS Machine Learning",
    section: "ai",
    group: "labs",
  },
  { url: "https://blog.google/technology/ai/rss/", title: "Google AI", section: "ai", group: "labs" },
  { url: "https://research.google/blog/rss/", title: "Google Research", section: "ai", group: "pesquisa" },
  { url: "https://ai.stanford.edu/blog/feed.xml", title: "Stanford AI Lab", section: "ai", group: "pesquisa" },
  { url: "https://www.interconnects.ai/feed", title: "Interconnects", section: "ai", group: "builders" },
  { url: "https://www.latent.space/feed", title: "Latent Space", section: "ai", group: "imprensa" },
  { url: "https://www.oneusefulthing.org/feed", title: "One Useful Thing", section: "ai", group: "imprensa" },
  {
    url: "https://www.theregister.com/headlines.atom",
    title: "The Register",
    section: "tech",
    group: "tech-imprensa",
  },
  { url: "https://www.404media.co/rss/", title: "404 Media", section: "tech", group: "tech-imprensa" },
  { url: "https://www.engadget.com/rss.xml", title: "Engadget", section: "tech", group: "tech-gadgets" },
  { url: "https://9to5mac.com/feed/", title: "9to5Mac", section: "tech", group: "tech-gadgets" },
  {
    url: "https://www.apple.com/newsroom/rss-feed.rss",
    title: "Apple Newsroom",
    section: "tech",
    group: "tech-empresas",
  },
  { url: "https://blog.google/rss/", title: "Google Blog", section: "tech", group: "tech-empresas" },
  { url: "https://blog.cloudflare.com/rss/", title: "Cloudflare", section: "tech", group: "tech-devs" },
  {
    url: "https://www.bleepingcomputer.com/feed/",
    title: "BleepingComputer",
    section: "tech",
    group: "tech-seguranca",
  },
  { url: "https://www.cnnbrasil.com.br/feed/", title: "CNN Brasil", section: "brasil", group: "br-jornais" },
  { url: "https://www.nexojornal.com.br/rss.xml", title: "Nexo Jornal", section: "brasil", group: "br-colunistas" },
  { url: "https://www.jota.info/feed", title: "JOTA", section: "brasil", group: "br-politica" },
  { url: "https://valor.globo.com/rss/valor", title: "Valor", section: "brasil", group: "br-economia" },
  { url: "https://exame.com/feed/", title: "Exame", section: "brasil", group: "br-economia" },
  {
    url: "https://agenciabrasil.ebc.com.br/rss.xml",
    title: "Agência Brasil",
    section: "brasil",
    group: "br-instituicoes",
  },
  { url: "https://www12.senado.leg.br/noticias/rss", title: "Senado", section: "brasil", group: "br-instituicoes" },
  {
    url: "https://www.camara.leg.br/noticias/rss/ultimas-noticias",
    title: "Câmara",
    section: "brasil",
    group: "br-instituicoes",
  },
  { url: "https://mistral.ai/news/rss", title: "Mistral", section: "ai", group: "labs" },
  { url: "https://the-decoder.com/feed/", title: "The Decoder", section: "ai", group: "imprensa" },
  { url: "https://www.platformer.news/feed", title: "Platformer", section: "ai", group: "imprensa" },
  { url: "https://www.aisnakeoil.com/feed", title: "AI Snake Oil", section: "ai", group: "pesquisa" },
  { url: "https://lilianweng.github.io/index.xml", title: "Lilian Weng", section: "ai", group: "pesquisa" },
  { url: "https://thegradient.pub/rss/", title: "The Gradient", section: "ai", group: "imprensa" },
  { url: "https://venturebeat.com/category/ai/feed/", title: "VentureBeat AI", section: "ai", group: "imprensa" },
  {
    url: "https://www.microsoft.com/en-us/research/feed/",
    title: "Microsoft Research",
    section: "ai",
    group: "pesquisa",
  },
  {
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    title: "The Verge AI",
    section: "ai",
    group: "imprensa",
  },
  { url: "https://www.wired.com/feed/tag/ai/latest/rss", title: "WIRED AI", section: "ai", group: "imprensa" },
  { url: "https://arstechnica.com/ai/feed/", title: "Ars Technica AI", section: "ai", group: "imprensa" },
  { url: "https://9to5google.com/feed/", title: "9to5Google", section: "tech", group: "tech-gadgets" },
  { url: "https://feeds.macrumors.com/MacRumors-All", title: "MacRumors", section: "tech", group: "tech-gadgets" },
  { url: "https://www.cnet.com/rss/news/", title: "CNET", section: "tech", group: "tech-imprensa" },
  { url: "https://blogs.microsoft.com/feed/", title: "Microsoft Blog", section: "tech", group: "tech-empresas" },
  { url: "https://aws.amazon.com/blogs/aws/feed/", title: "AWS News", section: "tech", group: "tech-empresas" },
  { url: "https://stackoverflow.blog/feed/", title: "Stack Overflow", section: "tech", group: "tech-devs" },
  { url: "https://daringfireball.net/feeds/main", title: "Daring Fireball", section: "tech", group: "tech-gadgets" },
  { url: "https://www.androidpolice.com/feed/", title: "Android Police", section: "tech", group: "tech-gadgets" },
  { url: "https://www.ycombinator.com/blog/rss", title: "Y Combinator", section: "tech", group: "tech-startups" },
  { url: "https://www.sequoiacap.com/feed/", title: "Sequoia", section: "tech", group: "tech-startups" },
  {
    url: "https://github.blog/engineering/feed/",
    title: "GitHub Engineering",
    section: "tech",
    group: "tech-devs",
  },
  { url: "https://nextjs.org/feed.xml", title: "Next.js", section: "tech", group: "tech-devs" },
  { url: "https://react.dev/rss.xml", title: "React", section: "tech", group: "tech-devs" },
  { url: "https://nodejs.org/en/feed/blog.xml", title: "Node.js", section: "tech", group: "tech-devs" },
  {
    url: "https://blog.cloudflare.com/tag/security/rss/",
    title: "Cloudflare Security",
    section: "tech",
    group: "tech-seguranca",
  },
  { url: "https://engineering.fb.com/feed/", title: "Engineering at Meta", section: "tech", group: "tech-devs" },
  {
    url: "https://blog.google/technology/developers/rss/",
    title: "Google Developers",
    section: "tech",
    group: "tech-devs",
  },
  {
    url: "https://feeds.feedburner.com/TheHackersNews",
    title: "The Hacker News",
    section: "tech",
    group: "tech-seguranca",
  },
  { url: "https://rss.uol.com.br/feed/noticias.xml", title: "UOL", section: "brasil", group: "br-jornais" },
  { url: "https://rss.uol.com.br/feed/economia.xml", title: "UOL Economia", section: "brasil", group: "br-economia" },
  { url: "https://www.infomoney.com.br/feed/", title: "InfoMoney", section: "brasil", group: "br-economia" },
  {
    url: "https://www.congressoemfoco.com.br/feed/",
    title: "Congresso em Foco",
    section: "brasil",
    group: "br-politica",
  },
  {
    url: "https://feeds.folha.uol.com.br/poder/rss091.xml",
    title: "Folha Poder",
    section: "brasil",
    group: "br-politica",
  },
  { url: "https://www.intercept.com.br/feed/", title: "Intercept Brasil", section: "brasil", group: "br-politica" },
  { url: "https://piaui.uol.com.br/feed/", title: "piauí", section: "brasil", group: "br-colunistas" },
  { url: "https://www.cartacapital.com.br/feed/", title: "CartaCapital", section: "brasil", group: "br-politica" },
  { url: "https://veja.abril.com.br/feed/", title: "VEJA", section: "brasil", group: "br-jornais" },
  {
    url: "https://www.estadao.com.br/arc/outboundfeeds/rss/?outputType=xml",
    title: "Estadão",
    section: "brasil",
    group: "br-jornais",
  },
  { url: "https://g1.globo.com/rss/g1/economia/", title: "g1 Economia", section: "brasil", group: "br-economia" },
  { url: "https://g1.globo.com/rss/g1/politica/", title: "g1 Política", section: "brasil", group: "br-politica" },
  { url: "https://rss.dw.com/rdf/rss-br-all", title: "DW Brasil", section: "brasil", group: "br-jornais" },
  {
    url: "https://feeds.bbci.co.uk/portuguese/topics/economia/rss.xml",
    title: "BBC Economia",
    section: "brasil",
    group: "br-economia",
  },
];

test("RSS_SEED has the 86 editorial feeds with stable ids", () => {
  assert.equal(RSS_SEED.length, 86);
  const urls = new Set();
  const accounts = new Set();
  for (const row of RSS_SEED) {
    assert.ok(row.url.startsWith("https://"), row.url);
    assert.equal(row.account, rssAccountId(row.url), row.title);
    assert.ok(isReservedGroup(row.group), `${row.title} ${row.group}`);
    assert.ok(!urls.has(row.url), row.url);
    assert.ok(!accounts.has(row.account), row.account);
    urls.add(row.url);
    accounts.add(row.account);
  }
});

test("incluir list is present with section and group", () => {
  for (const want of REQUIRED) {
    const hit = RSS_SEED.find((row) => row.url === want.url);
    assert.ok(hit, want.url);
    assert.equal(hit.title, want.title);
    assert.equal(hit.section, want.section);
    assert.equal(hit.group, want.group);
  }
});

test("rssExtrasFor exposes seed handles per section", () => {
  assert.equal(rssExtrasFor("ai").length, 25);
  assert.equal(rssExtrasFor("tech").length, 32);
  assert.equal(rssExtrasFor("brasil").length, 29);
  assert.ok(rssExtrasFor("ai").some((row) => row.name === "Mistral" && row.group === "labs"));
  assert.ok(rssExtrasFor("tech").some((row) => row.name === "Y Combinator" && row.group === "tech-startups"));
  assert.ok(rssExtrasFor("brasil").some((row) => row.name === "Estadão" && row.group === "br-jornais"));
});
