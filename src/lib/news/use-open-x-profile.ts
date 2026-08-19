import { profileByHandle } from "@/lib/news/profiles";
import {
  lookupXProfile,
  summarizeProfile,
  type FoundProfile,
} from "@/lib/news/server";
import { useCallback, useRef, useState } from "react";

export type OpenFrom = "search" | "interest" | null;

export function useOpenXProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoundProfile | null>(null);
  const [summary, setSummary] = useState("");
  const [llmWarning, setLlmWarning] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [openFrom, setOpenFrom] = useState<OpenFrom>(null);
  const [openingHandle, setOpeningHandle] = useState<string | null>(null);
  const seq = useRef(0);

  const close = useCallback(() => {
    seq.current += 1;
    setOpenFrom(null);
    setResult(null);
    setOpeningHandle(null);
    setLoading(false);
    setSummarizing(false);
    setLlmWarning(null);
    setError(null);
  }, []);

  const resetOnQuery = useCallback(() => {
    seq.current += 1;
    setResult(null);
    setSummary("");
    setLlmWarning(null);
    setError(null);
    setOpenFrom(null);
    setOpeningHandle(null);
    setLoading(false);
    setSummarizing(false);
  }, []);

  const openHandle = useCallback(async (raw: string) => {
    const q = raw.replace(/^@+/, "").trim();
    if (!q) return;
    const id = ++seq.current;
    setOpeningHandle(q.toLowerCase());
    setLoading(true);
    setSummarizing(false);
    setError(null);
    setSummary("");
    setLlmWarning(null);
    try {
      const profile = await lookupXProfile({ data: { handle: q } });
      if (id !== seq.current) return;
      setLoading(false);
      if (!profile.found) {
        setResult(null);
        setOpeningHandle(null);
        setError("Perfil não encontrado. Confira o @ e tente de novo.");
        return;
      }
      setResult(profile);
      if (profile.summary) setSummary(profile.summary);
      if (profileByHandle(profile.handle) && profile.summary) return;
      setSummarizing(true);
      const extra = await summarizeProfile({
        data: {
          handle: profile.handle,
          name: profile.name,
          bio: profile.bio,
        },
      });
      if (id !== seq.current) return;
      if (extra.summary) {
        setSummary(extra.summary);
      }
      if (extra.llmWarning) setLlmWarning(extra.llmWarning);
    } catch {
      if (id !== seq.current) return;
      setResult(null);
      setOpeningHandle(null);
      setError("Não deu para abrir o perfil agora. Tente de novo.");
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setSummarizing(false);
      }
    }
  }, []);

  function isActive(from: Exclude<OpenFrom, null>, handle: string) {
    const key = handle.toLowerCase();
    return (
      openFrom === from &&
      (result?.handle.toLowerCase() === key || openingHandle === key)
    );
  }

  const dismissResult = useCallback(() => {
    setResult(null);
    setOpenFrom(null);
    setOpeningHandle(null);
  }, []);

  return {
    loading,
    error,
    result,
    summary,
    llmWarning,
    summarizing,
    openFrom,
    openingHandle,
    close,
    resetOnQuery,
    openHandle,
    setOpenFrom,
    dismissResult,
    isActive,
  };
}
