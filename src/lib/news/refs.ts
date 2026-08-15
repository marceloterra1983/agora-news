export type CrossRef = {
  name: string;
  id: string;
  url: string;
  status: "ativa" | "ignorada";
  where: string;
  note: string;
};

export const SUPABASE_DASH = "https://supabase.com/dashboard/project/uqcaodtgrkphuhdkchyh";

/** Única referência que o app consulta. */
export const LIVE_REF: CrossRef = {
  name: "Supabase · posts",
  id: "uqcaodtgrkphuhdkchyh",
  url: "https://uqcaodtgrkphuhdkchyh.supabase.co",
  status: "ativa",
  where: "tabela public.posts",
  note: "Fonte canônica do app. Coleta horária grava aqui (upsert por post_id).",
};

/** Planilhas e IDs antigos — o código não aponta mais para elas. */
export const IGNORED_REFS: CrossRef[] = [
  {
    name: "AGORA_FEED (app antigo)",
    id: "1TAgoz8uXEQy8jHU5Vm7rgkXPc0oxpIzn2C_0jG2THHk",
    url: "https://docs.google.com/spreadsheets/d/1TAgoz8uXEQy8jHU5Vm7rgkXPc0oxpIzn2C_0jG2THHk/edit",
    status: "ignorada",
    where: "NEWS/AI — legado",
    note: "Era a planilha do app. Substituída pelo Supabase.",
  },
  {
    name: "AGORA_FEED (Drive mais nova)",
    id: "1jYncVdJu7tlAB1UlBZe5UF2D80k3L-Tbw_TSJWaaa_I",
    url: "https://docs.google.com/spreadsheets/d/1jYncVdJu7tlAB1UlBZe5UF2D80k3L-Tbw_TSJWaaa_I/edit",
    status: "ignorada",
    where: "NEWS/AI — legado",
    note: "Migrada para o banco. Não é mais lida.",
  },
  {
    name: "AGORA_FEED (cópia velha)",
    id: "1-eRJOGulQFoV0WtUjqAGrD9HrstqRo5LLP3kfIuJ2v4",
    url: "https://docs.google.com/spreadsheets/d/1-eRJOGulQFoV0WtUjqAGrD9HrstqRo5LLP3kfIuJ2v4/edit",
    status: "ignorada",
    where: "legado",
    note: "ID antigo. Não é mais lido.",
  },
  {
    name: "AGORA_FEED (sessão anterior)",
    id: "17vT9DNCF5A3OHJv4ovaY6ErkYeOZZzFuxQ-2tlQv1l4",
    url: "https://docs.google.com/spreadsheets/d/17vT9DNCF5A3OHJv4ovaY6ErkYeOZZzFuxQ-2tlQv1l4/edit",
    status: "ignorada",
    where: "legado",
    note: "ID velho do app.",
  },
];

export const NEWS_AI_FOLDER = {
  name: "NEWS/AI",
  url: "https://drive.google.com/drive/folders/1mScOd7oDx8cTG_aDvdHnlnwwVN8kLMGE",
  note: "Coletas horárias opcionais (só log). O app não lê mais planilhas.",
};

export const FEED_CSV = SUPABASE_DASH;

export function allCrossRefs(): CrossRef[] {
  return [LIVE_REF, ...IGNORED_REFS];
}
