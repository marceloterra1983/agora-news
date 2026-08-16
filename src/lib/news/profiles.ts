import { DEFAULT_SECTION, type Category } from "./types";

export type ProfileGroup = "labs" | "lideres" | "pesquisa" | "imprensa" | "builders" | "novos";

export type XProfile = {
  handle: string;
  name: string;
  group: ProfileGroup;
  section: Category;
  blurb: string;
};

export const GROUP_LABELS: Record<ProfileGroup, string> = {
  labs: "Empresas",
  lideres: "CEOs",
  pesquisa: "Cientistas",
  imprensa: "Imprensa",
  builders: "Devs",
  novos: "Outros",
};

export const GROUP_HINTS: Record<ProfileGroup, string> = {
  labs: "Contas oficiais das empresas e dos produtos",
  lideres: "Quem comanda as empresas de IA",
  pesquisa: "Pesquisadores e autores de papers",
  imprensa: "Newsletters e quem seleciona o que importa",
  builders: "Engenheiros e makers que constroem com IA",
  novos: "Sem grupo definido ou adicionados por você.",
};

export const GROUP_ORDER: ProfileGroup[] = [
  "labs",
  "lideres",
  "pesquisa",
  "imprensa",
  "builders",
  "novos",
];

const AI_PROFILES: XProfile[] = [
  { handle: "grok", name: "Grok", group: "labs", section: "ai", blurb: "Assistente de IA da xAI, empresa fundada por Elon Musk. Conta oficial do produto." },
  { handle: "OpenAI", name: "OpenAI", group: "labs", section: "ai", blurb: "Laboratório que cria o ChatGPT, o GPT e o Sora. Uma das empresas centrais da IA generativa." },
  { handle: "AnthropicAI", name: "Anthropic", group: "labs", section: "ai", blurb: "Laboratório por trás do Claude. Foco em IA constitucional e segurança de modelos." },
  { handle: "GoogleDeepMind", name: "Google DeepMind", group: "labs", section: "ai", blurb: "Braço de pesquisa de IA do Google. Gemini, AlphaGo e AlphaFold saíram daqui." },
  { handle: "claudeai", name: "Claude", group: "labs", section: "ai", blurb: "Conta do assistente Claude, da Anthropic. Anúncios de produto e do app." },
  { handle: "MistralAI", name: "Mistral", group: "labs", section: "ai", blurb: "Laboratório francês de modelos abertos e comerciais. Rival europeu das big techs de IA." },
  { handle: "perplexity_ai", name: "Perplexity", group: "labs", section: "ai", blurb: "Busca conversacional com fontes. Alternativa ao Google para pesquisar com IA." },
  { handle: "AIatMeta", name: "Meta AI", group: "labs", section: "ai", blurb: "Pesquisa e produtos de IA da Meta. Família Llama e ferramentas abertas." },
  { handle: "huggingface", name: "Hugging Face", group: "labs", section: "ai", blurb: "Plataforma onde a comunidade publica modelos, datasets e demos de IA." },
  { handle: "cursor_ai", name: "Cursor", group: "labs", section: "ai", blurb: "Editor de código com IA. Muito usado por quem programa com agentes." },
  { handle: "sama", name: "Sam Altman", group: "lideres", section: "ai", blurb: "CEO da OpenAI. Voz principal da empresa sobre ChatGPT, modelos e política de IA." },
  { handle: "demishassabis", name: "Demis Hassabis", group: "lideres", section: "ai", blurb: "CEO da Google DeepMind. Cientista por trás do AlphaGo e do AlphaFold." },
  { handle: "DarioAmodei", name: "Dario Amodei", group: "lideres", section: "ai", blurb: "CEO e cofundador da Anthropic. Pesquisa escala de modelos e riscos da IA." },
  { handle: "gdb", name: "Greg Brockman", group: "lideres", section: "ai", blurb: "Presidente e cofundador da OpenAI. Fala de pesquisa, produto e engenharia." },
  { handle: "arthurmensch", name: "Arthur Mensch", group: "lideres", section: "ai", blurb: "CEO e cofundador da Mistral AI. Representa a aposta europeia em modelos próprios." },
  { handle: "AravSrinivas", name: "Aravind Srinivas", group: "lideres", section: "ai", blurb: "CEO e cofundador da Perplexity. Defende busca com respostas citadas." },
  { handle: "ylecun", name: "Yann LeCun", group: "pesquisa", section: "ai", blurb: "Cientista-chefe de IA da Meta. Pioneiro de redes neurais e crítico do alarmismo existencial." },
  { handle: "karpathy", name: "Andrej Karpathy", group: "pesquisa", section: "ai", blurb: "Pesquisador e professor. Ex-diretor de IA da Tesla e um dos primeiros da OpenAI." },
  { handle: "ilyasut", name: "Ilya Sutskever", group: "pesquisa", section: "ai", blurb: "Cofundador da OpenAI e da SSI. Figura-chave no treino dos primeiros GPT." },
  { handle: "elonmusk", name: "Elon Musk", group: "lideres", section: "ai", blurb: "CEO da Tesla, SpaceX e xAI. Comenta modelos, robótica, energia e política de IA." },
  { handle: "JensenHuang", name: "Jensen Huang", group: "lideres", section: "ai", blurb: "CEO da NVIDIA. Quase toda a infraestrutura de treino de IA roda nos chips da empresa." },
  { handle: "satyanadella", name: "Satya Nadella", group: "lideres", section: "ai", blurb: "CEO da Microsoft. Sócia da OpenAI e dona do Copilot em Windows, Office e Azure." },
  { handle: "mustafasuleyman", name: "Mustafa Suleyman", group: "lideres", section: "ai", blurb: "CEO de IA da Microsoft. Cofundou a DeepMind e depois a Inflection." },
  { handle: "AndrewYNg", name: "Andrew Ng", group: "pesquisa", section: "ai", blurb: "Professor de Stanford e fundador da DeepLearning.AI. Um dos maiores educadores de IA." },
  { handle: "drfeifei", name: "Fei-Fei Li", group: "pesquisa", section: "ai", blurb: "Professora de Stanford. Criou o ImageNet, base da visão computacional moderna." },
  { handle: "geoffreyhinton", name: "Geoffrey Hinton", group: "pesquisa", section: "ai", blurb: "Pesquisador pioneiro de deep learning. Prêmio Nobel de Física em 2024; alerta sobre riscos da IA." },
  { handle: "ClementDelangue", name: "Clément Delangue", group: "lideres", section: "ai", blurb: "CEO da Hugging Face. Defende código aberto e a comunidade de modelos." },
  { handle: "DanielaAmodei", name: "Daniela Amodei", group: "lideres", section: "ai", blurb: "Presidenta e cofundadora da Anthropic. Cuida de operação, confiança e crescimento da empresa." },
  { handle: "jackclarkSF", name: "Jack Clark", group: "pesquisa", section: "ai", blurb: "Cofundador da Anthropic. Escreve o Import AI e acompanha política e avaliação de modelos." },
  { handle: "ch402", name: "Chris Olah", group: "pesquisa", section: "ai", blurb: "Pesquisador da Anthropic. Referência em interpretabilidade — entender o que o modelo “pensa”." },
  { handle: "NotTomBrown", name: "Tom Brown", group: "pesquisa", section: "ai", blurb: "Cofundador da Anthropic. Coautor do paper do GPT-3 na OpenAI." },
  { handle: "AmandaAskell", name: "Amanda Askell", group: "pesquisa", section: "ai", blurb: "Pesquisadora da Anthropic. Trabalha alinhamento e o tom/personalidade do Claude." },
  { handle: "TheRundownAI", name: "The Rundown", group: "imprensa", section: "ai", blurb: "Newsletter diária de IA. Resume lançamentos, papers e o que o mercado está discutindo." },
  { handle: "rowancheung", name: "Rowan Cheung", group: "imprensa", section: "ai", blurb: "Fundador do The Rundown. Curadoria rápida do que importa no dia da IA." },
  { handle: "_akhaliq", name: "AK", group: "imprensa", section: "ai", blurb: "Curador de papers e demos. Um dos primeiros a espalhar novidades de pesquisa no X." },
  { handle: "dair_ai", name: "DAIR.AI", group: "imprensa", section: "ai", blurb: "Comunidade educacional de IA. Tutoriais, cursos e resumos de pesquisa para iniciantes e profissionais." },
  { handle: "emollick", name: "Ethan Mollick", group: "imprensa", section: "ai", blurb: "Professor da Wharton. Estuda e ensina como usar IA no trabalho e na educação." },
  { handle: "simonw", name: "Simon Willison", group: "builders", section: "ai", blurb: "Criador do Datasette e do LLM CLI. Documenta na prática o que cada modelo consegue fazer." },
  { handle: "swyx", name: "swyx", group: "builders", section: "ai", blurb: "Engenheiro e escritor (Shawn Wang). Fala de AI Engineer, Latent Space e o ofício de construir com LLMs." },
  { handle: "levelsio", name: "levelsio", group: "builders", section: "ai", blurb: "Maker holandês (Pieter Levels). Constrói produtos solo, muitos com IA, e mostra números reais." },
  { handle: "fchollet", name: "François Chollet", group: "builders", section: "ai", blurb: "Criador do Keras e do teste ARC. Pesquisa inteligência e generalização, além de deep learning." },
  { handle: "hwchase17", name: "Harrison Chase", group: "builders", section: "ai", blurb: "CEO da LangChain. Infraestrutura para agentes e apps em cima de modelos de linguagem." },
  { handle: "bcherny", name: "Boris Cherny", group: "builders", section: "ai", blurb: "Engenheiro da Anthropic. Liderou o Claude Code, o agente de programação da empresa." },
  { handle: "leerob", name: "Lee Robinson", group: "builders", section: "ai", blurb: "VP de Produto para Desenvolvedores na Cursor. Antes foi rosto do Next.js na Vercel." },
  { handle: "mntruell", name: "Michael Truell", group: "builders", section: "ai", blurb: "CEO e cofundador da Anysphere, empresa do Cursor. Fala do editor e de agentes de código." },
  { handle: "OfficialLoganK", name: "Logan Kilpatrick", group: "builders", section: "ai", blurb: "Google DeepMind, produto para desenvolvedores do Gemini. Antes liderou relações com devs na OpenAI." },
  { handle: "theo", name: "Theo", group: "builders", section: "ai", blurb: "Theo Browne. YouTuber e CEO da T3 Chat. Comenta ferramentas de dev e produtos de IA." },
  { handle: "mattpocockuk", name: "Matt Pocock", group: "builders", section: "ai", blurb: "Educador de TypeScript. Ensina tipos, DX e agora fluxos de programação com IA." },
];

