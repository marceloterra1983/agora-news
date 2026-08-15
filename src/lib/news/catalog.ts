import { listFallbackCategories } from "./feed";
import type { Category } from "./types";

export function listCategories(): Category[] {
  return listFallbackCategories();
}
