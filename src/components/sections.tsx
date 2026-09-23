import { useState } from "react";
import { cn } from "@/utils/cn";
import { useSite } from "@/context/SiteContext";
import type { BlogSection, ContactSection, CtaSection, FaqSection, GallerySection, HoursSection, LocationSection, Placement, Section, TextSection, VideoSection } from "@/data/site";
import { Icon, ImageSlot, Reveal } from "@/components/ui";
import { SmartLink } from "@/components/chrome";

export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {text
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed">
            {p.trim()}
          </p>
        ))}
    </div>
  );
}

/** Renders all visible admin-created sections for a placement. */
export function SectionsAt({ placement, pageId }: { placement: Placement; pageId?: string }) {
  const { config } = useSite();
  const list = config.sections.filter((s) => s.visible && s.placement === placement && (placement !== "page" || s.pageId === pageId));
  return (
    <>
      {list.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </>
  );
}

const TONE: Record<Section["tone"], string> = {
  cream: "bg-cream text-ink",
  yellow: "bg-yellow text-ink",
  ink: "bg-ink text-cream",
};

export function SectionRenderer({ section }: { section: Section }) {
  return (
    <Reveal as="section" id={`s-${section.id}`} className={cn("px-4 py-10 sm:px-[calc(40*var(--u))] sm:py-14", TONE[section.tone])}>
      <div className="mx-auto max-w-[1180px]">
        {section.type !== "cta" && (
          <header className="mb-6 sm:mb-8">
            {section.kicker && <p className="kicker opacity-80">{section.kicker}</p>}
            <h2 className="display mt-1 whitespace-pre-line text-[13vw] leading-[0.9] sm:text-[56px]">{section.title}</h2>
            <div className={cn("mt-3 h-[3px] w-16", section.tone === "yellow" ? "bg-ink" : "bg-yellow")} />
          </header>
        )}
        <Body section={section} />
      </div>
    </Reveal>
  );
}

function Body({ section }: { section: Section }) {
  switch (section.type) {
    case "text":
      return <TextBlock s={section} />;
    case "blog":
      return <BlogBlock s={section} />;
    case "location":
      return <LocationBlock s={section} />;
    case "gallery":
      return <GalleryBlock s={section} />;
    case "video":
      return <VideoBlock s={section} />;
    case "faq":
      return <FaqBlock s={section} />;
    case "hours":
      return <HoursBlock s={section} />;
    case "cta":
      return <CtaBlock s={section} />;
    case "contact":
      return <ContactBlock s={section} />;
  }
}

function TextBlock({ s }: { s: TextSection }) {
  const hasMedia = !!s.media;
  return (
    <div className={cn("grid gap-8", hasMedia && "sm:grid-cols-2 sm:items-center")}>
      <div className={cn(hasMedia && s.mediaSide === "left" && "sm:order-2")}>
        <Paragraphs text={s.body} />
        {s.handwritten && <p className="hand mt-6 -rotate-3 text-[22px] opacity-80">{s.handwritten}</p>}
      </div>
      {hasMedia && (
        <div className="relative">
          <ImageSlot name={s.media} alt={s.title} className="aspect-[4/3] w-full shadow-[0_24px_40px_-24px_rgba(0,0,0,0.5)]" />
          <div className="absolute -bottom-3 -right-3 -z-10 h-24 w-24 bg-yellow" aria-hidden />
        </div>
      )}
    </div>
  );
}

function BlogBlock({ s }: { s: BlogSection }) {
  const [open, setOpen] = useState<string | null>(null);
  if (s.posts.length === 0) return <p className="text-sm opacity-70">No posts yet.</p>;
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {s.posts.map((p) => {
        const expanded = open === p.id;
        return (
          <article key={p.id} className="flex flex-col">
            {p.cover && <ImageSlot name={p.cover} alt={p.title} className="aspect-[4/3] w-full" />}
            <p className="kicker mt-4 opacity-70">{p.date}</p>
            <h3 className="cond mt-1 text-[22px] font-medium uppercase leading-tight">{p.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed opacity-90">{p.excerpt}</p>
            {expanded && <Paragraphs text={p.body} className="mt-3 border-t border-current/20 pt-3" />}
            {p.body && (
              <button type="button" onClick={() => setOpen(expanded ? null : p.id)} className="kicker mt-3 inline-flex items-center gap-2 self-start border-b-2 border-current pb-1 font-bold" aria-expanded={expanded}>
                {expanded ? "Show less" : "Read more"} <Icon.ArrowRight size={12} />
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function LocationBlock({ s }: { s: LocationSection }) {
  return (
    <div className="grid gap-8 sm:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <div>
          <p className="kicker opacity-70">Address</p>
          <p className="mt-1 whitespace-pre-line text-[16px] leading-relaxed">{s.address}</p>
        </div>
        {s.hours && (
          <div>
            <p className="kicker opacity-70">Hours</p>
            <p className="mt-1 whitespace-pre-line text-[15px]">{s.hours}</p>
          </div>
        )}
        {s.phone && (
          <div>
            <p className="kicker opacity-70">Phone</p>
            <a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="mt-1 inline-block text-[15px] underline underline-offset-4">
              {s.phone}
            </a>
          </div>
        )}
        {s.directionsUrl && (
          <SmartLink href={s.directionsUrl} className="kicker inline-flex items-center gap-3 border border-current px-5 py-3 font-semibold transition hover:bg-ink hover:text-cream">
            <Icon.Map size={14} /> Get directions <Icon.ArrowRight size={13} strokeWidth={2.5} />
          </SmartLink>
        )}
      </div>
      <div className="min-h-[260px]">
        {s.mapEmbedUrl ? (
          <iframe src={s.mapEmbedUrl} title={`Map — ${s.title}`} className="h-full min-h-[260px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        ) : s.media ? (
          <ImageSlot name={s.media} alt={s.title} className="h-full min-h-[260px] w-full" />
        ) : (
          <div className="placeholder-photo flex h-full min-h-[260px] items-center justify-center text-[11px] uppercase tracking-[0.2em]">Add a map embed URL or photo in the admin</div>
        )}
      </div>
    </div>
  );
}

function GalleryBlock({ s }: { s: GallerySection }) {
  if (s.items.length === 0) return <p className="text-sm opacity-70">No photos yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {s.items.map((it, i) => (
        <figure key={it.id} className={cn(i % 5 === 0 && "col-span-2 row-span-2")}>
          <ImageSlot name={it.media} alt={it.caption || "Gallery photo"} className="h-full min-h-[140px] w-full" />
          {it.caption && <figcaption className="hand mt-1 text-[16px] opacity-80">{it.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function VideoBlock({ s }: { s: VideoSection }) {
  return (
    <figure>
      {s.media ? (
        <ImageSlot name={s.media} alt={s.title} className="aspect-video w-full bg-black" controls />
      ) : (
        <div className="placeholder-photo flex aspect-video items-center justify-center text-[11px] uppercase tracking-[0.2em]">Upload a video or paste a YouTube / Vimeo link in the admin</div>
      )}
      {s.caption && <figcaption className="hand mt-3 text-[20px] opacity-80">{s.caption}</figcaption>}
    </figure>
  );
}

function FaqBlock({ s }: { s: FaqSection }) {
  return (
    <div className="max-w-[820px]">
      {s.items.map((it) => (
        <details key={it.id} className="group border-b border-current/20 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
            <span className="cond text-[18px] font-medium uppercase">{it.q}</span>
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full border border-current transition group-open:rotate-45">
              <Icon.Plus size={14} />
            </span>
          </summary>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed opacity-90">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

function HoursBlock({ s }: { s: HoursSection }) {
  return (
    <div className="max-w-[560px]">
      <table className="w-full text-[15px]">
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.id} className="border-b border-current/20">
              <th scope="row" className="cond py-2 text-left font-medium uppercase tracking-wide">
                {r.day}
              </th>
              <td className="py-2 text-right tabular-nums">{r.hours}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {s.note && <p className="mt-3 text-[13px] opacity-75">{s.note}</p>}
    </div>
  );
}

function CtaBlock({ s }: { s: CtaSection }) {
  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_auto_260px] sm:gap-10">
      <h2 className="display whitespace-pre-line text-[15vw] leading-[0.88] sm:text-[72px]">{s.title}</h2>
      <span className="hidden h-28 w-px bg-current/80 sm:block" aria-hidden />
      <div>
        <p className="kicker whitespace-pre-line text-[11px] leading-[1.9]">{s.text}</p>
        {s.ctaLabel && (
          <SmartLink href={s.ctaHref} className="kicker mt-6 inline-flex items-center gap-3 border border-current px-6 py-3 font-semibold transition hover:bg-ink hover:text-cream">
            {s.ctaLabel} <Icon.ArrowRight size={13} strokeWidth={2.5} />
          </SmartLink>
        )}
      </div>
    </div>
  );
}

function ContactBlock({ s }: { s: ContactSection }) {
  return (
    <div className="grid gap-8 sm:grid-cols-[1.2fr_1fr]">
      <Paragraphs text={s.text} />
      <ul className="space-y-4">
        {s.email && (
          <li className="flex items-start gap-3">
            <Icon.Mail size={18} className="mt-1 flex-none" />
            <a href={`mailto:${s.email}`} className="text-[15px] underline underline-offset-4">
              {s.email}
            </a>
          </li>
        )}
        {s.phone && (
          <li className="flex items-start gap-3">
            <Icon.Phone size={18} className="mt-1 flex-none" />
            <a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="text-[15px] underline underline-offset-4">
              {s.phone}
            </a>
          </li>
        )}
        {s.address && (
          <li className="flex items-start gap-3">
            <Icon.Map size={18} className="mt-1 flex-none" />
            <span className="whitespace-pre-line text-[15px]">{s.address}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
