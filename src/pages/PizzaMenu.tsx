import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { getSection, type MenuItem, type MenuSection } from "@/data/menu";
import { peso } from "@/lib/format";
import { Icon, ImageSlot, Leaf, Reveal } from "@/components/ui";
import { ExtraSections, SimpleRow } from "@/components/ordering";
import { CategoryLinks, FOOD_CATEGORIES, SearchBox, VegToggle, useSectionParam } from "@/components/nav";
import { useSite } from "@/context/SiteContext";
import { SiteFooter } from "@/components/chrome";

const pageStyle = { "--u": "calc(min(100vw, 1100px) / 720)" } as CSSProperties;

export default function PizzaMenu() {
  useSectionParam();
  const { vegOnly } = useApp();
  const { header, footer } = useSite().config;
  const pizza = getSection("pizza")!;
  const burgers = getSection("burgers")!;
  const sides = getSection("sides")!;
  const starters = getSection("starters")!;
  const f = (s: MenuSection) => s.items.filter((i) => !vegOnly || i.vegetarian);

  return (
    <div style={pageStyle} className="mx-auto w-full max-w-[1100px]">
      {/* ------------------------------ Header ------------------------------ */}
      <header data-sticky-header className="sticky top-0 z-30 border-b border-line/60 bg-cream sm:border-b-0">
        <div className="flex items-center gap-3 px-4 pb-1 pt-2 sm:h-[44px] sm:px-[calc(22*var(--u))] sm:pb-0 sm:pt-0">
          <Link to="/" className="flex flex-none items-end gap-2" aria-label="GUNI GUNI home">
            <span className="display border-b-2 border-ink pb-[1px] text-[22px] leading-none tracking-[0.01em] sm:text-[calc(21*var(--u))]">{header.brand}</span>
            <span className="text-[7px] font-semibold uppercase tracking-[0.34em] text-ink/80">{header.brandSub}</span>
          </Link>
          <CategoryLinks links={FOOD_CATEGORIES} active="Pizza" className="hidden sm:ml-[calc(40*var(--u))] sm:flex sm:min-w-0 sm:flex-1" itemClassName="px-2 text-[12px]" />
          <div className="ml-auto flex flex-none items-center gap-1.5">
            <VegToggle className="h-8 px-2 text-[12px]" />
            <SearchBox className="w-[min(46vw,160px)] sm:w-[calc(150*var(--u))]" inputClassName="h-8 border-ink/60" align="right" />
          </div>
        </div>
        <CategoryLinks links={FOOD_CATEGORIES} active="Pizza" className="px-3 pb-2 pt-1 sm:hidden" itemClassName="px-2.5 text-[12.5px]" />
      </header>

      {/* ------------------------------- PIZZA ------------------------------ */}
      <section id="pizza" aria-labelledby="pizza-h" className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-[calc(268*var(--u))_1fr] sm:gap-x-[calc(22*var(--u))]">
          <Reveal className="order-2 px-4 pt-3 sm:order-1 sm:pl-[calc(22*var(--u))] sm:pr-0 sm:pt-[calc(12*var(--u))]">
            <h1 id="pizza-h" className="display text-[19vw] leading-[0.86] sm:text-[calc(78*var(--u))]">
              Pizza.
            </h1>
            <p className="kicker mt-2 text-[9px] font-bold tracking-[0.3em]">12-inch hand-tossed</p>
            <ul className="mt-4 sm:mt-[calc(18*var(--u))]">
              {f(pizza).map((item) => (
                <li key={item.id}>
                  <SimpleRow item={item} section={pizza} size="sm" className="min-h-[30px] py-[2px]" />
                </li>
              ))}
              {f(pizza).length === 0 && <li className="py-2 text-[12px] text-muted">No pizzas marked vegetarian.</li>}
            </ul>
            <p className="mt-4 text-[11.5px] sm:mt-[calc(16*var(--u))]">
              <strong className="font-bold">Pizza add-ons:</strong> ask your server for prices.
            </p>
          </Reveal>
          <div className="order-1 relative h-[64vw] sm:order-2 sm:h-[calc(348*var(--u))]">
            <ImageSlot
              name="pizza-slice"
              alt="Cheese-pull pizza slice lifted from the pie"
              className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent,black_14%,black_100%)]"
              position="center"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------ BURGERS ----------------------------- */}
      <section id="burgers" aria-labelledby="burgers-h" className="relative mt-3 sm:mt-[calc(8*var(--u))]">
        <div className="grid grid-cols-1 sm:grid-cols-[calc(390*var(--u))_1fr] sm:gap-x-[calc(16*var(--u))]">
          <div className="relative h-[60vw] sm:h-[calc(265*var(--u))]">
            <ImageSlot name="chicken-burger" alt="Spicy chicken burger with slaw and fries" className="absolute inset-0" position="center" />
          </div>
          <Reveal className="px-4 pt-4 sm:pr-[calc(30*var(--u))] sm:pt-[calc(22*var(--u))]">
            <h2 id="burgers-h" className="display text-[17vw] leading-[0.86] sm:text-[calc(70*var(--u))]">
              Burgers.
            </h2>
            <p className="kicker mt-2 text-[9px] font-bold tracking-[0.3em]">With fries</p>
            <ul className="mt-4 sm:mt-[calc(22*var(--u))]">
              {f(burgers).map((item) => (
                <li key={item.id}>
                  <SimpleRow item={item} section={burgers} size="lg" className="min-h-[32px]" />
                </li>
              ))}
              {f(burgers).length === 0 && <li className="py-2 text-[12px] text-muted">No burgers marked vegetarian on the menu.</li>}
            </ul>
          </Reveal>
        </div>
        <div className="rule-y mx-4 mt-3 sm:mx-[calc(22*var(--u))] sm:mt-[calc(12*var(--u))]" />
      </section>

      {/* ------------------------------- SIDES ------------------------------ */}
      <section id="sides" aria-labelledby="sides-h" className="px-4 pt-4 sm:px-[calc(22*var(--u))] sm:pt-[calc(14*var(--u))]">
        <Reveal className="grid grid-cols-1 gap-y-3 sm:grid-cols-[calc(180*var(--u))_1fr_auto_1fr] sm:items-start sm:gap-x-[calc(24*var(--u))]">
          <h2 id="sides-h" className="display text-[17vw] leading-[0.86] sm:text-[calc(64*var(--u))]">
            Sides.
          </h2>
          <ul className="sm:pt-[calc(8*var(--u))]">
            {f(sides).slice(0, 4).map((item) => (
              <li key={item.id}>
                <SimpleRow item={item} section={sides} className="min-h-[30px] py-[1px]" />
              </li>
            ))}
          </ul>
          <span className="hidden h-[calc(84*var(--u))] w-px self-center bg-ink/70 sm:block" aria-hidden />
          <ul className="sm:pt-[calc(8*var(--u))]">
            {f(sides).slice(4).map((item) => (
              <li key={item.id}>
                <SimpleRow item={item} section={sides} className="min-h-[30px] py-[1px]" />
              </li>
            ))}
          </ul>
          {f(sides).length === 0 && <p className="text-[12px] text-muted sm:col-span-3">No sides are marked vegetarian on the supplied menu.</p>}
        </Reveal>
        <div className="rule-y mt-4 sm:mt-[calc(14*var(--u))]" />
      </section>

      {/* ---------------------------- START FRESH --------------------------- */}
      <section id="starters" aria-labelledby="start-fresh-h" className="relative mt-2 sm:mt-[calc(6*var(--u))]">
        <h2 id="start-fresh-h" className="display relative z-10 px-4 pt-3 text-center text-[16vw] leading-[0.86] sm:absolute sm:left-1/2 sm:top-[calc(14*var(--u))] sm:-translate-x-1/2 sm:px-0 sm:pt-0 sm:text-[calc(64*var(--u))]">
          Start fresh.
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-0 sm:grid-cols-[calc(350*var(--u))_1fr] sm:gap-x-[calc(24*var(--u))]">
          <div className="relative h-[68vw] sm:h-[calc(258*var(--u))]">
            <ImageSlot name="mediterranean-salad" alt="Mediterranean salad with cucumber ribbons and feta" className="absolute inset-0" position="center" />
            {starters.items[0] && <PhotoItem item={starters.items[0]} section={starters} className="absolute bottom-4 right-3 sm:bottom-auto sm:right-[calc(-24*var(--u))] sm:top-[calc(96*var(--u))]" hidden={vegOnly && !starters.items[0].vegetarian} />}
          </div>
          <div className="relative h-[68vw] sm:h-[calc(258*var(--u))]">
            <ImageSlot name="beef-carpaccio" alt="Beef carpaccio with arugula, capers and toasted bread" className="absolute inset-0" position="center" />
            {starters.items[1] && <PhotoItem item={starters.items[1]} section={starters} className="absolute bottom-4 left-3 sm:bottom-[calc(-4*var(--u))] sm:left-[calc(34*var(--u))]" hidden={vegOnly && !starters.items[1].vegetarian} />}
          </div>
        </div>
        {vegOnly && (
          <p className="px-4 pt-2 text-[12px] text-muted sm:px-[calc(22*var(--u))]">Neither starter carries a vegetarian mark on the supplied menu.</p>
        )}
      </section>

      {starters.items.length > 2 && (
        <ul className="grid grid-cols-1 gap-1 px-4 pt-4 sm:grid-cols-2 sm:px-[calc(22*var(--u))]" aria-label="More starters">
          {starters.items.slice(2).filter((i) => !vegOnly || i.vegetarian).map((item) => (
            <li key={item.id}>
              <SimpleRow item={item} section={starters} size="lg" />
            </li>
          ))}
        </ul>
      )}
      <ExtraSections page="pizza" />

      {/* ------------------------------ Footer ------------------------------ */}
      <footer className="relative mt-8 px-4 pb-[calc(var(--sab)+24px)] pt-6 sm:mt-[calc(16*var(--u))] sm:px-[calc(22*var(--u))] sm:pt-[calc(14*var(--u))]">
        <div className="rule-y absolute inset-x-4 top-0 sm:inset-x-[calc(22*var(--u))]" />
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between sm:pt-0">
          <Link
            to="/menu/pasta"
            className="inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold transition hover:opacity-70 sm:min-h-0 sm:text-[15px]"
          >
            <Icon.ArrowLeft size={18} /> Back to pasta
          </Link>
          <p className="order-last text-center text-[11px] text-ink/85 sm:order-none sm:text-[12px]">{footer.serviceNote}</p>
          <Link
            to="/menu/drinks"
            className="inline-flex min-h-[44px] items-center justify-end gap-2 text-[14px] font-semibold transition hover:opacity-70 sm:min-h-0 sm:text-[15px]"
          >
            Drinks & dessert <Icon.ArrowRight size={18} />
          </Link>
        </div>
      </footer>
      {footer.show.onMenuPages && <SiteFooter />}
    </div>
  );
}

