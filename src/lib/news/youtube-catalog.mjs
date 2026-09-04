/** Catálogo seed de canais do YouTube e integração de fontes.
 * Recalibrado em 2026-09-03 a partir do Takeout:
 * takeout-20260903T232949Z-1-001.zip → histórico-de-visualização.html
 * Seção ai: só long-form (sem Shorts/Reels) com tema de IA no histórico.
 */
import { youtubePostedAtIsFresh } from "./youtube-core.mjs";

export const MAX_YOUTUBE_ITEMS = 10;

export const YOUTUBE_SEED = [

  // IA (long-form watch-history, sem Shorts)
  {
    channelId: "UCEojuEA0eCL267t_G_cc0Fg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCEojuEA0eCL267t_G_cc0Fg",
    title: "Maestros da IA",
    section: "ai",
    group: "builders",
    account: "y_7bf15e60ce27",
    blurb: "Tutoriais e análises em português sobre modelos, agentes, Claude Code e skills de IA.",
    avatar: "https://yt3.googleusercontent.com/nwHdTGsASMRYBtrNrpTHRE1GWHzpxOgeFbxafReLT074poXWSFx5FCmoP6vVDWOcJE9IhTr8XQ=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=40
  {
    channelId: "UCc-Nvq1SYmXVTO5_UwQbg6w",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCc-Nvq1SYmXVTO5_UwQbg6w",
    title: "Rafael Quintanilha – QuantBrasil",
    section: "ai",
    group: "builders",
    account: "y_c2559941c3af",
    blurb: "Reviews práticas de modelos, IA local, agentes e ferramentas de coding com IA.",
    avatar: "https://yt3.googleusercontent.com/htOX0IaM8pXyiCUuy3jtVfFlXeiT43Jiio8gooNMHRfoe2uhWKTX8zyWsATks3pu8CCe6hiC=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=29
  {
    channelId: "UCB0zxJZkEkb7TH6DdS-Fe_A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCB0zxJZkEkb7TH6DdS-Fe_A",
    title: "Vini Lana",
    section: "ai",
    group: "imprensa",
    account: "y_63d353c868ba",
    blurb: "Cobertura rápida de lançamentos de LLMs, Cursor, Claude e a corrida das big techs de IA.",
    avatar: "https://yt3.googleusercontent.com/Oe_TGJDd-rmwQkmmI0iLzxhKWKQcShd9H3NpO0Q--tfsFFRiA2oOKuqZ_PdnT1nrTcmxnslG=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=22
  {
    channelId: "UCQy7CQvtuGSKp-2VGtmTAuQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCQy7CQvtuGSKp-2VGtmTAuQ",
    title: "Inteligência Mil Grau",
    section: "ai",
    group: "imprensa",
    account: "y_a0a4acebc96b",
    blurb: "Noticiário em português sobre novos modelos GPT, Claude, Gemini, Grok e OpenRouter.",
    avatar: "https://yt3.googleusercontent.com/ZcbeO9jisFy1wlL-uDoVfV7K7cmxkcHJ8gHyR5314Z4uTHCK9tACzuDaC9qb5E6hgZ1RgcQh=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=10
  {
    channelId: "UCIQne9yW4TvCCNYQLszfXCQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCIQne9yW4TvCCNYQLszfXCQ",
    title: "Sandeco",
    section: "ai",
    group: "builders",
    account: "y_abb2b42237f9",
    blurb: "Claude Code, specs, skills e workflows agentic para quem constrói com IA.",
    avatar: "https://yt3.googleusercontent.com/aN3a49RMWUMvPORYerEkd6z4kvRtOShXLYH1VBppCUoDb1nSI_WJcaeUXRqDxODBfi4nq7KZKQ=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=10
  {
    channelId: "UCFV3j-V6aESI35hwHYrno9Q",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFV3j-V6aESI35hwHYrno9Q",
    title: "Macks Wendhell I Inteligência Aplicada",
    section: "ai",
    group: "builders",
    account: "y_6446b7c152aa",
    blurb: "Conceitos e ajustes práticos de Claude Code, ChatGPT e produtividade com IA.",
    avatar: "https://yt3.googleusercontent.com/IAFvwAEhi8UmizZFHrJlihbOuWZJ02mRS22SCmzvSEUAfhPfuPCMUCzaTr_hNE3EsZJiDW7XKg=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=8
  {
    channelId: "UCTHZK1x5rW-fv_VYieYhYPQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCTHZK1x5rW-fv_VYieYhYPQ",
    title: "ViktorKav",
    section: "ai",
    group: "builders",
    account: "y_42a523df7ca0",
    blurb: "IA local, Qwen, DeepSeek e modelos que rodam na sua placa.",
    avatar: "https://yt3.googleusercontent.com/YZblwzQlHsqlpoaOvCEzrM2d_u6T0uXX2oUl9Jj_TYVUypSw85kz5ggeq7510nm0cmHN9fBE=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=7
  {
    channelId: "UCgy4t_KFZk87l4B-eVSjqcg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCgy4t_KFZk87l4B-eVSjqcg",
    title: "Limite Semanal",
    section: "ai",
    group: "imprensa",
    account: "y_f803b6869f81",
    blurb: "Resumo semanal da corrida de LLMs: OpenAI, Claude, Qwen, DeepSeek e open source.",
    avatar: "https://yt3.googleusercontent.com/uaoVhZKYr7DuLY0cIRwdLj3d1CKJUmD004hmoAmqq_QlgRjmSz1ce5xSatO88UHan4G1t5OUig=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=7
  {
    channelId: "UCkXwPGVz4FrmXeog4mjbo-w",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCkXwPGVz4FrmXeog4mjbo-w",
    title: "Breno Vieira LionLab",
    section: "ai",
    group: "builders",
    account: "y_aaa2f1646445",
    blurb: "Harness de IA, loops agentic e engenharia de processos com Claude e DeepSeek.",
    avatar: "https://yt3.googleusercontent.com/Cb9TzOtGx43opvzwLuXleJkxOfrI1CV7qE1OKPrRhQs6iUkrTcrTJ_0RkJSEMT1AreRtYoPVO_A=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=6
  {
    channelId: "UCdqoyAzMA89TKyGzC_GzAMQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCdqoyAzMA89TKyGzC_GzAMQ",
    title: "Anwar Hermuche | Engenheiro de IA",
    section: "ai",
    group: "pesquisa",
    account: "y_79b2ae3f7881",
    blurb: "Engenharia de IA do zero: transformers, agentes, graph engineering e skills.",
    avatar: "https://yt3.googleusercontent.com/sOWyMmGSA2S_kuNTCcZUWKz4FixJIXn4hjj4P9r7i2PTO9G57BCzW1cyBJveOWbawg6fQzh1mg=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=5
  {
    channelId: "UCEgYlWh3HH0u7ye8PNlcQgg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCEgYlWh3HH0u7ye8PNlcQgg",
    title: "Ratos de IA",
    section: "ai",
    group: "builders",
    account: "y_c293421db987",
    blurb: "Agentes, Claude Code e operação de time de IAs no dia a dia de produto.",
    avatar: "https://yt3.googleusercontent.com/csqZhruMj1vB4gsyM_TFDXAmPhZJ0X4ycid-Ejp0tnAPOJ5sn2cP4EktdQZXiHlp9s2rVrXmgUY=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=5
  {
    channelId: "UC2WmuBuFq6gL08QYG-JjXKw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC2WmuBuFq6gL08QYG-JjXKw",
    title: "WorldofAI",
    section: "ai",
    group: "imprensa",
    account: "y_c4f2dedde391",
    blurb: "Noticiário diário em inglês de lançamentos, modelos e ferramentas de IA.",
    avatar: "https://yt3.googleusercontent.com/Aee59geVCIWJz9y7AzVdnY3I1jPR1S4VFF4kIkNJ46VD6jrEGhH2VszD-vKly0XhHz_sLBN3u4A=s176-c-k-c0x00ffffff-no-rj",
  }, // longform-ai=4

  // Tech / dev (ranqueados pelo histórico)
  {
    channelId: "UCDoFiMhpOnLFq1uG4RL4xag",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCDoFiMhpOnLFq1uG4RL4xag",
    title: "Matheus Battisti - Hora de Codar",
    section: "tech",
    group: "tech-devs",
    account: "y_59551bed9a1e",
    blurb: "Tutoriais de programação, web e carreira de desenvolvedor em português.",
    avatar: "https://yt3.googleusercontent.com/uPCkzVLQAv_qhRQJ_cGGfAZvWCNQ-eaxGVcvXlVjpV3qALP5r1-HvC1nLBmGAlS2At_z-I70bg=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=34
  {
    channelId: "UCAJVTC8JP4VQirlyqM8yPzw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCAJVTC8JP4VQirlyqM8yPzw",
    title: "Reset",
    section: "tech",
    group: "tech-devs",
    account: "y_6f6e1bc0e4e7",
    blurb: "Tecnologia, produto e o dia a dia de quem constrói software.",
    avatar: "https://yt3.googleusercontent.com/iby-eVK8YKy-61YI6MLs-OwRT2Jah7olCdi4d-4-KMKhBOwIrxLlyrjWPEdJGMF7QTTgYmQh7A=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=28
  {
    channelId: "UCqmJGTdcMIRXOZuukHZ8TqA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCqmJGTdcMIRXOZuukHZ8TqA",
    title: "Waldemar Neto - Dev Lab",
    section: "tech",
    group: "tech-devs",
    account: "y_f01f6dfb789c",
    blurb: "Arquitetura de software, clean code e o ofício de engenharia no Brasil.",
    avatar: "https://yt3.googleusercontent.com/bi6tu-vUP5SwN6k60c1XU8f2PwbGKI9efr32XtME6e7MJJH-5u43FMrKwhWwby6P8ny_Dvb7=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=24
  {
    channelId: "UCMUoZehUZBhLb8XaTc8TQrA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMUoZehUZBhLb8XaTc8TQrA",
    title: "Full Cycle",
    section: "tech",
    group: "tech-devs",
    account: "y_f059283647f5",
    blurb: "Arquitetura, DevOps e engenharia de software com Wesley Willians.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nwMxEL3bcbIKE33BbCGrj_paIIpSDr42GX-Vmo_4jIbJM=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=13
  {
    channelId: "UCetRsdZxDQDcgVDJd6erz6g",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCetRsdZxDQDcgVDJd6erz6g",
    title: "Attekita Dev",
    section: "tech",
    group: "tech-devs",
    account: "y_9f46273794fb",
    blurb: "Carreira em tech, desenvolvimento e o dia a dia de quem programa no Brasil.",
    avatar: "https://yt3.googleusercontent.com/wouftQsBoVBmxgKhsUDdEMTjbryCdl7pEOvh2Wy3NPrBpgY3K5RNAnMgXU8-TD3G20z4GYsy=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=7
  {
    channelId: "UCFuIUoyHB12qpYa8Jpxoxow",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFuIUoyHB12qpYa8Jpxoxow",
    title: "Código Fonte TV",
    section: "tech",
    group: "tech-devs",
    account: "y_db0119052ccb",
    blurb: "Gabriel e Vanessa sobre mercado de trabalho, programação e tecnologias.",
    avatar: "https://yt3.googleusercontent.com/2CkMHl_lxrIpACXMFUxU6rPiJ85SBGw7kG5SOFEoJbVVjl0sSNfDB20Xp63wUGOsCPlB_Vt3EA=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=3
  {
    channelId: "UCU5JicSrEM5A63jkJ2QvGYw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCU5JicSrEM5A63jkJ2QvGYw",
    title: "Filipe Deschamps",
    section: "tech",
    group: "tech-devs",
    account: "y_e6b0ab678ab3",
    blurb: "Notícias para programadores, projetos práticos e discussões de tecnologia.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_l2dYLob_k5biaqXR_dOPX6yOtT1PPOo4l4fw5-NaPe-A=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=0

  // Brasil — política, economia, podcasts e esporte (ranqueados pelo histórico)
  {
    channelId: "UC84asuWqcrFqEtWqSCtS85Q",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC84asuWqcrFqEtWqSCtS85Q",
    title: "Deltan Dallagnol",
    section: "brasil",
    group: "br-politica",
    account: "y_aa92dc0a0287",
    blurb: "Análise política e jurídica. Comentários sobre Brasil, Congresso e justiça.",
    avatar: "https://yt3.googleusercontent.com/caeRwhBNrXesGQbyI0LjHOJzYqLnO6cHFkJxOsEhSGr8RfDusCTWQpbhgwj0n8Qgww_AASyPaA=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=85
  {
    channelId: "UCUUQBgnLa_umQ_TGKlG2Xqw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCUUQBgnLa_umQ_TGKlG2Xqw",
    title: "André Marsiglia",
    section: "brasil",
    group: "br-politica",
    account: "y_fe31780cdb0e",
    blurb: "Advogado constitucionalista. Análise jurídica e política em vídeo.",
    avatar: "https://yt3.googleusercontent.com/qfw8AL8KBKu9_e94LiLwYObDoI1Py5YPrTH0xYMv5NysXSMODExjDCDR47gEWFjIfRX6izn9=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=83
  {
    channelId: "UCRuy5PigeeBuecKnwqhM4yg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCRuy5PigeeBuecKnwqhM4yg",
    title: "TV 247",
    section: "brasil",
    group: "br-jornais",
    account: "y_b587676d655b",
    blurb: "Portal de notícias e análises políticas ao vivo.",
    avatar: "https://yt3.googleusercontent.com/OvuEjElRARvejbAJIeHsg6kBooycJqry2Dkx5U6RPzOmkmSd77VCUWX4UAo4JY1rzPOypwwn-qA=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=78
  {
    channelId: "UCMLluq-qSne85Un73ToYI2w",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMLluq-qSne85Un73ToYI2w",
    title: "Renan Santos",
    section: "brasil",
    group: "br-politica",
    account: "y_fb8f53fbcda4",
    blurb: "Política nacional, MBL e cobertura de Brasília.",
    avatar: "https://yt3.googleusercontent.com/4oyGmzfR9qsgiC2CDJ8eURy2L73kovYh5zNmlPPLmXAZ0f4xsQMLkBs5hi0-eXX49vDMGP6mzMY=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=71
  {
    channelId: "UC6goPLJfPWENPXAPeiTtJCQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC6goPLJfPWENPXAPeiTtJCQ",
    title: "Felipe Moura Brasil",
    section: "brasil",
    group: "br-politica",
    account: "y_fe31b1e0f496",
    blurb: "Comentário político e cobertura do noticiário brasileiro.",
    avatar: "https://yt3.googleusercontent.com/TnqIoYKxc-p3QXYGNvLWstE2qnqnudiVo6CtkcPAhtGuf3QcKK6rnoROWsuOl8Xp1N8CI34mgQ=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=63
  {
    channelId: "UCpHQyEuBXwYBvXC1_NResCg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCpHQyEuBXwYBvXC1_NResCg",
    title: "Kim Kataguiri",
    section: "brasil",
    group: "br-politica",
    account: "y_f594f347154e",
    blurb: "Deputado federal. Política, Congresso e debates públicos.",
    avatar: "https://yt3.googleusercontent.com/xeJMqAWfIkQMxbzw72EgxXMFTSFEnFrhVieUX3yzFZkweB2Wm68Xa4bAYgNmBl2IulHA9oOreg=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=59
  {
    channelId: "UCpLR-q8rFLe_rEAXf4PRxRg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCpLR-q8rFLe_rEAXf4PRxRg",
    title: "Daniel Lopez",
    section: "brasil",
    group: "br-politica",
    account: "y_9aa6cfae999e",
    blurb: "Análise política e comentários sobre o noticiário do Brasil.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_kE3GIMjCk3H037wz_FWB3DIT_yLF67mNODdqVCgnmOW1c=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=40
  {
    channelId: "UCHw2aRSCveHIIxNinU2ZHpQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHw2aRSCveHIIxNinU2ZHpQ",
    title: "Investiga, Pinhel!",
    section: "brasil",
    group: "br-politica",
    account: "y_4c76f4d17050",
    blurb: "Investigações e análise crítica do noticiário político.",
    avatar: "https://yt3.googleusercontent.com/UOjx3y4JjE7QOGxf4_efzYuPfU4O50cDiQ4GGd2Mts50ksSyD2as95BTsYb3ycE_bpNBf8_G=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=36
  {
    channelId: "UCpJB1JPb95OOd8W62KI2lvw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCpJB1JPb95OOd8W62KI2lvw",
    title: "Renato Albani",
    section: "brasil",
    group: "br-colunistas",
    account: "y_fb03abd185ae",
    blurb: "Humor e comentário sobre política e cultura brasileira.",
    avatar: "https://yt3.googleusercontent.com/zuc_GLvB5n-cBjzq78HU7gSLS2avo1pYmDaWcVaLAZhJXhdqw_qBYfHCpw8qGdN8Lp42mhhWjEY=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=29
  {
    channelId: "UC9mdw2mmn49ZuqGOpSri7Fw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC9mdw2mmn49ZuqGOpSri7Fw",
    title: "Metrópoles",
    section: "brasil",
    group: "br-jornais",
    account: "y_c23080e55272",
    blurb: "Portal de notícias nacionais, política e cidades.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nHdpA_05ttI2SOYeISrRVWVY2g89KwX2g4gYXlV9QH6j0L=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=27
  {
    channelId: "UCO2xgftRyAmma4-GAO6IKAg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCO2xgftRyAmma4-GAO6IKAg",
    title: "Pedro Jorge",
    section: "brasil",
    group: "br-politica",
    account: "y_ef44c4283744",
    blurb: "Comentário político e cobertura de temas nacionais.",
    avatar: "https://yt3.googleusercontent.com/PWWXRG-uy--NvMJkJ1n57RzVzsdjF7TfmHr0RG9k4GJHorwXawKOFnVIKJYaXoivD8hkFHjeSA=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=25
  {
    channelId: "UCoa-D_VfMkFrCYodrOC9-mA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCoa-D_VfMkFrCYodrOC9-mA",
    title: "Band Jornalismo",
    section: "brasil",
    group: "br-jornais",
    account: "y_43ca4f61c2c6",
    blurb: "Noticiário da Band. Política, economia e cobertura ao vivo.",
    avatar: "https://yt3.googleusercontent.com/qqad5hNhAtWZblXQwSFFki_sqD0xied7pUw3con6MAsAenTbt0ZF6r0lqP3BCl8ZWQw_PyyOKA=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=15
  {
    channelId: "UCBQAI1ZhurW3nbtJR-gBBZg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBQAI1ZhurW3nbtJR-gBBZg",
    title: "Revista Oeste",
    section: "brasil",
    group: "br-jornais",
    account: "y_aae55d4ac8f8",
    blurb: "Revista de política, cultura e análise do Brasil.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_nQrgMoxlvsfwpVAcbVPkWnh7PRUMlVFAyWjiWm0EeeJ_w=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=14
  {
    channelId: "UCvdwhh_fDyWccR42-rReZLw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCvdwhh_fDyWccR42-rReZLw",
    title: "CNN Brasil",
    section: "brasil",
    group: "br-jornais",
    account: "y_cb015d918f7a",
    blurb: "Noticiário nacional e internacional da CNN no Brasil.",
    avatar: "https://yt3.googleusercontent.com/TUNo33rJfSv06L2UyQWsOPUMJglHptsHR2mFZOshcXL45xRJ1YgpRZWpb76IChbSBwyG1TBUvA=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=13
  {
    channelId: "UCzpdl_kn1PC1ZP3xMSla5BQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCzpdl_kn1PC1ZP3xMSla5BQ",
    title: "PrimosAgro",
    section: "brasil",
    group: "br-economia",
    account: "y_dea25cfeb371",
    blurb: "Agronegócio, mercados e o dia a dia do agro brasileiro.",
    avatar: "https://yt3.googleusercontent.com/5CMKS4JvY1lUq7F40W2vfYNLvkEEm77gd1CIC9RllFUyug-G_WJr2bRk2dUPkdyI380T88fKUw=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=127
  {
    channelId: "UCUAqQbPNrc2rXx1LRWl5Q2A",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCUAqQbPNrc2rXx1LRWl5Q2A",
    title: "TubaCast | Tubarão da Bolsa",
    section: "brasil",
    group: "br-economia",
    account: "y_1390b8edc9c0",
    blurb: "Bolsa, investimentos e conversas sobre o mercado financeiro.",
    avatar: "https://yt3.googleusercontent.com/b-LbtxWbCmSV0EGWOPAxhYC8A1poB_bpOud27ltQxq6Thjccbz2ensX95YPPMZVn2fzKQzoSlZI=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=14
  {
    channelId: "UCBKGVVNbt1Be3tspNHp-6Cw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBKGVVNbt1Be3tspNHp-6Cw",
    title: "Talk Flow",
    section: "brasil",
    group: "br-colunistas",
    account: "y_e4c40deee0fe",
    blurb: "Cortes e conversas do universo Flow sobre política, cultura e atualidades.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_kFYviV2-xLK3L3vbqmHrkEpTyqym3tDpudravWDpn1ffg=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=84
  {
    channelId: "UCWZoPPW7u2I4gZfhJBZ6NqQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCWZoPPW7u2I4gZfhJBZ6NqQ",
    title: "Inteligência Ltda",
    section: "brasil",
    group: "br-colunistas",
    account: "y_a9b0c14197b5",
    blurb: "Podcast com Rogério Vilela. Entrevistas longas com convidados.",
    avatar: "https://yt3.googleusercontent.com/5djT_z2Ss8_x4MAPSzIplRWaqaInjPy_1xtRabCbXcGfnayI_7DGhwiu4bRlNRJKN0WPHI3Zz-w=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=62
  {
    channelId: "UCnYz3VOkNoZaAB1lgO_UApA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCnYz3VOkNoZaAB1lgO_UApA",
    title: "Cortes do Suetam [OFICIAL]",
    section: "brasil",
    group: "br-colunistas",
    account: "y_26e9129b94bb",
    blurb: "Cortes de entrevistas e debates do canal Suetam.",
    avatar: "https://yt3.googleusercontent.com/KAds_Av0CmX5McBgTpX00yveomgOZBXhUkdQ-88kFUc3yWCyEouf_SItAcClsA1DkJLMzcK_=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=45
  {
    channelId: "UC3uYvpJ3J6oNoNYRXfZXjEw",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC3uYvpJ3J6oNoNYRXfZXjEw",
    title: "Cortes do Flow [OFICIAL]",
    section: "brasil",
    group: "br-colunistas",
    account: "y_9795b197edaa",
    blurb: "Cortes oficiais do Flow Podcast com trechos de entrevistas.",
    avatar: "https://yt3.googleusercontent.com/Hx4v_0zIAs9pSsMv359kMML-j0HnenNk7Kt86iXbHc_Iv0_3dsYCuz6bI9VLKqOsyv3S4sVuQA=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=44
  {
    channelId: "UC4ncvgh5hFr5O83MH7-jRJg",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC4ncvgh5hFr5O83MH7-jRJg",
    title: "Flow Podcast",
    section: "brasil",
    group: "br-colunistas",
    account: "y_d358f7f3d49e",
    blurb: "Podcast brasileiro de entrevistas longas com personalidades.",
    avatar: "https://yt3.googleusercontent.com/ytc/AIdro_kEF_Lu8DNUpCOHSE9xZZRFjXy9kH_G8O9yDP3K9J6o14g=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=39
  {
    channelId: "UCZiYbVptd3PVPf4f6eR6UaQ",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZiYbVptd3PVPf4f6eR6UaQ",
    title: "CazéTV",
    section: "brasil",
    group: "br-cultura",
    account: "y_49e67e262ca9",
    blurb: "Transmissões e cobertura esportiva ao vivo no YouTube.",
    avatar: "https://yt3.googleusercontent.com/Zm3t3pgNIYY1HgkWYaWmU3E--oljMiWqX_2Ig4zkxziTkP3VOR9TGUmgJAPu7XrhP06ebxDg=s176-c-k-c0x00ffffff-no-rj",
  }, // watch=96
];

function shrinkYtAvatar(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  return raw.replace(/([?&=]s)900(-c-k)/i, "$188$2");
}

export function youtubeGroupFor(section) {
  if (section === "tech") return "tech-devs";
  if (section === "brasil") return "br-jornais";
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
