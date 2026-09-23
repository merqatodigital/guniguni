import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { getSection } from "@/data/menu";
import { FitText, Icon, ImageSlot, Logo, Reveal } from "@/components/ui";
import { ExtraSections, PastaRow } from "@/components/ordering";
import { CategoryLinks, SearchBox, VegToggle, useScrollTop } from "@/components/nav";
import { useSite } from "@/context/SiteContext";
import { SiteFooter, SocialLinks } from "@/components/chrome";

const pageStyle = { "--u": "calc(min(100vw, 1100px) / 720)" } as CSSProperties;

const CATEGORIES = [
  { label: "Breakfast", unsupplied: true },
  { label: "Starters", to: "/menu/pizza?section=starters" },
  { label: "Mains", unsupplied: true },
  { label: "Pasta", to: "/menu/pasta" },
  { label: "Pizza", to: "/menu/pizza?section=pizza" },
  { label: "Desserts", unsupplied: true },
  { label: "Drinks", to: "/menu/drinks" },
];

export default function PastaMenu() {
  useScrollTop();
  const { vegOnly, toast } = useApp();
  const { header, footer } = useSite().config;
  const brand = `${header.brand} ${header.brandSub}`.trim();
  const tagliatelle = getSection("pasta-tagliatelle")!;
  const ravioli = getSection("pasta-ravioli")!;
  const filt = (s: typeof tagliatelle) => s.items.filter((i) => !vegOnly || i.vegetarian);
  const tag = filt(tagliatelle);
  const rav = filt(ravioli);

  return (
    <div style={pageStyle} className="mx-auto w-full max-w-[1100px]">
      {/* ------------------------------ Header ------------------------------ */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-2 pt-3 sm:px-[calc(20*var(--u))] sm:pb-1 sm:pt-[calc(8*var(--u))]">
        <Link to="/" aria-label="GUNI GUNI home" className="flex-none">
          <Logo size={72} className="sm:h-[calc(84*var(--u))] sm:w-[calc(84*var(--u))]" />
        </Link>
        <div className="flex-1 sm:flex-none">
          <p className="cond text-[17px] font-medium uppercase tracking-[0.2em] sm:text-[calc(18*var(--u))]">{brand}</p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.36em] text-muted">{header.tagline}</p>
        </div>
        <nav aria-label="Primary" className="cond order-3 flex w-full items-center gap-4 text-[13px] font-medium uppercase tracking-[0.04em] sm:order-none sm:ml-[calc(34*var(--u))] sm:w-auto sm:gap-[calc(22*var(--u))]">
          <Link to="/" className="py-1 hover:text-ink/60">
            Home
          </Link>
          <span className="bg-yellow px-3 py-1.5" aria-current="page">
            Menu
          </span>
          <Link to="/#place" className="py-1 hover:text-ink/60">
            The place
          </Link>
          <Link to="/#contact" className="py-1 hover:text-ink/60">
            Contact
          </Link>
        </nav>
        <p className="hand ml-auto hidden -rotate-[10deg] text-[calc(16*var(--u))] leading-[1.05] text-ink sm:block">
          Food
          <br />
          Brings
          <br />
          People
          <br />
          Together.
        </p>
      </header>

      {/* ---------------------------- THE MENU. ---------------------------- */}
      <section aria-labelledby="the-menu" className="px-3 pt-2 sm:px-[calc(28*var(--u))]">
        <FitText as="h1" text="THE MENU." className="display" spanClassName="leading-[0.84]" />
        <p id="the-menu" className="mt-3 text-center text-[13px] tracking-[0.2em] sm:mt-[calc(6*var(--u))] sm:text-[max(13px,calc(17*var(--u)))]">
          A little of everything. Made to enjoy.
        </p>
      </section>

      {/* -------------------------- Category bar -------------------------- */}
      <div className="sticky top-0 z-30 bg-cream px-3 pb-2 pt-3 sm:px-0 sm:pt-[calc(24*var(--u))]">
        <div className="flex flex-col gap-2 rounded-[6px] border border-ink/70 px-2 py-1.5 sm:mx-[2px] sm:h-11 sm:flex-row sm:items-center sm:px-[calc(18*var(--u))] sm:py-0">
          <CategoryLinks links={CATEGORIES} active="Pasta" className="-mx-1 sm:mx-0 sm:min-w-0 sm:flex-1 sm:gap-[calc(6*var(--u))]" itemClassName="font-medium px-2.5" />
          <div className="flex flex-none items-center gap-2 sm:ml-auto">
            <SearchBox className="flex-1 sm:w-[calc(150*var(--u))] sm:flex-none" inputClassName="h-9" align="right" />
            <VegToggle />
            <button
              type="button"
              className="hidden h-9 w-9 flex-none place-items-center rounded-full hover:bg-ink/5 sm:grid"
              aria-label="More categories"
              onClick={() => toast("More sections: Starters, Pizza, Burgers, Sides and Drinks are linked above.")}
            >
              <Icon.ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------- Homemade pasta ------------------------- */}
      <section id="pasta" aria-labelledby="homemade-pasta" className="relative">
        {/* heading row */}
        <div className="relative px-4 pt-4 sm:px-[calc(22*var(--u))] sm:pt-[calc(10*var(--u))]">
          <p className="kicker text-ink/85">Homemade, heartfelt</p>
          <div className="flex flex-wrap items-end gap-x-[calc(26*var(--u))]">
            <h2 id="homemade-pasta" className="display mt-1 text-[16vw] leading-[0.86] sm:text-[calc(76*var(--u))]">
              Homemade pasta
            </h2>
            <div className="hidden pb-[2px] sm:block sm:w-[calc(232*var(--u))]">
              <p className="flex items-end gap-3">
                <span className="cond text-[calc(20*var(--u))] font-light leading-none">01 /</span>
                <span className="kicker translate-y-[-2px] text-[11px] font-semibold tracking-[0.34em]">Tagliatelle</span>
              </p>
              <div className="hair mt-2 opacity-90" />
            </div>
          </div>
          <p className="hand absolute right-4 top-1 -rotate-[10deg] text-[18px] leading-[1.0] sm:right-[calc(22*var(--u))] sm:top-[calc(8*var(--u))] sm:text-[calc(21*var(--u))]">
            Pasta
            <br />
            makes
            <br />
            everything
            <br />
            <span className="stroke-y px-0.5">better.</span>
          </p>
        </div>

        {/* photo + list */}
        <div className="mt-4 grid grid-cols-1 sm:mt-[calc(14*var(--u))] sm:grid-cols-[calc(355*var(--u))_1fr] sm:gap-x-[calc(37*var(--u))]">
          <Reveal className="relative h-[70vw] sm:h-auto sm:min-h-[calc(485*var(--u))]">
            <ImageSlot name="pasta-plate" alt="Truffle cream tagliatelle with mushrooms and parmesan" className="absolute inset-0" position="center" hideLabel />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" aria-hidden />
            <span className="absolute right-2 top-2 rounded-sm bg-cream/85 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-muted">Photo not supplied · pasta-plate</span>
            <div className="absolute left-5 top-5 sm:left-[calc(24*var(--u))] sm:top-[calc(22*var(--u))]">
              <p className="cond text-[11px] font-light uppercase leading-[1.9] tracking-[0.34em] text-white">
                Good
                <br />
                pasta
                <br />
                happier
                <br />
                people.
              </p>
              <div className="rule-y mt-2 w-9" />
            </div>
            <div className="absolute bottom-5 left-5 sm:bottom-[calc(28*var(--u))] sm:left-[calc(24*var(--u))]">
              <p className="cond text-[11px] font-semibold uppercase tracking-[0.34em] text-white">Truffle cream.</p>
              <p className="cond mt-1 text-[8.5px] font-light uppercase leading-[1.8] tracking-[0.34em] text-white/85">
                Rich flavors
                <br />
                real ingredients.
              </p>
            </div>
          </Reveal>

          <Reveal className="px-4 pt-4 sm:px-0 sm:pr-[calc(26*var(--u))] sm:pt-[calc(6*var(--u))]" delay={80}>
            <div className="mb-1 sm:hidden">
              <p className="flex items-end gap-3">
                <span className="cond text-[20px] font-light leading-none">01 /</span>
                <span className="kicker text-[11px] font-semibold tracking-[0.34em]">Tagliatelle</span>
              </p>
              <div className="hair mt-2" />
            </div>
            <ul aria-label="Tagliatelle">
              {tag.map((item) => (
                <li key={item.id}>
                  <PastaRow item={item} section={tagliatelle} />
                </li>
              ))}
              {tag.length === 0 && <li className="py-3 text-[12px] text-muted">No tagliatelle marked vegetarian on the menu.</li>}
            </ul>

            <div className="mt-6 sm:mt-[calc(20*var(--u))]">
              <p className="flex items-end gap-3">
                <span className="cond text-[20px] font-light leading-none sm:text-[calc(20*var(--u))]">02 /</span>
                <span className="kicker translate-y-[-2px] text-[11px] font-semibold tracking-[0.34em]">Ravioli</span>
              </p>
              <div className="hair mt-2" />
            </div>
            <ul aria-label="Ravioli" className="mt-1">
              {rav.map((item) => (
                <li key={item.id}>
                  <PastaRow item={item} section={ravioli} />
                </li>
              ))}
              {rav.length === 0 && <li className="py-3 text-[12px] text-muted">No ravioli marked vegetarian on the menu.</li>}
            </ul>
          </Reveal>
        </div>
      </section>

      <ExtraSections page="pasta" />

      {/* --------------------------- Room for more ---------------------------
          Grid columns: text · plate cutout · handwritten note. Each owns its space, so the
          photograph can never cover the heading or the links at any screen size. */}
      <section className="mt-6 bg-yellow sm:mt-[calc(14*var(--u))]" aria-labelledby="room-for-more">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-4 pb-6 pt-7 sm:grid-cols-[minmax(0,1fr)_28%_auto] sm:gap-x-[calc(14*var(--u))] sm:px-[calc(22*var(--u))] sm:pb-[calc(20*var(--u))] sm:pt-[calc(26*var(--u))]">
          <div className="min-w-0">
            <p className="kicker text-ink/80">Still hungry?</p>
            <h2 id="room-for-more" className="display mt-2 text-[13vw] leading-[0.9] sm:text-[calc(58*var(--u))]">
              Room for more?
            </h2>
          </div>

          {/* Plate cutout — its own column, bleeding above the band as in the reference. */}
          <ImageSlot
            name="tuna-tartare"
            alt="Tuna tartare on a blue plate with wonton chips"
            fit="contain"
            decorative
            hideLabel
            className="pointer-events-none order-last col-span-2 mt-4 h-[42vw] w-full sm:order-none sm:col-span-1 sm:-mt-[calc(30*var(--u))] sm:mb-[calc(-10*var(--u))] sm:h-[calc(200*var(--u))] sm:self-center"
          />

          <p className="hand -rotate-[10deg] whitespace-nowrap text-right text-[13px] leading-[1.05] sm:text-[calc(16*var(--u))]">
            Same
            <br />
            good food.
            <br />
            Different
            <br />
            cravings.
          </p>

          {/* Links sit on their own full-width row, always clear of the photo. */}
          <div className="col-span-2 mt-6 grid grid-cols-1 gap-y-3 sm:col-span-3 sm:mt-[calc(22*var(--u))] sm:flex sm:items-start">
            <MoreLink label="Breakfast" blurb="Start your day right." onClick={() => toast("Breakfast items weren't included in the supplied menu yet — please ask your server.")} />
            <span className="hidden h-10 w-px bg-ink/70 sm:mx-[calc(20*var(--u))] sm:block" aria-hidden />
            <MoreLink label="Bistro favorites" blurb="Local flavors, big comfort." to="/menu/pizza?section=burgers" />
            <span className="hidden h-10 w-px bg-ink/70 sm:mx-[calc(20*var(--u))] sm:block" aria-hidden />
            <MoreLink label="Drinks & dessert" blurb="Good meals, sweeter endings." to="/menu/drinks" />
          </div>
        </div>
      </section>

      {/* ------------------------------ Footer ------------------------------ */}
      <footer className="flex flex-wrap items-center gap-x-6 gap-y-4 px-4 pb-[calc(var(--sab)+20px)] pt-5 sm:px-[calc(20*var(--u))] sm:pt-[calc(16*var(--u))]">
        <Logo size={72} className="sm:h-[calc(84*var(--u))] sm:w-[calc(84*var(--u))]" />
        <div>
          <p className="cond text-[15px] font-medium uppercase tracking-[0.2em] sm:text-[calc(16*var(--u))]">{brand}</p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.36em] text-muted">{header.tagline}</p>
        </div>
        <nav aria-label="Footer" className="cond flex items-center text-[12px] uppercase tracking-[0.06em] sm:ml-[calc(30*var(--u))]">
          <Link to="/" className="px-4 hover:text-ink/60">
            Home
          </Link>
          <span className="h-4 w-px bg-ink/60" aria-hidden />
          <span className="px-4">Menu</span>
          <span className="h-4 w-px bg-ink/60" aria-hidden />
          <Link to="/#contact" className="px-4 hover:text-ink/60">
            Contact
          </Link>
        </nav>
        <div className="ml-auto flex flex-col items-end gap-2">
          <SocialLinks />
          <p className="text-[10px] text-ink/85">{footer.serviceNote}</p>
          <p className="text-[7.5px] uppercase tracking-[0.34em] text-muted">{footer.thanks}</p>
        </div>
      </footer>
      {footer.show.onMenuPages && <SiteFooter />}
    </div>
  );
}

function MoreLink({ label, blurb, to, onClick }: { label: string; blurb: string; to?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="cond flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.02em] sm:text-[calc(15*var(--u))]">
        {label} <Icon.ArrowRight size={14} strokeWidth={2.5} />
      </span>
      <span className="mt-1 block text-[11px] text-ink/85">{blurb}</span>
    </>
  );
  const cls = cn("block text-left transition hover:opacity-70");
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
