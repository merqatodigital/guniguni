import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_SITE, fontStack, googleFontsUrl, mergeConfig, type FontRole, type MediaAsset, type MediaKind, type SiteConfig, type ThemeConfig } from "@/data/site";
import { setMenu } from "@/data/menu";
import { useApp } from "@/context/AppContext";
import { ApiError } from "@/lib/backend";
import { idbAll, idbGet, kindFromFile } from "@/lib/media";

const DRAFT_KEY = "gg.site.draft";
const PUB_KEY = "gg.site.published";

function readLocal(key: string): SiteConfig | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? mergeConfig(DEFAULT_SITE, JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: SiteConfig | null): boolean {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export interface ResolvedMedia {
  url: string;
  kind: MediaKind;
  alt?: string;
  name?: string;
}

interface SiteContextValue {
  config: SiteConfig;
  published: SiteConfig;
  draft: SiteConfig | null;
  hasDraft: boolean;
  isDirty: boolean;
  siteLoaded: boolean;
  updateDraft: (fn: (c: SiteConfig) => SiteConfig) => void;
  discardDraft: () => void;
  publish: (token: string) => Promise<void>;
  importConfig: (c: unknown) => void;
  resetToDefaults: () => void;
  resolveUrl: (ref: string) => string;
  mediaFor: (key: string) => ResolvedMedia | null;
  uploadMedia: (token: string, key: string, file: File) => Promise<MediaAsset>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  const cssName: Record<string, string> = { cream2: "cream-2", yellow2: "yellow-2" };
  for (const [k, v] of Object.entries(theme.colors)) root.style.setProperty(`--color-${cssName[k] ?? k}`, v);
  const roles: FontRole[] = ["display", "cond", "hand", "sans"];
  for (const role of roles) root.style.setProperty(`--font-${role}`, fontStack(role, theme.fonts[role] || DEFAULT_SITE.theme.fonts[role]));

  const families = roles.map((r) => theme.fonts[r]).filter(Boolean);
  document.querySelectorAll<HTMLLinkElement>("link[data-gg-font]").forEach((l) => {
    if (!families.includes(l.dataset.ggFont ?? "")) l.remove();
  });
  for (const fam of families) {
    if (document.querySelector(`link[data-gg-font="${CSS.escape(fam)}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontsUrl(fam);
    link.dataset.ggFont = fam;
    document.head.appendChild(link);
  }
  const custom = document.querySelector<HTMLLinkElement>("link[data-gg-custom-font]");
  if (theme.customFontCssUrl) {
    if (!custom) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = theme.customFontCssUrl;
      link.dataset.ggCustomFont = "1";
      document.head.appendChild(link);
    } else if (custom.href !== theme.customFontCssUrl) custom.href = theme.customFontCssUrl;
  } else custom?.remove();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.colors.yellow);
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { backend, toast } = useApp();
  const [published, setPublished] = useState<SiteConfig>(() => readLocal(PUB_KEY) ?? DEFAULT_SITE);
  const [draft, setDraft] = useState<SiteConfig | null>(() => readLocal(DRAFT_KEY));
  const [siteLoaded, setSiteLoaded] = useState(false);
  const [idbUrls, setIdbUrls] = useState<Record<string, string>>({});

  const config = draft ?? published;
  const configRef = useRef(config);
  configRef.current = config;

  // Keep the live menu store in sync before children render.
  useMemo(() => setMenu(config.menu), [config.menu]);

  // Load the published config from the backend (and follow live updates).
  useEffect(() => {
    if (!backend) return;
    let alive = true;
    const load = () =>
      backend
        .getSite()
        .then((s) => {
          if (!alive) return;
          if (s) {
            const merged = mergeConfig(DEFAULT_SITE, s);
            setPublished(merged);
            writeLocal(PUB_KEY, merged);
          }
          setSiteLoaded(true);
        })
        .catch(() => alive && setSiteLoaded(true));
    void load();
    const unsub = backend.subscribe(() => void load());
    return () => {
      alive = false;
      unsub();
    };
  }, [backend]);

  // Demo-mode media lives in IndexedDB → object URLs.
  useEffect(() => {
    idbAll()
      .then((all) => {
        const m: Record<string, string> = {};
        for (const [k, b] of Object.entries(all)) m[k] = URL.createObjectURL(b);
        setIdbUrls(m);
      })
      .catch(() => {});
  }, []);

  useEffect(() => applyTheme(config.theme), [config.theme]);
  useEffect(() => {
    document.title = config.seo.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", config.seo.description);
  }, [config.seo]);

  const updateDraft = useCallback(
    (fn: (c: SiteConfig) => SiteConfig) => {
      const next = { ...fn(configRef.current), updatedAt: new Date().toISOString() };
      setDraft(next);
      if (!writeLocal(DRAFT_KEY, next)) toast("Draft is too large for browser storage — publish or export it soon.");
    },
    [toast],
  );

  const discardDraft = useCallback(() => {
    setDraft(null);
    writeLocal(DRAFT_KEY, null);
  }, []);

  const publish = useCallback(
    async (token: string) => {
      if (!backend) throw new ApiError("NETWORK", "Not connected yet — try again in a moment.");
      const toPublish: SiteConfig = { ...configRef.current, updatedAt: new Date().toISOString() };
      const saved = mergeConfig(DEFAULT_SITE, await backend.saveSite(token, toPublish));
      setPublished(saved);
      writeLocal(PUB_KEY, saved);
      setDraft(null);
      writeLocal(DRAFT_KEY, null);
    },
    [backend],
  );

  const importConfig = useCallback((c: unknown) => {
    const merged = mergeConfig(DEFAULT_SITE, c);
    setDraft(merged);
    writeLocal(DRAFT_KEY, merged);
  }, []);

  const resetToDefaults = useCallback(() => {
    setDraft(DEFAULT_SITE);
    writeLocal(DRAFT_KEY, DEFAULT_SITE);
  }, []);

  const resolveUrl = useCallback((ref: string) => (ref.startsWith("idb:") ? (idbUrls[ref.slice(4)] ?? "") : ref), [idbUrls]);

  const mediaFor = useCallback(
    (key: string): ResolvedMedia | null => {
      const a = config.media[key];
      if (!a) return null;
      return { ...a, url: resolveUrl(a.url) };
    },
    [config.media, resolveUrl],
  );

  const uploadMedia = useCallback(
    async (token: string, key: string, file: File) => {
      if (!backend) throw new ApiError("NETWORK", "Not connected yet.");
      const kind = kindFromFile(file);
      const asset = await backend.uploadMedia(token, key, file, { name: file.name, kind });
      if (asset.url.startsWith("idb:")) {
        const blob = await idbGet(key);
        if (blob) {
          setIdbUrls((m) => {
            if (m[key]) URL.revokeObjectURL(m[key]);
            return { ...m, [key]: URL.createObjectURL(blob) };
          });
        }
      }
      return asset;
    },
    [backend],
  );

  const isDirty = useMemo(() => draft != null && JSON.stringify(draft) !== JSON.stringify(published), [draft, published]);

  const value: SiteContextValue = {
    config,
    published,
    draft,
    hasDraft: draft != null,
    isDirty,
    siteLoaded,
    updateDraft,
    discardDraft,
    publish,
    importConfig,
    resetToDefaults,
    resolveUrl,
    mediaFor,
    uploadMedia,
  };
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}

/** Safe for components that may render outside the provider. */
export function useSiteMedia(key: string): ResolvedMedia | null {
  const ctx = useContext(SiteContext);
  return ctx ? ctx.mediaFor(key) : null;
}
