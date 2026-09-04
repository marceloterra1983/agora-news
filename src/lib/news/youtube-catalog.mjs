/** Catálogo seed de canais do YouTube e integração de fontes. */
import { youtubePostedAtIsFresh } from "./youtube-core.mjs";

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
    avatar: "https://yt3.googleusercontent.com/MopgmVAFV9BqlzOJ-UINtmutvEPcNe5IbKMmP_4vZZo3vnJXcZGtybUBsXaEVxkmxKyGqX9R=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCP7jMXSY2xbc3KCAE0MHQ-A",
    title: "Google DeepMind",
    section: "ai",
    group: "labs",
    account: "y_3d00e486280b",
    blurb: "Pesquisa e modelos da DeepMind. Gemini, AlphaFold e avanços fundamentais de IA.",
    avatar: "https://yt3.googleusercontent.com/xofhdRNoyqgAB_YpJgAQeasGtE6gTEXpR2v1vyMmtqlRCmoEUIsTGJcavUORLhhKQk3b9UeUFw=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCrDwWp7EBBv4NwvScIpBDOA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrDwWp7EBBv4NwvScIpBDOA",
    title: "Anthropic",
    section: "ai",
    group: "labs",
    account: "y_b01b6db24262",
    blurb: "Pesquisa em alinhamento, IA constitucional e lançamentos do Claude.",
    avatar: "https://yt3.googleusercontent.com/ux-GXUpB4PkI-qXVOpj9gGEiCkytT0Q78ka4srlxOm_Y3m1gEh5qy8Vu6vTjGSDztMT0NybtC7I=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCXUPKJO5MZQN11PqgIvyuvQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXUPKJO5MZQN11PqgIvyuvQ",
    title: "Andrej Karpathy",
    section: "ai",
    group: "pesquisa",
    account: "y_1e520be6e017",
    blurb: "Ex-diretor de IA da Tesla e OpenAI. Aulas aprofundadas sobre arquitetura de redes e LLMs.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nDvyq2NoPL626bk1IbxQ94SfQsD-B0qgZchghtQNkLWoEz=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCZHmQk67mSJgfCCTn7xBfew",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew",
    title: "Yannic Kilcher",
    section: "ai",
    group: "pesquisa",
    account: "y_e2e48136195f",
    blurb: "Walkthroughs minuciosos e análise crítica dos principais papers científicos de IA.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nqmmpWC-iPIeVF4grbJGcGmoWyYX0E6_PFGITlKv7jTMrh=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCbfYPyITQ-7l4upoX8nvctg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg",
    title: "Two Minute Papers",
    section: "ai",
    group: "pesquisa",
    account: "y_434c876fd910",
    blurb: "Resumos visuais rápidos e precisos de pesquisas em computação gráfica e IA.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_ljAkSpv16cJNUsE_rI1X-Kz9s78w1WNojUga-aZ1uVzEQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCYO_jab_esuFRV4b17AJtAw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw",
    title: "3Blue1Brown",
    section: "ai",
    group: "pesquisa",
    account: "y_454e29b5ecf6",
    blurb: "Intuição matemática visual sobre redes neurais, álgebra linear e cálculo.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nFzZFPLxPZRHcE3SSwzdrbuWqfoWYwLAu0_2iO6blQYAU=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCNJ1Ymd5yFuUPtn21xtRbbw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw",
    title: "AI Explained",
    section: "ai",
    group: "imprensa",
    account: "y_0bc3661870ce",
    blurb: "Análise aprofundada de lançamentos, benchmarks e implicações de modelos de ponta.",
    avatar: "https://yt3.googleusercontent.com/GFuvgO3IZvs5XkYOxyLoWQto2lyY6-7Ob-7sfZRyoann4eBgvBMxuGgSVU1cvBgRCgAn41St7g=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCMLtBahI5DMrt0NPvDSoIRQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMLtBahI5DMrt0NPvDSoIRQ",
    title: "Machine Learning Street Talk",
    section: "ai",
    group: "imprensa",
    account: "y_0765ad77052a",
    blurb: "Conversas longas e técnicas com grandes pesquisadores e filósofos da IA.",
    avatar: "https://yt3.googleusercontent.com/15Akj76BG8IsM5ctgqVwKXArl6IfIVFAbuGa1kOomoioRgJgXHHaLmMAW7iHTMRUoEfyjTtq8lg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCzi5kcwU8aT4aLR7LcYhfWQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCzi5kcwU8aT4aLR7LcYhfWQ",
    title: "Matthew Berman",
    section: "ai",
    group: "builders",
    account: "y_6f10a402c8cd",
    blurb: "Testes práticos de agentes de IA, modelos locais, open-source e automações.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nC6E4INV4ak3zzTSxuS2ZxWes3r0pUOYchGPBVa2IB3TI=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCC-lyoTfSrcJzA1ab3APAgw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCC-lyoTfSrcJzA1ab3APAgw",
    title: "LangChain",
    section: "ai",
    group: "builders",
    account: "y_2de5683b3ab5",
    blurb: "Framework open-source de agentes e orquestração de LLMs. Tutoriais, lançamentos e demos oficiais.",
    avatar: "https://yt3.googleusercontent.com/a37xtLmxeZMFCB5Zj4isLgU9hKznc5qceLU4DOfdCdgiZJi0pORPqlc145VTJU6Sne1Ti6RJ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC2WmuBuFq6gL08QYG-JjXKw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC2WmuBuFq6gL08QYG-JjXKw",
    title: "WorldofAI",
    section: "ai",
    group: "imprensa",
    account: "y_c4f2dedde391",
    blurb: "Noticiário diário de lançamentos, modelos e ferramentas de inteligência artificial.",
    avatar: "https://yt3.googleusercontent.com/Aee59geVCIWJz9y7AzVdnY3I1jPR1S4VFF4kIkNJ46VD6jrEGhH2VszD-vKly0XhHz_sLBN3u4A=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCMwVTLZIRRUyyVrkjDpn4pA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMwVTLZIRRUyyVrkjDpn4pA",
    title: "Cole Medin",
    section: "ai",
    group: "builders",
    account: "y_1973c1f46fcd",
    blurb: "Agentes de IA, stacks locais e tutoriais práticos de engenharia com LLMs.",
    avatar: "https://yt3.googleusercontent.com/hypu_gAVvu_zrtDWjVw833AeSwI2OwJSJ5ZSy1QAhgbIPs1qmNnKreOnHMhaU55bBRLMA47E=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCrXSVX9a1mj8l0CMLwKgMVw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrXSVX9a1mj8l0CMLwKgMVw",
    title: "AI Jason",
    section: "ai",
    group: "builders",
    account: "y_38547ef59328",
    blurb: "Construção prática de agentes, automações e produtos com modelos de linguagem.",
    avatar: "https://yt3.googleusercontent.com/86g-eIpeFGtk4pcng5YfuVcOv72Ot3x3cOuSN44ty2cJ8rqBiOHDzmP34SMpRXRQiqQOuGpJkA=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCPR4QNCFWnyuYs2Vjr3lydw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCPR4QNCFWnyuYs2Vjr3lydw",
    title: "AI Engineer Brasil",
    section: "ai",
    group: "builders",
    account: "y_09e2cc52f653",
    blurb: "Comunidade brasileira de engenharia de IA. Talks, cases e práticas de quem constrói.",
    avatar: "https://yt3.googleusercontent.com/AQZcSOEi5zyRfsa8YIWf-7B9Nb5t8EOkJuqfs-QvBe4NqdLfWz7TYlBcaBij8Q4L-CZfNH44=s176-c-k-c0x00ffffff-no-rj",
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
    avatar: "https://yt3.googleusercontent.com/3fPNbkf_xPyCleq77ZhcxyeorY97NtMHVNUbaAON_RBDH9ydL4hJkjxC8x_4mpuopkB8oI7Ct6Y=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCUyeluBRhGPCW4rPe_UvBZQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCUyeluBRhGPCW4rPe_UvBZQ",
    title: "The PrimeTime",
    section: "tech",
    group: "tech-devs",
    account: "y_c76182749393",
    blurb: "ThePrimeagen. Opiniões, arquitetura de sistemas e o dia a dia do ecossistema de software.",
    avatar: "https://yt3.googleusercontent.com/Eu_xR4JfLlrruwj1lrmfDiOpe8GARBs8M0hgQ6NsGhQ0qC8S-po9HEHw1W21sPN2BHO6EHXrSwM=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC_ML5xP23TOWKUcc-oAE_Eg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_ML5xP23TOWKUcc-oAE_Eg",
    title: "Hussein Nasser",
    section: "tech",
    group: "tech-devs",
    account: "y_244f000d540c",
    blurb: "Engenharia de backend profunda: bancos de dados, proxies, protocolos HTTP e redes.",
    avatar: "https://yt3.googleusercontent.com/wdZxAigelIgebOT-NlWwVnvOijYuHttaa5jSpCuxlYajSEbfp75dVPSItmer-6jCrKACKChheAE=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCZgt6AzoyjslHTC9dz0UoTw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZgt6AzoyjslHTC9dz0UoTw",
    title: "ByteByteGo",
    section: "tech",
    group: "tech-devs",
    account: "y_174961750f1f",
    blurb: "Diagramas e conceitos visuais de arquitetura de sistemas distribuídos e alta escala.",
    avatar: "https://yt3.googleusercontent.com/ZDRUyBUwc2WXZzvNKP9VS9myI6Mg2puQLaWyp4hibRu-owlsasZ3DVNGSQJwzO1IU-tqoMiGgdc=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCBJycsmduvYEL83R_U4JriQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ",
    title: "Marques Brownlee",
    section: "tech",
    group: "tech-gadgets",
    account: "y_c042af24ad7d",
    blurb: "MKBHD. Análises e reviews dos principais smartphones, hardware e eletrônicos.",
    avatar: "https://yt3.googleusercontent.com/qu4TmIaYUlS41-dJ9gZ7DUR3nilvmB5_11i6OKSdvNnBNiyOusZP1bMN6ICnuxtjFBb6ioKgRQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCVYamHliCI9rw1tHR1xbkfw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCVYamHliCI9rw1tHR1xbkfw",
    title: "Dave2D",
    section: "tech",
    group: "tech-gadgets",
    account: "y_9248c1cf62da",
    blurb: "Reviews limpos e diretos de laptops, GPUs e hardware sem enrolação.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_lltZkOAE5XVIlI8U5QVXmdASgYyJiJps-LkO-uQnTwLMQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCHnyfMqiRRG1u-2MsSQLbXA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA",
    title: "Veritasium",
    section: "tech",
    group: "tech-ciencia",
    account: "y_fb133728b2ee",
    blurb: "Vídeos sobre física, matemática, engenharia e experimentos científicos.",
    avatar: "https://yt3.googleusercontent.com/7vCbvtCqtjQ3YLgsJt7Y952MQV1sBvhllSCSxHP8_sVZdcPCBrITfhkN2RdyCuwPnsByq-1GoA=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCsXVk37bltHxD1rDPwtNM8Q",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q",
    title: "Kurzgesagt",
    section: "tech",
    group: "tech-ciencia",
    account: "y_8cbd3eece02f",
    blurb: "Animações científicas sobre astronomia, tecnologia, energia e futuro da humanidade.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_n1Ribd7LwdP_qKtqWL3ZDfIgv9M1d6g78VwpHGXVR2Ir4=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC3q8O3Bh2Le8Rj1-Q-_UUbA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC3q8O3Bh2Le8Rj1-Q-_UUbA",
    title: "Databricks",
    section: "tech",
    group: "tech-empresas",
    account: "y_62008810e9a3",
    blurb: "Conta oficial da Databricks. Lakehouse, Spark, Mosaic AI e dados em escala.",
    avatar: "https://yt3.googleusercontent.com/heZWOVKeX2BijQFWpK1q8w2zZ2L3Dxfss9-Wik9HExDtv_MREfarcZN92xNrRPdtDvOT_U3U=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCrxcWtpd1IGHG9RbD_9380A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrxcWtpd1IGHG9RbD_9380A",
    title: "VirtualizationHowto",
    section: "tech",
    group: "tech-devs",
    account: "y_02c6e4b1488d",
    blurb: "Homelab, virtualização, Proxmox, Kubernetes e infraestrutura prática.",
    avatar: "https://yt3.googleusercontent.com/NMstzMo3WnJBOnRVkJvKYkKtpIDe7LVPRKdiYZ1METZN1dQHzTSd0ztXoEYtglQ8uIu3pImGhg=s176-c-k-c0x00ffffff-no-rj",
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
    avatar: "https://yt3.googleusercontent.com/eeXFm7_mIItuMYmrE9HRFjtwjXEG6Qvs7yJTZBdHmNyFwbi1v28gDd3tQ9JjzsjE1lSTOtb_=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCn9Erjy00mpnWeLnRqhsA1g",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCn9Erjy00mpnWeLnRqhsA1g",
    title: "Ciência Todo Dia",
    section: "brasil",
    group: "br-ciencia",
    account: "y_c48cf9f15183",
    blurb: "Física, espaço e curiosidades científicas explicadas de forma didática por Pedro Loos.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_lQoeh3pIl35H0tiDQ6fG3YeSrn2hWxKKCIxN11NQvnDdg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UClu474HMt895mVxZdlIHXEA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UClu474HMt895mVxZdlIHXEA",
    title: "Nerdologia",
    section: "brasil",
    group: "br-ciencia",
    account: "y_dca8bec799f1",
    blurb: "Ciência, tecnologia e cultura pop explicadas por especialistas e referências.",
    avatar: "https://yt3.googleusercontent.com/8qsA80UNk6TB3_8ougMVFOblJ_0OWCWWytYeM3swkGp-xpbSHCInQmzs4P37b0z0qZGKLmIBOA=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCib793mnUOhWymCh2VJKplQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCib793mnUOhWymCh2VJKplQ",
    title: "Fábio Akita",
    section: "brasil",
    group: "br-colunistas",
    account: "y_83cbea10449e",
    blurb: "Akitando. Ensaios aprofundados sobre computação, Unix, carreira técnica e história da tecnologia.",
    avatar: "https://yt3.googleusercontent.com/DnsLS63P8rHr4qdXZ9yuQTV4IkY8YBK1_pE2bbvK1YjsfSS4X0vn3AXSQnjtue38l5h8-2Gy6xk=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCU5JicSrEM5A63jkJ2QvGYw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCU5JicSrEM5A63jkJ2QvGYw",
    title: "Filipe Deschamps",
    section: "brasil",
    group: "br-colunistas",
    account: "y_e6b0ab678ab3",
    blurb: "Notícias para programadores, projetos práticos e discussões de tecnologia.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_l2dYLob_k5biaqXR_dOPX6yOtT1PPOo4l4fw5-NaPe-A=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCFuIUoyHB12qpYa8Jpxoxow",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFuIUoyHB12qpYa8Jpxoxow",
    title: "Código Fonte TV",
    section: "brasil",
    group: "br-colunistas",
    account: "y_db0119052ccb",
    blurb: "Gabriel e Vanessa falando sobre mercado de trabalho, programação e tecnologias.",
    avatar: "https://yt3.googleusercontent.com/2CkMHl_lxrIpACXMFUxU6rPiJ85SBGw7kG5SOFEoJbVVjl0sSNfDB20Xp63wUGOsCPlB_Vt3EA=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCEf5U1dB5a2e2S-XUlnhxSA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCEf5U1dB5a2e2S-XUlnhxSA",
    title: "Diolinux",
    section: "brasil",
    group: "br-colunistas",
    account: "y_e83e7e79e62f",
    blurb: "Canal referência em Linux, código aberto, produtividade e hardware.",
    avatar: "https://yt3.googleusercontent.com/SLBk_zBM2dQJIt4YIzK6kMi2I3xyvSpDnxa6cQTcLzdeMRc4jQC8WYp8c71Tq-YweLcOr67A2IQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC_bXJnsgwOqEPA_-6N6faKw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_bXJnsgwOqEPA_-6N6faKw",
    title: "Canaltech",
    section: "brasil",
    group: "br-jornais",
    account: "y_bfcadd1ca989",
    blurb: "Noticiário diário das principais novidades de tecnologia, produtos e mercado.",
    avatar: "https://yt3.googleusercontent.com/LoKQuEeRQuLLhfqQ-cl-axuwQa51dFNnULEyl4gtgqjMAddlmGit1NTg1TMlrReeRHmORX7z=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCGH4Wx-WL10iB4ZAdewkuDw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCGH4Wx-WL10iB4ZAdewkuDw",
    title: "Adrenaline",
    section: "brasil",
    group: "br-jornais",
    account: "y_5dde20527d26",
    blurb: "Portal brasileiro de hardware, games e tecnologia. Lançamentos, reviews e mercado.",
    avatar: "https://yt3.googleusercontent.com/SMveOOAq3F-AmS7pCeo4WgaD8EXuZMKQi4mUEdatPhfavWCh00YbidvYeaiQI-XOrTEOFkXQrg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCo7EHzKF2zDFWszw7Dg4mPw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCo7EHzKF2zDFWszw7Dg4mPw",
    title: "Alura",
    section: "brasil",
    group: "br-colunistas",
    account: "y_418f889d27ae",
    blurb: "Escola de tecnologia. Cursos, carreiras e conteúdo de desenvolvimento de software.",
    avatar: "https://yt3.googleusercontent.com/XHqPTSK4lOmklDmyax14FbDB1C2MDG-QmWXZd6r_2mjSyM5rbH5oy7vX6lp6mu20UTogManBNA=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCSfwM5u0Kce6Cce8_S72olg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCSfwM5u0Kce6Cce8_S72olg",
    title: "Rocketseat",
    section: "brasil",
    group: "br-colunistas",
    account: "y_6dc5a620659a",
    blurb: "Formação de desenvolvedores. React, Node, carreiras e o ecossistema brasileiro de software.",
    avatar: "https://yt3.googleusercontent.com/E2S6vIBQ8XNJ5WTWHAmLyz6-xQ-mDWsFAHYWwEUuIQFTbkniEDAB2l1OHQcWQbC8f2JaOBTMD9c=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCMUoZehUZBhLb8XaTc8TQrA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMUoZehUZBhLb8XaTc8TQrA",
    title: "Full Cycle",
    section: "brasil",
    group: "br-colunistas",
    account: "y_f059283647f5",
    blurb: "Arquitetura, DevOps e engenharia de software com Wesley Willians.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nwMxEL3bcbIKE33BbCGrj_paIIpSDr42GX-Vmo_4jIbJM=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCkr-unKyg_SiEzUwUY_uluQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCkr-unKyg_SiEzUwUY_uluQ",
    title: "Mayk Brito",
    section: "brasil",
    group: "br-colunistas",
    account: "y_dbf438c94a2a",
    blurb: "Frontend, carreira e tutoriais de programação para quem está começando e avançando.",
    avatar: "https://yt3.googleusercontent.com/5TSuSz4W95ctMNva_B-PPlGf1AtDxWHRtCY9IhQWibdI0AzGACAS4MlEFXgls3CsD9hEfwAZ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCo-SyplR7M1ZC1w0YhwMa8w",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCo-SyplR7M1ZC1w0YhwMa8w",
    title: "Goularte",
    section: "brasil",
    group: "br-colunistas",
    account: "y_6085bd3958f1",
    blurb: "Notícias e opiniões sobre tecnologia, internet e cultura digital em português.",
    avatar: "https://yt3.googleusercontent.com/ff8rIEc1GOyMZMJQ4Q4bZhCZim_i5efHvaUTTHksiMSfh0xa4x64tyTKiyhoM--_xBe1Gl6OAg=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCORZcu08VQiRCKpVGHTWwAA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCORZcu08VQiRCKpVGHTWwAA",
    title: "Otávio Miranda",
    section: "brasil",
    group: "br-colunistas",
    account: "y_3474c33f7e05",
    blurb: "Python, TypeScript e engenharia de software com foco em fundamentos e prática.",
    avatar: "https://yt3.googleusercontent.com/W1bwlPg7dtgUtvm-gkEwPOhBROnhPe0F6xOeYfDtUKNoulnnKUHhcZ8dFGwkjEu1pjF6xkHl7Q=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCetRsdZxDQDcgVDJd6erz6g",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCetRsdZxDQDcgVDJd6erz6g",
    title: "Attekita Dev",
    section: "brasil",
    group: "br-colunistas",
    account: "y_9f46273794fb",
    blurb: "Carreira em tech, desenvolvimento e o dia a dia de quem programa no Brasil.",
    avatar: "https://yt3.googleusercontent.com/wouftQsBoVBmxgKhsUDdEMTjbryCdl7pEOvh2Wy3NPrBpgY3K5RNAnMgXU8-TD3G20z4GYsy=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCqmJGTdcMIRXOZuukHZ8TqA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCqmJGTdcMIRXOZuukHZ8TqA",
    title: "Waldemar Neto - Dev Lab",
    section: "brasil",
    group: "br-colunistas",
    account: "y_f01f6dfb789c",
    blurb: "Arquitetura de software, clean code e o ofício de engenharia no Brasil.",
    avatar: "https://yt3.googleusercontent.com/bi6tu-vUP5SwN6k60c1XU8f2PwbGKI9efr32XtME6e7MJJH-5u43FMrKwhWwby6P8ny_Dvb7=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCvdwhh_fDyWccR42-rReZLw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCvdwhh_fDyWccR42-rReZLw",
    title: "CNN Brasil",
    section: "brasil",
    group: "br-jornais",
    account: "y_cb015d918f7a",
    blurb: "Noticiário nacional e internacional da CNN no Brasil.",
    avatar: "https://yt3.googleusercontent.com/TUNo33rJfSv06L2UyQWsOPUMJglHptsHR2mFZOshcXL45xRJ1YgpRZWpb76IChbSBwyG1TBUvA=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCqfm5IQhpMlfeAWMmVL_uNg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCqfm5IQhpMlfeAWMmVL_uNg",
    title: "CNN Brasil Money",
    section: "brasil",
    group: "br-economia",
    account: "y_867276a0b2ff",
    blurb: "Economia, mercados e negócios cobertos pela CNN Brasil.",
    avatar: "https://yt3.googleusercontent.com/pPyDHsYpdECHazLgGgZUofzNXIG08ixreVNca8L8sBTFouzHnWYE3IxIR_7NbLahMaEK4B3c04U=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC_Fk7hHbl7vv_7K8tYqJd5A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_Fk7hHbl7vv_7K8tYqJd5A",
    title: "SpaceToday",
    section: "brasil",
    group: "br-ciencia",
    account: "y_02db2a28ff00",
    blurb: "Astronomia e exploração espacial em português, com Sérgio Sacani.",
    avatar: "https://yt3.googleusercontent.com/JA39FTXDNDI86qOEzL8pI5EmYBvuQamyP7iJHnR0DexKjrc9mGijSc0BVkOYZx6QmczLixY0OfU=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCNVsZnDXOM4PodYIEgM2e4w",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNVsZnDXOM4PodYIEgM2e4w",
    title: "Roda Viva",
    section: "brasil",
    group: "br-jornais",
    account: "y_28ed30f2ff34",
    blurb: "Entrevistas longas da TV Cultura com personalidades da política, ciência e cultura.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_kfyLAWctOIzjZr-kolr68qWcxh95K-Lpo0r0FsDOkRI3c=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC7Ibd8DnwTwDN7oBmx7eFfQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC7Ibd8DnwTwDN7oBmx7eFfQ",
    title: "Marcelo Gleiser",
    section: "brasil",
    group: "br-ciencia",
    account: "y_becd851df74b",
    blurb: "Físico e escritor. Ciência, cosmos e reflexão sobre o conhecimento.",
    avatar: "https://yt3.googleusercontent.com/urJ6xkFIm8WMdDF0B-bKFSStLy8KgcMF15uNS_55ts-UzlZ7hnNAPv-B4z5t45wseX-WweJW2UQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCI_HfUogtuJBbNIQRea334g",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCI_HfUogtuJBbNIQRea334g",
    title: "Galeria do Meteorito",
    section: "brasil",
    group: "br-ciencia",
    account: "y_3b39ab1dea6d",
    blurb: "Astronomia, física e divulgação científica do espaço.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_kOm-mzHGFPomRInkNUcran7ed4Hxb36wixBQgKgmfA8mM=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC_TapH8f4HLLAwPBaXy-Gag",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_TapH8f4HLLAwPBaXy-Gag",
    title: "Ministério da Fazenda",
    section: "brasil",
    group: "br-instituicoes",
    account: "y_a4d2dbdbd175",
    blurb: "Canal oficial do Ministério da Fazenda. Política econômica e comunicados do governo.",
    avatar: "https://yt3.googleusercontent.com/WLbS-oGyjd9H054vlDi8cuYsUOhSaUlgzJAp9O72HEYYQVWB7wrcg5ubxnkNNxnjp4b3wB27HQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCxXL5491Db9U8Rhfs-2LVFg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCxXL5491Db9U8Rhfs-2LVFg",
    title: "Asimov Academy",
    section: "brasil",
    group: "br-colunistas",
    account: "y_2ab128f38eef",
    blurb: "Dados, Python e inteligência artificial aplicada com a Asimov Academy.",
    avatar: "https://yt3.googleusercontent.com/FDsdc8glkcsHia1YU7b4ostl6Pn37yZtkEyk849N_HL5-EY15Z31j4ktksQ2q_PQFQo-rWBNBA=s176-c-k-c0x00ffffff-no-rj",
  },
];

