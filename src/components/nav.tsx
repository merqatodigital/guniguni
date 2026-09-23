import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { hasVariants, searchItems, sectionLabel } from "@/data/menu";
import { peso } from "@/lib/format";
import { Icon, Leaf } from "@/components/ui";

export interface CategoryLink {
  label: string;
  to?: string;
  /** Category listed on the printed menu but whose items were not part of the supplied artwork. */
  unsupplied?: boolean;
}

/** Shared category set used on the food menu pages. */
export const FOOD_CATEGORIES: CategoryLink[] = [
  { label: "Breakfast", unsupplied: true },
  { label: "Starters", to: "/menu/pizza?section=starters" },
  { label: "Mains", unsupplied: true },
  { label: "Pasta", to: "/menu/pasta" },
  { label: "Pizza", to: "/menu/pizza?section=pizza" },
  { label: "Burgers", to: "/menu/pizza?section=burgers" },
  { label: "Desserts", unsupplied: true },
  { label: "Drinks", to: "/menu/drinks" },
];

interface CategoryLinksProps {
  links: CategoryLink[];
  active?: string;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
}

export function CategoryLinks({ links, active, className, itemClassName, activeClassName }: CategoryLinksProps) {
  const { toast } = useApp();
  return (
    <nav aria-label="Menu categories" className={cn("no-scrollbar flex items-center gap-1 overflow-x-auto overscroll-x-contain", className)}>
      {links.map((l) => {
        const isActive = l.label === active;
        const cls = cn(
          "flex-none whitespace-nowrap rounded-[3px] px-2.5 py-1.5 text-[12.5px] transition hover:bg-ink/5",
          itemClassName,
          isActive && cn("bg-yellow font-semibold hover:bg-yellow", activeClassName),
        );
        if (l.unsupplied || !l.to) {
          return (
            <button
              key={l.label}
              type="button"
              className={cls}
              onClick={() => toast(`${l.label} items weren't included in the supplied menu yet — please ask your server.`)}
              aria-describedby={undefined}
            >
              {l.label}
            </button>
          );
        }
        return (
          <Link key={l.label} to={l.to} className={cls} aria-current={isActive ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* --------------------------------- Search --------------------------------- */
export function SearchBox({
  className,
  inputClassName,
  compact = false,
  placeholder = "Find a dish...",
  align = "left",
}: {
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  placeholder?: string;
  align?: "left" | "right";
}) {
  const { openItem } = useApp();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(!compact);
  const [focused, setFocused] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = searchItems(q);
  const open = focused && q.trim().length > 0;

  useEffect(() => {
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setFocused(false);
        if (compact && !q) setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [compact, q]);

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          setTimeout(() => input.current?.focus(), 20);
        }}
        className={cn("grid h-9 w-9 flex-none place-items-center rounded-full border border-ink/70", className)}
        aria-label="Find a dish"
      >
        <Icon.Search size={15} />
      </button>
    );
  }

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <label className={cn("flex h-9 items-center gap-2 rounded-full border border-ink/70 bg-cream px-3", inputClassName)}>
        <Icon.Search size={14} className="flex-none text-ink" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQ("");
              setFocused(false);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Enter" && results[0]) {
              openItem(results[0].item.id);
              setFocused(false);
            }
          }}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="dish-search-results"
          aria-autocomplete="list"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted/80"
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="grid h-6 w-6 place-items-center rounded-full hover:bg-ink/10">
            <Icon.X size={12} />
          </button>
        )}
      </label>

      {open && (
        <div
          id="dish-search-results"
          role="listbox"
          className={cn(
            "anim-pop-in absolute top-full z-[70] mt-2 max-h-[60vh] w-[min(92vw,360px)] overflow-y-auto rounded-xl border border-line bg-cream p-1 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-muted">No dishes match “{q}”.</p>
          ) : (
            results.map(({ item, section }) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  openItem(item.id);
                  setFocused(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-yellow/40 focus:bg-yellow/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[14px] font-medium">
                    {item.name}
                    {item.vegetarian && <Leaf size={14} />}
                  </span>
                  <span className="block text-[11px] uppercase tracking-[0.14em] text-muted">{sectionLabel(section)}</span>
                </span>
                <span className="flex-none text-right text-[12.5px] tabular-nums">
                  {hasVariants(section) && item.prices ? (
                    <>
                      <span className="block">Glass {peso(item.prices.glass)}</span>
                      <span className="block text-muted">Bottle {peso(item.prices.bottle)}</span>
                    </>
                  ) : (
                    peso(item.price ?? 0)
                  )}
                </span>
                <span className="plus-btn" aria-hidden>
                  <Icon.Plus size={12} />
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Vegetarian toggle ------------------------- */
export function VegToggle({ className }: { className?: string }) {
  const { vegOnly, setVegOnly } = useApp();
  return (
    <button
      type="button"
      aria-pressed={vegOnly}
      onClick={() => setVegOnly(!vegOnly)}
      className={cn(
        "flex h-9 flex-none items-center gap-1.5 rounded-full px-3 text-[12.5px] transition",
        vegOnly ? "bg-yellow font-semibold" : "hover:bg-ink/5",
        className,
      )}
    >
      <Leaf size={17} /> Vegetarian
    </button>
  );
}

/* ------------------------------- Section scroll --------------------------- */
/** Scrolls to `?section=<id>` after navigation (works with the hash router). */
export function useSectionParam() {
  const [params] = useSearchParams();
  const location = useLocation();
  const section = params.get("section");
  useEffect(() => {
    if (!section) {
      window.scrollTo({ top: 0 });
      return;
    }
    const t = window.setTimeout(() => {
      const el = document.getElementById(section);
      if (el) {
        const sticky = document.querySelector<HTMLElement>("[data-sticky-header]");
        const offset = (sticky?.getBoundingClientRect().height ?? 56) + 8;
        const y = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [section, location.key]);
  return section;
}

export function useScrollTop() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash, location.key]);
}
