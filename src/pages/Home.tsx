import { useState, type CSSProperties } from "react";
import { cn } from "@/utils/cn";
import { useSite } from "@/context/SiteContext";
import type { HomeConfig } from "@/data/site";
import { FitLines, FitText, Icon, ImageSlot, Reveal } from "@/components/ui";
import { useScrollTop } from "@/components/nav";
import { SiteFooter, SiteHeader, SmartLink } from "@/components/chrome";
import { SectionsAt } from "@/components/sections";

const u = (n: number) => `calc(${n} * var(--u))`;
export const HOME_UNIT = { "--u": "calc(min(100vw, 1180px) / 866)" } as CSSProperties;

export default function Home() {
  useScrollTop();
  const { home } = useSite().config;
  return (
    <div style={HOME_UNIT} className="mx-auto w-full max-w-[1180px]">
      <SiteHeader />
      {home.hero.show && <Hero />}
      {home.marquee.show && <Marquee />}
      <SectionsAt placement="home-after-hero" />
      {home.place.show && <ThePlace />}
      <SectionsAt placement="home-after-place" />
      {home.everything.show && <LittleOfEverything />}
      {home.seeYou.show && <SeeYou />}
      <SectionsAt placement="home-before-footer" />
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------- Hero ---------------------------------- */
function PizzaStage({ className }: { className?: string }) {
  const { hero } = useSite().config.home;
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 translate-x-[4%] translate-y-[3%] rounded-full border border-ink/70" aria-hidden />
      <svg viewBox="0 0 400 400" className="absolute -inset-[8%] h-[116%] w-[116%]" aria-hidden>
        <defs>
          <path id="arc" d="M 200 200 m -178 0 a 178 178 0 1 1 356 0 a 178 178 0 1 1 -356 0" />
        </defs>
        <text className="kicker fill-ink" style={{ fontSize: 11, letterSpacing: "0.34em", fontWeight: 600 }}>
          <textPath href="#arc" startOffset="29%">
            {hero.arcText}
          </textPath>
        </text>
      </svg>
      <ImageSlot
        name="hero-pizza"
        alt="Whole pizza, top-down"
        fit="contain"
        className={cn("h-full w-full rounded-full shadow-[0_28px_50px_-20px_rgba(0,0,0,0.45)]", hero.spin && "spin-slow")}
        imgClassName="rounded-full"
        hideLabel
      />
    </div>
  );
}

/**
 * Oversized headline that always fits the exact width of its column.
 * Each line is auto-scaled so the type is flush on both sides, can never spill into the
 * handwritten notes, and looks identical whatever font is configured. The em padding
 * reserves the ascender/descender overhang that tight leading would otherwise let escape.
 */
function HeroHeadline({ line1, line2, className, skew = -4 }: { line1: string; line2: string; className?: string; skew?: number }) {
  return (
    <h1 className={cn("display relative z-10 select-text", className)} style={{ transform: `skewX(${skew}deg)`, letterSpacing: "-0.01em" }}>
      <FitText as="span" text={line1} spanClassName="leading-[0.84] pt-[0.16em]" />
      <FitText as="span" text={line2} spanClassName="leading-[0.84] pb-[0.1em]" />
    </h1>
  );
}

/** Handwritten note. Rotated from its left edge so it lifts away from the text below it. */
function HandNote({ text, className, style, align = "left" }: { text: string; className?: string; style?: CSSProperties; align?: "left" | "right" }) {
  return (
    <p
      className={cn("hand whitespace-pre-line uppercase text-ink/80", align === "right" ? "origin-bottom-right text-right" : "origin-bottom-left", className)}
      style={{ letterSpacing: "0.02em", ...style }}
    >
      {text}
    </p>
  );
}

function HeroTagline({ hero, ctaClass, max }: { hero: HomeConfig["hero"]; ctaClass: string; max: number }) {
  return (
    <>
      {/* Auto-fitted: the longest line spans the column exactly, so it can never be cut off. */}
      <FitLines text={hero.tagline} className="font-extrabold tracking-[-0.03em]" lineClassName="leading-[1.04]" max={max} min={17} />
      {hero.ctaLabel && (
        <SmartLink href={hero.ctaHref} className={cn("kicker inline-flex items-center gap-3 border border-ink font-semibold transition hover:bg-ink hover:text-cream", ctaClass)}>
          {hero.ctaLabel} <Icon.ArrowRight size={13} strokeWidth={2.5} />
        </SmartLink>
      )}
    </>
  );
}

function Hero() {
  const { hero } = useSite().config.home;
  return (
    <section
      aria-label="Welcome"
      className="hero-grid relative overflow-hidden px-4 pb-7 pt-5 sm:px-6 sm:pb-9 sm:pt-7 lg:px-[clamp(16px,2vw,26px)] lg:pb-[clamp(18px,2.4vw,30px)] lg:pt-[clamp(16px,2.2vw,28px)]"
    >
      {/* Handwritten note — its own cell, so it can never sit under the headline. */}
      <HandNote
        text={hero.noteLeft}
        className="relative z-10 [grid-area:note] -rotate-[2deg] text-[clamp(14px,4vw,17px)] leading-[1.15] lg:mt-[26%] lg:-rotate-[8deg] lg:text-[clamp(10px,1.05vw,13px)] lg:leading-[1.12]"
      />

      {/* Headline — auto-fitted to its column and layered ON TOP of the yellow panel. */}
      <HeroHeadline line1={hero.line1} line2={hero.line2} skew={-4} className="min-w-0 [grid-area:title] lg:self-center" />

      {/* Pizza. The yellow panel is anchored here and stretches left, behind the headline. */}
      <div className="relative min-w-0 [grid-area:pizza] sm:self-center lg:self-start lg:pt-[3%]">
        <div className="hero-panel" aria-hidden />
        <PizzaStage className="relative z-10 aspect-square w-full" />
      </div>

      {/* Tagline, button and the second note — side by side on phone/tablet, stacked on desktop. */}
      <div className="relative z-10 flex items-end justify-between gap-5 [grid-area:tag] lg:mt-[16%] lg:flex-col lg:items-start lg:justify-start lg:gap-0">
        <div className="min-w-0 lg:w-full">
          <HeroTagline hero={hero} max={30} ctaClass="mt-4 px-5 py-3 sm:mt-5 lg:mt-[9%] lg:py-2.5" />
        </div>
        <HandNote
          text={hero.noteRight}
          align="right"
          className="rotate-[3deg] text-[clamp(14px,4vw,16px)] leading-[1.15] lg:mt-[14%] lg:ml-2 lg:origin-bottom-left lg:-rotate-[6deg] lg:text-left lg:text-[clamp(12px,1.2vw,16px)]"
        />
      </div>
    </section>
  );
}

/* --------------------------------- Marquee -------------------------------- */
function Marquee() {
  const { text } = useSite().config.home.marquee;
  const items = Array.from({ length: 8 });
  return (
    <div className="overflow-hidden bg-yellow py-[11px]" aria-label={text}>
      <div className="marquee-track flex w-max items-center">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
            {items.map((_, i) => (
              <span key={i} className="kicker flex items-center whitespace-nowrap font-semibold">
                <span className="px-6">{text}</span>
                <span className="hair w-10 opacity-70" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- The Place ------------------------------- */
function ThePlace() {
  const { place } = useSite().config.home;
  return (
    <section id="place" aria-label="The place">
      <div className="relative h-[72vw] min-h-[300px] sm:h-[calc(575*var(--u))]">
        <ImageSlot name="the-place" alt="GUNI GUNI open-air dining room with hanging lights and plants" className="absolute inset-0" position="center 60%" hideLabel />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />
        <div className="absolute left-4 top-5 bg-yellow px-3 py-2 sm:left-[calc(24*var(--u))] sm:top-[calc(22*var(--u))] sm:px-[calc(16*var(--u))] sm:py-[calc(12*var(--u))]">
          <p className="kicker whitespace-pre-line font-semibold leading-[1.7]">{place.label}</p>
        </div>
        <div className="absolute right-0 top-0 hidden h-[77%] w-[calc(54*var(--u))] flex-col items-center bg-ink pt-[calc(28*var(--u))] text-cream sm:flex">
          <span className="block w-px flex-none bg-cream/80" style={{ height: u(70) }} aria-hidden />
          <p className="kicker mt-5 font-semibold" style={{ writingMode: "vertical-rl" }}>
            {place.vertical}
          </p>
        </div>
        <Reveal className="absolute inset-x-0 bottom-[-2px] px-1 sm:px-0">
          <FitText as="h2" text={place.bigText} className="display text-shadow-soft text-white" />
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------- A little of everything ------------------------ */
function LittleOfEverything() {
  const { everything } = useSite().config.home;
  const tabs = everything.tabs.length ? everything.tabs : [{ id: "none", num: "01", label: "Menu", href: "/menu/pasta", main: "pasta-plate", round: "salad-plate" }];
  const [active, setActive] = useState(0);
  const idx = Math.min(active, tabs.length - 1);
  const slide = tabs[idx];
  const prev = () => setActive((idx + tabs.length - 1) % tabs.length);
  const next = () => setActive((idx + 1) % tabs.length);

  return (
    <section aria-label={everything.title.replace(/\n/g, " ")} className="px-4 pt-6 sm:px-[calc(40*var(--u))] sm:pt-[calc(14*var(--u))]">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[calc(300*var(--u))_1fr] sm:gap-[calc(14*var(--u))]">
        <Reveal className="sm:pt-[calc(24*var(--u))]">
          <h2 className="display whitespace-pre-line text-[17vw] leading-[0.9] sm:text-[calc(62*var(--u))]">{everything.title}</h2>
          <div className="rule-y mt-5 w-16 sm:mt-[calc(22*var(--u))] sm:w-[calc(64*var(--u))]" style={{ height: 3 }} />
          <p className="kicker mt-5 whitespace-pre-line text-[11px] leading-[1.9] sm:mt-[calc(20*var(--u))]">{everything.kicker}</p>
          <div className="mt-7 flex items-center gap-4 sm:mt-[calc(30*var(--u))]">
            <button type="button" onClick={prev} className="grid h-11 w-11 place-items-center rounded-full border border-ink transition hover:bg-ink hover:text-cream" aria-label="Previous">
              <Icon.ChevronLeft size={16} />
            </button>
            <SmartLink href={slide.href} className="kicker border-b-2 border-ink pb-1.5 font-bold">
              {everything.ctaLabel} <Icon.ArrowRight size={12} strokeWidth={2.5} className="ml-1 inline" />
            </SmartLink>
            <button type="button" onClick={next} className="grid h-11 w-11 place-items-center rounded-full border border-ink transition hover:bg-ink hover:text-cream" aria-label="Next">
              <Icon.ChevronRight size={16} />
            </button>
          </div>
        </Reveal>

        <Reveal className="relative h-[92vw] sm:h-[calc(330*var(--u))]" delay={120}>
          <ImageSlot key={`m-${slide.id}`} name={slide.main} alt={slide.label} className="anim-fade-in absolute left-0 top-0 h-[78%] w-[76%] sm:h-full sm:w-[calc(390*var(--u))]" />
          <ImageSlot
            key={`r-${slide.id}`}
            name={slide.round}
            alt={`${slide.label} plate`}
            decorative
            className="anim-pop-in absolute left-[42%] top-[38%] h-[58vw] w-[58vw] rounded-full shadow-[0_24px_40px_-18px_rgba(0,0,0,0.45)] sm:left-[calc(215*var(--u))] sm:top-[calc(100*var(--u))] sm:h-[calc(280*var(--u))] sm:w-[calc(280*var(--u))]"
            imgClassName="rounded-full"
            hideLabel
          />
          <p className="hand absolute right-0 top-0 -rotate-6 whitespace-pre-line text-right text-[15px] uppercase leading-[1.1] text-ink/70 sm:right-[calc(6*var(--u))] sm:top-[calc(40*var(--u))] sm:text-[calc(15*var(--u))]">
            {everything.note}
          </p>
        </Reveal>
      </div>

      <div className="no-scrollbar mt-10 flex items-center overflow-x-auto sm:mt-[calc(46*var(--u))]" role="tablist" aria-label="Featured menus">
        {tabs.map((s, i) => (
          <div key={s.id} className="flex flex-none items-center">
            {i > 0 && <span className="mx-6 h-6 w-px bg-ink/60 sm:mx-[calc(32*var(--u))]" aria-hidden />}
            <button
              type="button"
              role="tab"
              aria-selected={idx === i}
              onClick={() => setActive(i)}
              className={cn("kicker relative whitespace-nowrap px-2 py-3 font-bold tracking-[0.22em] transition", idx === i ? "text-ink" : "text-ink/70 hover:text-ink")}
            >
              <span className="mr-2 font-medium text-ink/60">{s.num} /</span> {s.label}
              {idx === i && <span className="absolute bottom-0 left-2 h-[3px] w-8 bg-yellow" aria-hidden />}
            </button>
          </div>
        ))}
      </div>
      <div className="h-6 sm:h-[calc(22*var(--u))]" />
    </section>
  );
}

/* -------------------------------- See you --------------------------------- */
function SeeYou() {
  const { seeYou } = useSite().config.home;
  return (
    <section className="relative overflow-hidden bg-yellow" aria-label={seeYou.title.replace(/\n/g, " ")}>
      <div className="relative grid grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-[1fr_auto_calc(220*var(--u))] sm:items-center sm:gap-[calc(28*var(--u))] sm:px-[calc(40*var(--u))] sm:py-[calc(26*var(--u))] sm:pr-[calc(150*var(--u))]">
        <Reveal>
          <h2 className="display whitespace-pre-line text-[15vw] leading-[0.88] sm:text-[calc(86*var(--u))]">{seeYou.title}</h2>
        </Reveal>
        <span className="hidden h-[calc(140*var(--u))] w-px bg-ink/80 sm:block" aria-hidden />
        <Reveal delay={100}>
          <p className="kicker whitespace-pre-line text-[11px] leading-[1.9]">{seeYou.text}</p>
          {seeYou.ctaLabel && (
            <SmartLink href={seeYou.ctaHref} className="kicker mt-6 inline-flex items-center gap-3 border border-ink px-6 py-3 font-semibold transition hover:bg-ink hover:text-cream sm:mt-[calc(26*var(--u))]">
              {seeYou.ctaLabel} <Icon.ArrowRight size={13} strokeWidth={2.5} />
            </SmartLink>
          )}
        </Reveal>
      </div>
      <ImageSlot name="plants" alt="Tropical leaves" fit="contain" decorative className="pointer-events-none absolute -right-2 bottom-0 top-0 hidden w-[calc(150*var(--u))] sm:block" position="right center" hideLabel />
    </section>
  );
}
