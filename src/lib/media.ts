import type { MediaKind } from "@/data/site";

/* --------------------------- IndexedDB (demo storage) --------------------------- */
const DB_NAME = "gg-media";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const idbPut = (key: string, blob: Blob) => run("readwrite", (s) => s.put(blob, key)).then(() => undefined);
export const idbGet = (key: string) => run("readonly", (s) => s.get(key) as IDBRequest<Blob | undefined>);
export const idbDelete = (key: string) => run("readwrite", (s) => s.delete(key)).then(() => undefined);
export async function idbAll(): Promise<Record<string, Blob>> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const out: Record<string, Blob> = {};
    const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (c) {
        out[String(c.key)] = c.value as Blob;
        c.continue();
      } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

/* ------------------------------- Files & URLs ------------------------------- */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export function kindFromFile(file: File): MediaKind {
  return file.type.startsWith("video/") ? "video" : "image";
}

export function embedUrlFor(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function kindFromUrl(url: string): MediaKind {
  if (embedUrlFor(url)) return "embed";
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url)) return "video";
  return "image";
}

/** Downscale large photos so uploads stay light; keeps PNG/WebP alpha for cutouts. */
export async function processImage(file: File, maxEdge = 1800): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const type = keepAlpha ? "image/png" : "image/jpeg";
  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), type, 0.86));
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export function stripHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
    return (doc.body.textContent ?? "").replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  } catch {
    return html.replace(/<[^>]+>/g, " ");
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
