import { upsertPosts } from "./admin";
import { clipAtWord } from "./summary-core.mjs";
import { packMediaLabel } from "./story-media-meta.mjs";
import { invalidateSupabaseList } from "./supabase";
import type { Story } from "./types";

/** Grava o PT hidratado na 1ª abertura para o corte de 280 não voltar. */
export async function persistHydratedBody(story: Story, body: string): Promise<boolean> {
  const text = String(body || "").trim();
  if (!story.id || !text) return false;
  if (text === String(story.body || "").trim()) return false;
  const written = await upsertPosts([
    {
      post_id: story.id,
      account: story.source,
      posted_at: story.publishedAt,
      posted_at_sp: story.publishedAt,
      content: story.original || text,
      translation_pt: text,
      summary_pt: clipAtWord(text, 180),
      post_url: story.url,
      media_label: packMediaLabel(story.media, {
        quoted: story.quoted,
        replyTo: story.replyTo,
        card: story.card,
        xArticle: story.xArticle,
        assets: story.assets,
      }),
      image_url: story.image || "",
      category: story.category,
      batch_name: story.batch,
      source: "x",
    },
  ]);
  if (written.ok) invalidateSupabaseList();
  return written.ok;
}
