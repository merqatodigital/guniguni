import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { getSection, type MenuSection } from "@/data/menu";
import { Icon, ImageSlot, Logo, Reveal } from "@/components/ui";
import { DualRow, ExtraSections, SimpleRow } from "@/components/ordering";
import { CategoryLinks, SearchBox, useSectionParam, type CategoryLink } from "@/components/nav";
import { useSite } from "@/context/SiteContext";
import { SiteFooter, SocialLinks } from "@/components/chrome";

const pageStyle = { "--u": "calc(min(100vw, 1100px) / 720)" } as CSSProperties;

const DRINK_NAV: CategoryLink[] = [
  { label: "Food", to: "/menu/pasta" },
  { label: "Cocktails", to: "/menu/drinks?section=cocktails" },
  { label: "Beers", to: "/menu/drinks?section=beers" },
  { label: "Wine", to: "/menu/drinks?section=wine" },
  { label: "Spirits", to: "/menu/drinks?section=spirits" },
];

function Heading({ id, children, size = "md" }: { id: string; children: ReactNode; size?: "lg" | "md" }) {
  return (
    <div className="flex items-center gap-3 sm:gap-[calc(14*var(--u))]">
      <h2 id={id} className={cn("display leading-[0.9]", size === "lg" ? "text-[38px] sm:text-[calc(40*var(--u))]" : "text-[32px] sm:text-[calc(34*var(--u))]")}>
        {children}
      </h2>
      <span className="rule-y flex-1" aria-hidden />
    </div>
  );
}

function SimpleList({ section, className }: { section: MenuSection; className?: string }) {
  return (
    <ul className={cn("mt-3 sm:mt-[calc(10*var(--u))]", className)} aria-label={section.title}>
      {section.items.map((item) => (
        <li key={item.id}>
          <SimpleRow item={item} section={section} size="lg" className="min-h-[28px] py-[1px]" />
        </li>
      ))}
    </ul>
  );
}

