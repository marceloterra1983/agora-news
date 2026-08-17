import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Story } from "./types";

type NewsState = {
  stories: Record<string, Story>;
  savedIds: string[];
  ingest: (list: Story[]) => void;
  toggleSave: (story: Story) => void;
  isSaved: (id: string) => boolean;
  clearSaved: () => void;
};

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      stories: {},
      savedIds: [],
      ingest: (list) =>
        set((s) => {
          const next = { ...s.stories };
          for (const item of list) next[item.id] = item;
          return { stories: next };
        }),
      toggleSave: (story) =>
        set((s) => {
          const exists = s.savedIds.includes(story.id);
          return {
            stories: { ...s.stories, [story.id]: story },
            savedIds: exists
              ? s.savedIds.filter((id) => id !== story.id)
              : [story.id, ...s.savedIds],
          };
        }),
      isSaved: (id) => get().savedIds.includes(id),
      clearSaved: () => set({ savedIds: [] }),
    }),
    {
      name: "agora-news",
      skipHydration: true,
      partialize: (s) => ({
        savedIds: s.savedIds,
        stories: Object.fromEntries(
          s.savedIds
            .map((id) => [id, s.stories[id]] as const)
            .filter((entry) => entry[1]),
        ),
      }),
    },
  ),
);