const TECH_PROFILES: XProfile[] = [
  { handle: "verge", name: "The Verge", group: "imprensa", section: "tech", blurb: "Site de tecnologia e cultura digital. Gadgets, software e as empresas que os fazem." },
  { handle: "TechCrunch", name: "TechCrunch", group: "imprensa", section: "tech", blurb: "Notícias de startups e venture capital. Referência do Vale do Silício." },
  { handle: "wired", name: "WIRED", group: "imprensa", section: "tech", blurb: "Revista de tecnologia, ciência e cultura. Reportagens longas sobre o que vem depois." },
  { handle: "arstechnica", name: "Ars Technica", group: "imprensa", section: "tech", blurb: "Jornalismo técnico: ciência, hardware, política de internet e segurança." },
  { handle: "MKBHD", name: "Marques Brownlee", group: "builders", section: "tech", blurb: "YouTuber de reviews de gadgets. Uma das vozes mais vistas de hardware no mundo." },
  { handle: "theinformation", name: "The Information", group: "imprensa", section: "tech", blurb: "Reportagem investigativa sobre big techs e o mercado de tecnologia." },
  { handle: "BloombergTech", name: "Bloomberg Tech", group: "imprensa", section: "tech", blurb: "Cobertura de tecnologia da Bloomberg. Mercados, empresas e política." },
  { handle: "Apple", name: "Apple", group: "labs", section: "tech", blurb: "Conta oficial da Apple. Lançamentos de iPhone, Mac e serviços." },
  { handle: "Google", name: "Google", group: "labs", section: "tech", blurb: "Conta oficial do Google. Produtos, pesquisa e a plataforma Android." },
  { handle: "Microsoft", name: "Microsoft", group: "labs", section: "tech", blurb: "Conta oficial da Microsoft. Windows, Azure, Office e GitHub." },
];

