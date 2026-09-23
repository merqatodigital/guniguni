import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  Upload,
  X,
} from "@/lib/lucide";
import { cn } from "@/utils/cn";
import { photos } from "@/data/assets";
import { useSiteMedia } from "@/context/SiteContext";
import { FacebookIcon, InstagramIcon } from "@/components/brandIcons";

/** Site-wide icon set — modern Lucide stroke icons. */
export const Icon = {
  Search,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Trash: Trash2,
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  Phone,
  Mail,
  Map: MapPin,
  Upload,
  Download,
  Chat: MessageCircle,
  Send,
  Eye,
  Sparkles,
  Menu,
  Refresh: RefreshCw,
  CalendarDays,
  ChartColumn,
  TrendingUp,
  TrendingDown,
};

/** Vegetarian marking, matching the green leaf used on the supplied menus. */
export function Leaf({ className, size = 16, title = "Vegetarian" }: { className?: string; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn("inline-block align-[-2px] text-leaf", className)} role="img" aria-label={title}>
      <path
        fill="currentColor"
        d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"
      />
    </svg>
  );
}

/* -------------------------------- Photo slot ------------------------------ */
interface ImageSlotProps {
  name: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fit?: "cover" | "contain";
  style?: CSSProperties;
  position?: string;
  hideLabel?: boolean;
  /** Show native controls (video sections) instead of an ambient autoplay loop. */
  controls?: boolean;
  /**
   * For cutouts that overlap other content: when no photo is supplied, render nothing at all
   * rather than an empty panel that would cover the headings, prices or controls underneath.
   */
  decorative?: boolean;
}

/** Renders the admin-uploaded media for a slot, else the bundled photograph, else a labelled empty slot. */
export function ImageSlot({ name, alt, className, imgClassName, fit = "cover", style, position, hideLabel, controls, decorative }: ImageSlotProps) {
  const media = useSiteMedia(name);
  const src = media?.url || photos[name];
  const kind = media?.url ? media.kind : "image";
  // An overlapping cutout with no artwork must not block the content beneath it.
  if (!src && decorative) return null;
  if (src && kind === "video") {
    return (
      <div className={cn("overflow-hidden", className)} style={style}>
        <video
          src={src}
          className={cn("block h-full w-full", fit === "cover" ? "object-cover" : "object-contain", imgClassName)}
          style={position ? { objectPosition: position } : undefined}
          autoPlay={!controls}
          muted={!controls}
          loop={!controls}
          playsInline
          controls={controls}
          preload="metadata"
          aria-label={alt}
        />
      </div>
    );
  }
  if (src && kind === "embed") {
    return (
      <div className={cn("overflow-hidden", className)} style={style}>
        <iframe src={src} title={alt} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
      </div>
    );
  }
  if (src) {
    return (
      <div className={cn("overflow-hidden", className)} style={style}>
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={cn("block h-full w-full", fit === "cover" ? "object-cover" : "object-contain", imgClassName)}
          style={position ? { objectPosition: position } : undefined}
        />
      </div>
    );
  }
  return (
    <div role="img" aria-label={`Photo not supplied: ${alt}`} className={cn("placeholder-photo relative flex items-end overflow-hidden", className)} style={style}>
      {!hideLabel && <span className="m-2 rounded-sm bg-cream/90 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-muted">Photo not supplied · {name}</span>}
    </div>
  );
}

/* ----------------------------- Hidden admin entry ----------------------------- */
const clickLog: number[] = [];
/** Three quick clicks/taps on the logo (anywhere on the site) open the backoffice sign-in. */
export function useSecretAdminEntry() {
  const navigate = useNavigate();
  return (e: ReactMouseEvent) => {
    const now = Date.now();
    while (clickLog.length && now - clickLog[0] > 1800) clickLog.shift();
    clickLog.push(now);
    if (e.detail >= 3 || clickLog.length >= 3) {
      clickLog.length = 0;
      e.preventDefault();
      e.stopPropagation();
      navigate("/admin");
    }
  };
}