/** Priced label sitting on a photograph (Mediterranean Salad / Beef Carpaccio). */
function PhotoItem({ item, section, className, hidden }: { item: MenuItem; section: MenuSection; className?: string; hidden?: boolean }) {
  const { openItem, unavailable } = useApp();
  const isUnavailable = unavailable.has(item.id);
  if (hidden) return null;
  const words = item.name.split(" ");
  return (
    <button
      type="button"
      onClick={() => !isUnavailable && openItem(item.id)}
      aria-disabled={isUnavailable || undefined}
      aria-label={`${item.name}, ${peso(item.price ?? 0)}${isUnavailable ? ", currently unavailable" : ". Add to order"}`}
      data-section={section.id}
      className={cn(
        "menu-row z-10 flex items-end gap-2 rounded-sm bg-cream/90 px-2.5 py-2 text-left shadow-sm backdrop-blur-[2px] transition sm:bg-cream/85",
        isUnavailable && "opacity-50",
        className,
      )}
    >
      <span>
        <span className="block text-[15px] font-bold leading-[1.1] sm:text-[calc(15*var(--u))]">
          {words.length > 1 ? (
            <>
              {words.slice(0, -1).join(" ")}
              <br />
              {words.slice(-1)}
            </>
          ) : (
            item.name
          )}
          {item.vegetarian && <Leaf size={14} className="ml-1" />}
        </span>
        <span className="mt-1 block text-[16px] font-bold tabular-nums sm:text-[calc(16*var(--u))]">{peso(item.price ?? 0)}</span>
        {isUnavailable && <span className="kicker mt-1 block text-[8px]">Unavailable</span>}
      </span>
      {!isUnavailable && (
        <span className="plus-btn mb-0.5" aria-hidden>
          <Icon.Plus size={13} />
        </span>
      )}
    </button>
  );
}