const BRASIL_PROFILES: XProfile[] = [
  { handle: "folha", name: "Folha de S.Paulo", group: "imprensa", section: "brasil", blurb: "Jornal brasileiro. Política, economia e cotidiano do país." },
  { handle: "g1", name: "g1", group: "imprensa", section: "brasil", blurb: "Portal de notícias da Globo. O recorte mais lido do jornalismo brasileiro." },
  { handle: "exame", name: "Exame", group: "imprensa", section: "brasil", blurb: "Negócios, economia e carreiras no Brasil." },
  { handle: "Estadao", name: "Estadão", group: "imprensa", section: "brasil", blurb: "O Estado de S. Paulo. Jornalismo político e econômico." },
  { handle: "valoreconomico", name: "Valor Econômico", group: "imprensa", section: "brasil", blurb: "Jornal de economia e finanças. Mercado, empresas e Brasília." },
  { handle: "UOLNoticias", name: "UOL Notícias", group: "imprensa", section: "brasil", blurb: "Portal UOL. Noticiário geral, política e cotidiano." },
  { handle: "cnnbrasil", name: "CNN Brasil", group: "imprensa", section: "brasil", blurb: "Canal de notícias. Política, economia e cobertura ao vivo." },
  { handle: "nexojornal", name: "Nexo", group: "imprensa", section: "brasil", blurb: "Jornalismo explicativo. Contexto e dados sobre o Brasil." },
  { handle: "startseoficial", name: "StartSe", group: "imprensa", section: "brasil", blurb: "Ecossistema de inovação e startups no Brasil." },
  { handle: "revistapiaui", name: "piauí", group: "imprensa", section: "brasil", blurb: "Revista de reportagem longa. Política, cultura e grandes histórias." },
];