export function Logo({ size = 64, className }: { size?: number; className?: string }) {
  const media = useSiteMedia("logo");
  const src = media?.url || photos.logo;
  const onClick = useSecretAdminEntry();
  if (src) {
    return (
      <img
        src={src}
        alt="GUNI GUNI"
        width={size}
        height={size}
        draggable={false}
        onClick={onClick}
        className={cn("block select-none rounded-full", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label="GUNI GUNI logo — original logo file not supplied"
      onClick={onClick}
      className={cn("grid select-none place-items-center rounded-full border-2 border-dashed border-ink/40 bg-cream-2", className)}
      style={{ width: size, height: size }}
    >
      <span className="text-center text-[7px] font-semibold uppercase leading-tight tracking-[0.18em] text-muted">
        logo
        <br />
        missing
      </span>
    </div>
  );
}

/* --------------------------------- FitText -------------------------------- */
interface FitTextProps {
  text: string;
  className?: string;
  spanClassName?: string;
  style?: CSSProperties;
  max?: number;
  min?: number;
  as?: "h1" | "h2" | "div" | "p" | "span";
}

/** Scales a single line so it spans exactly the width of its container (selectable HTML text). */
export function FitText({ text, className, spanClassName, style, max = 900, min = 18, as: Tag = "div" }: FitTextProps) {
  const wrap = useRef<HTMLElement>(null);
  const span = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    const s = span.current;
    if (!el || !s) return;
    let lastW = -1;
    const fit = () => {
      const W = el.clientWidth;
      if (!W) return;
      s.style.fontSize = "100px";
      // offsetWidth is layout-based, so an ancestor skew/rotation can't distort the measurement.
      const w = s.offsetWidth || s.getBoundingClientRect().width || 1;
      const size = Math.max(min, Math.min(max, (W / w) * 100));
      s.style.fontSize = `${size}px`;
      lastW = W;
    };
    fit();
    const ro = new ResizeObserver((entries) => {
      const W = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(W - lastW) > 0.5) fit();
    });
    ro.observe(el);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(fit).catch(() => {});
    fonts?.addEventListener?.("loadingdone", fit);
    return () => {
      ro.disconnect();
      fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [text, max, min]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={wrap as any} className={cn("block w-full leading-none", className)} style={style}>
      <span ref={span} className={cn("inline-block whitespace-nowrap leading-[0.82]", spanClassName)}>
        {text}
      </span>
    </Tag>
  );
}

/**
 * Multi-line text scaled so the LONGEST line exactly spans the container, with one uniform
 * font size for every line. Guarantees the block can never overflow its column, whatever
 * copy is typed in the admin or which font is configured.
 */
export function FitLines({
  text,
  className,
  lineClassName,
  max = 200,
  min = 12,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  lineClassName?: string;
  max?: number;
  min?: number;
  as?: "p" | "div" | "h1" | "h2";
}) {
  const wrap = useRef<HTMLElement>(null);
  const lines = text.split("\n");

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let lastW = -1;
    const fit = () => {
      const W = el.clientWidth;
      const inners = Array.from(el.querySelectorAll<HTMLElement>("[data-fit-line]"));
      if (!W || inners.length === 0) return;
      el.style.fontSize = "100px";
      const widest = Math.max(...inners.map((n) => n.offsetWidth || 0), 1);
      el.style.fontSize = `${Math.max(min, Math.min(max, (W / widest) * 100))}px`;
      lastW = W;
    };
    fit();
    const ro = new ResizeObserver((entries) => {
      const W = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(W - lastW) > 0.5) fit();
    });
    ro.observe(el);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(fit).catch(() => {});
    fonts?.addEventListener?.("loadingdone", fit);
    return () => {
      ro.disconnect();
      fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [text, max, min]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={wrap as any} className={cn("block w-full", className)}>
      {lines.map((line, i) => (
        <span key={i} className={cn("block", lineClassName)}>
          <span data-fit-line className="inline-block whitespace-nowrap">
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/* --------------------------------- Reveal --------------------------------- */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} id={id} className={cn("reveal", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}

/* ------------------------------ Media query hook -------------------------- */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/* ---------------------------------- Modal --------------------------------- */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  variant: "sheet" | "drawer";
  labelledBy: string;
  children: ReactNode;
  panelClassName?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, variant, labelledBy, children, panelClassName }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const restore = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onClose = () => onCloseRef.current();
    restore.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]:not([disabled])") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return; // only the top-most dialog reacts
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && panel.current) {
        const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      restore.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const positional =
    variant === "sheet"
      ? isDesktop
        ? "inset-0 m-auto h-fit w-[min(520px,92vw)] max-h-[86vh] rounded-2xl anim-pop-in"
        : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[22px] anim-sheet-up"
      : isDesktop
        ? "right-0 top-0 h-full w-[min(460px,92vw)] anim-slide-in-right"
        : "inset-x-0 bottom-0 h-[94dvh] rounded-t-[22px] anim-sheet-up";

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="presentation">
      <div className="anim-fade-in absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={cn("absolute flex flex-col overflow-hidden bg-cream shadow-2xl", positional, panelClassName)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* --------------------------------- Stepper -------------------------------- */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const btn = cn("grid place-items-center rounded-full border border-ink/70 transition active:scale-95 disabled:opacity-30", size === "md" ? "h-11 w-11" : "h-9 w-9");
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Icon.Minus size={16} />
      </button>
      <span className={cn("cond min-w-[2ch] text-center tabular-nums", size === "md" ? "text-xl" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Icon.Plus size={16} />
      </button>
    </div>
  );
}