function DualList({ section }: { section: MenuSection }) {
  return (
    <div className="mt-2">
      <div className="grid grid-cols-[1fr_56px_60px_26px] gap-x-1 text-[12.5px] text-ink/85 sm:grid-cols-[1fr_62px_68px_26px]" aria-hidden>
        <span />
        <span>Glass</span>
        <span>Bottle</span>
        <span />
      </div>
      <ul className="mt-1" aria-label={`${section.title} — glass and bottle prices`}>
        {section.items.map((item) => (
          <li key={item.id}>
            <DualRow item={item} section={section} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DrinksMenu() {
  const active = useSectionParam();
  const { toast } = useApp();
  const { header, footer } = useSite().config;
  const cocktails = getSection("cocktails")!;
  const beers = getSection("beers")!;
  const mixed = getSection("mixed-drinks")!;
  const wine = getSection("wine")!;
  const spirits = getSection("spirits")!;
  const activeLabel = DRINK_NAV.find((n) => n.to?.endsWith(`section=${active}`))?.label ?? "Cocktails";

  return (
    <div style={pageStyle} className="mx-auto w-full max-w-[1100px]">
      {/* ------------------------------ Header ------------------------------ */}
      <header data-sticky-header className="sticky top-0 z-30 border-b border-ink/70 bg-cream">
        <div className="flex items-center gap-3 px-4 py-2 sm:h-[calc(52*var(--u))] sm:px-[calc(20*var(--u))] sm:py-0">
          <Link to="/" className="flex flex-none items-center gap-3" aria-label="GUNI GUNI home">
            <Logo size={46} className="sm:h-[calc(54*var(--u))] sm:w-[calc(54*var(--u))]" />
            <span className="display text-[18px] leading-[0.9] sm:text-[calc(19*var(--u))]">
              {header.brand}
              <br />
              {header.brandSub}
            </span>
          </Link>
          <CategoryLinks links={DRINK_NAV} active={activeLabel} className="hidden sm:ml-[calc(28*var(--u))] sm:flex sm:min-w-0 sm:flex-1 sm:gap-[calc(8*var(--u))]" itemClassName="text-[13px] px-2.5" />
          <div className="ml-auto flex flex-none items-center gap-2 sm:gap-[calc(14*var(--u))]">
            <SearchBox compact align="right" />
            <span className="hidden h-6 w-px bg-ink/60 sm:block" aria-hidden />
            <SocialLinks />
            <span className="hidden h-6 w-px bg-ink/60 sm:block" aria-hidden />
            <p className="hidden text-right text-[7px] font-bold leading-[1.6] tracking-[0.3em] sm:block">
              GOOD FOOD
              <br />
              GOOD DRINKS
              <br />
              GOOD PEOPLE
            </p>
          </div>
        </div>
        <CategoryLinks links={DRINK_NAV} active={activeLabel} className="px-3 pb-2 sm:hidden" itemClassName="text-[13px]" />
      </header>

      {/* ------------------------------- Hero ------------------------------- */}
      <section className="px-4 pt-4 text-center sm:pt-[calc(12*var(--u))]" aria-labelledby="the-drinks">
        <h1 id="the-drinks" className="display text-[19vw] leading-[0.86] sm:text-[calc(76*var(--u))]">
          The drinks.
        </h1>
        <div className="rule-y mx-auto mt-1 w-16 sm:w-[calc(66*var(--u))]" style={{ height: 3 }} />
        <p className="mt-3 text-[13px] tracking-[0.18em] sm:text-[max(13px,calc(15*var(--u)))]">Something to sip. A reason to stay.</p>
      </section>

      {/* ----------------------------- Cocktails ---------------------------- */}
      <section id="cocktails" aria-labelledby="cocktails-h" className="relative mt-3 sm:mt-[calc(10*var(--u))]">
        <div className="grid grid-cols-1 sm:grid-cols-[calc(368*var(--u))_1fr]">
          <Reveal className="px-4 pb-2 sm:pl-[calc(22*var(--u))] sm:pr-0">
            <Heading id="cocktails-h" size="lg">
              Cocktails
            </Heading>
            <SimpleList section={cocktails} className="sm:pr-[calc(70*var(--u))]" />
          </Reveal>
          <div className="relative mt-2 h-[60vw] sm:-mt-[calc(16*var(--u))] sm:h-auto">
            <ImageSlot
              name="cocktails"
              alt="Orange cocktails and a green margarita with a salted rim"
              className="absolute inset-0 sm:[mask-image:linear-gradient(to_right,transparent,black_10%,black_100%)]"
              position="center bottom"
            />
            <p className="hand absolute bottom-3 right-4 -rotate-[12deg] text-right text-[18px] leading-[1.0] sm:bottom-[calc(6*var(--u))] sm:right-[calc(6*var(--u))] sm:text-[calc(19*var(--u))]">
              Good
              <br />
              Drinks
              <br />
              Brighter
              <br />
              Days
            </p>
          </div>
        </div>
        <div className="hair mt-2 opacity-80" />
      </section>

      {/* ------------------------ Beers | Mixed drinks ---------------------- */}
      <section aria-label="Beers and mixed drinks" className="grid grid-cols-1 sm:grid-cols-[calc(336*var(--u))_1px_1fr]">
        <Reveal id="beers" as="div" className="px-4 pb-3 pt-3 sm:pl-[calc(22*var(--u))] sm:pr-[calc(30*var(--u))] sm:pt-[calc(10*var(--u))]">
          <Heading id="beers-h">Beers</Heading>
          <SimpleList section={beers} className="sm:pr-[calc(40*var(--u))]" />
        </Reveal>
        <span className="hidden bg-ink/70 sm:my-[calc(8*var(--u))] sm:block" aria-hidden />
        <Reveal id="mixed-drinks" as="div" className="px-4 pb-3 pt-1 sm:pl-[calc(22*var(--u))] sm:pr-[calc(26*var(--u))] sm:pt-[calc(10*var(--u))]" delay={80}>
          <Heading id="mixed-h">Mixed drinks</Heading>
          <SimpleList section={mixed} className="sm:pr-[calc(40*var(--u))]" />
        </Reveal>
        <div className="hair opacity-80 sm:col-span-3" />
      </section>

      {/* -------------------------- Wine | Spirits -------------------------- */}
      <section
        aria-label="Wine and spirits"
        className="grid grid-cols-1 sm:grid-cols-[calc(336*var(--u))_1px_1fr] sm:grid-rows-[auto_1fr] sm:[grid-template-areas:'wine_div_spirits'_'photos_div_spirits']"
      >
        <Reveal id="wine" as="div" className="px-4 pb-4 pt-3 sm:[grid-area:wine] sm:pl-[calc(22*var(--u))] sm:pr-[calc(30*var(--u))] sm:pt-[calc(10*var(--u))]">
          <Heading id="wine-h">Wine</Heading>
          <DualList section={wine} />
        </Reveal>
        <span className="hidden bg-ink/70 sm:my-[calc(8*var(--u))] sm:block sm:[grid-area:div]" aria-hidden />
        <Reveal id="spirits" as="div" className="order-3 px-4 pb-4 pt-3 sm:order-none sm:[grid-area:spirits] sm:pl-[calc(22*var(--u))] sm:pr-[calc(26*var(--u))] sm:pt-[calc(10*var(--u))]" delay={80}>
          <Heading id="spirits-h">Spirits</Heading>
          <DualList section={spirits} />
        </Reveal>

        {/* Photos under the wine list */}
        <div className="order-4 sm:order-none sm:[grid-area:photos] sm:pr-[calc(10*var(--u))]">
          <div className="relative mx-4 mt-2 h-[62vw] sm:mx-0 sm:mt-0 sm:h-[calc(270*var(--u))]">
            <ImageSlot name="milkshakes" alt="Four milkshakes topped with cream, chocolate, caramel and popcorn" className="absolute inset-0" position="center" />
            <div className="absolute bottom-[8%] left-0 right-[4%] bg-yellow px-5 py-3 sm:px-[calc(18*var(--u))] sm:py-[calc(10*var(--u))]" style={{ clipPath: "polygon(0 14%, 100% 0, 99% 100%, 1% 92%)" }}>
              <p className="hand text-[22px] font-semibold leading-none sm:text-[calc(23*var(--u))]">Prefer something sweet?</p>
              <button
                type="button"
                onClick={() => toast("The non-alcoholic drinks list wasn't part of the supplied menu — please ask your server.")}
                className="mt-1.5 inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.12em] hover:opacity-70"
              >
                EXPLORE NON-ALCOHOLIC DRINKS <Icon.ArrowRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <div className="relative mx-4 mt-2 h-[58vw] sm:mx-0 sm:mt-[calc(6*var(--u))] sm:h-[calc(226*var(--u))]">
            <ImageSlot name="jeep" alt="GUNI GUNI yellow jeep under the Hostel · Bistro · Bar sign" className="absolute inset-0" position="center" />
          </div>
        </div>
      </section>

      <ExtraSections page="drinks" />

      {/* ------------------------------ Footer ------------------------------ */}
      <footer className="relative mt-6 px-4 pb-[calc(var(--sab)+20px)] pt-4 sm:mt-[calc(10*var(--u))] sm:px-[calc(22*var(--u))]">
        <div className="rule-y absolute right-4 top-0 w-[38%] sm:right-[calc(22*var(--u))] sm:w-[calc(140*var(--u))]" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-ink/85">{footer.serviceNote}</p>
          <Link to="/menu/pizza" className="inline-flex items-center gap-2 text-[12.5px] font-bold hover:opacity-70">
            <Icon.ArrowLeft size={16} /> Back to food menu
          </Link>
        </div>
      </footer>
      {footer.show.onMenuPages && <SiteFooter />}
    </div>
  );
}