const ALL: XProfile[] = [...AI_PROFILES, ...TECH_PROFILES, ...BRASIL_PROFILES];

export function allProfiles(): XProfile[] {
  return ALL;
}

export function profilesFor(section?: Category | null): XProfile[] {
  const slug = section || DEFAULT_SECTION;
  return ALL.filter((p) => p.section === slug);
}

export function profileByHandle(handle: string): XProfile | undefined {
  const key = handle.replace(/^@+/, "").trim().toLowerCase();
  return ALL.find((p) => p.handle.toLowerCase() === key);
}

export function blurbFor(handle: string, fallbackName?: string): string {
  const hit = profileByHandle(handle);
  if (hit) return hit.blurb;
  return fallbackName
    ? `${fallbackName} é uma fonte acompanhada no feed de IA.`
    : "Fonte acompanhada no feed de IA.";
}

export function profileGroups(section?: Category | null) {
  const list = profilesFor(section);
  return GROUP_ORDER
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      hint: GROUP_HINTS[group],
      profiles: list.filter((p) => p.group === group),
    }))
    .filter((g) => g.profiles.length > 0);
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^@+/, "")
    .trim();
}

function subseq(q: string, text: string): boolean {
  let i = 0;
  for (const ch of text) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return true;
  }
  return false;
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

export function matchProfiles(
  raw: string,
  limit = 8,
  section?: Category | null,
): Array<XProfile & { score: number }> {
  const q = fold(raw);
  if (q.length < 1) return [];
  const pool = section ? ALL.filter((p) => p.section === section) : ALL;
  const scored = pool.map((p) => {
    const h = fold(p.handle);
    const n = fold(p.name);
    const words = n.split(/[\s._-]+/).filter(Boolean);
    let score = 0;
    if (h === q || n === q) score = 100;
    else if (h.startsWith(q)) score = 92;
    else if (n.startsWith(q) || words.some((w) => w.startsWith(q))) score = 88;
    else if (h.includes(q)) score = 74;
    else if (n.includes(q)) score = 68;
    else if (q.length >= 3 && (distance(q, h) <= 2 || words.some((w) => distance(q, w) <= 1)))
      score = 46;
    else if (q.length >= 2 && (subseq(q, h) || subseq(q, n))) score = 32;
    return { ...p, score };
  })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt"));
  return scored.slice(0, limit);
}