function shrinkYtAvatar(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  return raw.replace(/([?&=]s)900(-c-k)/i, "$188$2");
}

export function youtubeGroupFor(section) {
  if (section === "tech") return "tech-devs";
  if (section === "brasil") return "br-ciencia";
  return "labs";
}

/** Grupo editorial do seed. Vazio se a conta não for YouTube cadastrada. */
export function youtubeGroupOf(account) {
  const hit = youtubeSeedHit(account);
  if (!hit) return "";
  return String(hit.group || youtubeGroupFor(hit.section) || "");
}

function isYouTubeStory(story) {
  const id = String(story?.id || "");
  const source = String(story?.source || story?.account || "")
    .replace(/^@+/, "")
    .trim();
  return id.startsWith("yt_") || /^y_[a-f0-9]{12}$/i.test(source);
}

/** Um vídeo por canal — o mais recente. */
export function latestYouTubeByAccount(stories) {
  const by = new Map();
  for (const story of Array.isArray(stories) ? stories : []) {
    if (!isYouTubeStory(story)) continue;
    const key = String(story.source || story.account || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const prev = by.get(key);
    if (!prev || Date.parse(story.publishedAt || "") > Date.parse(prev.publishedAt || "")) {
      by.set(key, story);
    }
  }
  return [...by.values()];
}

/** Acrescenta o último vídeo fresco de cada canal que ainda não está na página. */
export function mergeLatestYouTube(timeline, latest, now = Date.now()) {
  const page = Array.isArray(timeline) ? timeline : [];
  const seen = new Set(page.map((story) => String(story?.id || "")).filter(Boolean));
  const pins = latestYouTubeByAccount(latest).filter(
    (story) =>
      story?.id && !seen.has(story.id) && youtubePostedAtIsFresh(story.publishedAt, now),
  );
  return pins.length ? [...page, ...pins] : page;
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
    avatar: shrinkYtAvatar(row.avatar) || null,
  }));
}

export function youtubeFonteRow(p) {
  const handle = String(p?.account || p?.handle || "").replace(/^@+/, "");
  const channelId = String(p?.channelId || "");
  const siteUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : "https://www.youtube.com";
  const avatar =
    shrinkYtAvatar(p?.avatar) ||
    youtubeAvatarFor(handle) ||
    "https://www.google.com/s2/favicons?sz=64&domain=youtube.com";
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
  const extras = youtubeExtrasFor(slug);
  const byHandle = new Map(extras.map((row) => [row.handle.toLowerCase(), row]));
  const seen = new Set();
  const painted = base.map((row) => {
    const key = String(row?.handle || "").toLowerCase();
    if (key) seen.add(key);
    const yt = byHandle.get(key);
    if (!yt) return row;
    // Catálogo sempre prevalece sobre avatar morto em cache/DB.
    return {
      ...row,
      name: row.name || yt.name,
      group: row.group || yt.group,
      avatar: yt.avatar || row.avatar || null,
      bio: row.bio || yt.blurb || null,
    };
  });
  const added = extras
    .filter((row) => !seen.has(row.handle.toLowerCase()))
    .map(youtubeFonteRow);
  return added.length ? [...painted, ...added] : painted;
}
