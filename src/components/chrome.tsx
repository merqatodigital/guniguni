import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, ExternalLink, Mail, MapPin, Navigation, Phone, Share2, ShieldCheck, Wine, type LucideIcon } from "@/lib/lucide";
import { cn } from "@/utils/cn";
import { useSite } from "@/context/SiteContext";
import type { NavLink } from "@/data/site";
import { Icon, Logo } from "@/components/ui";
import { PlatformIcon } from "@/components/brandIcons";

/** Renders internal routes with the router, anchors as hash links, everything else as plain links. */
export function SmartLink({ href, className, children, onClick, title, ariaLabel }: { href: string; className?: string; children: ReactNode; onClick?: () => void; title?: string; ariaLabel?: string }) {
  if (!href) return <span className={className}>{children}</span>;
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className} onClick={onClick} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  if (href.startsWith("#")) {
    return (
      <Link to={`/${href}`} className={className} onClick={onClick} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/i.test(href);
  return (
    <a href={href} className={className} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} onClick={onClick} title={title} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

export function useNavLinks(): NavLink[] {
  const { config } = useSite();
  return [...config.header.nav, ...config.pages.filter((p) => p.showInNav).map((p) => ({ id: `page-${p.id}`, label: p.title, href: `/${p.slug}` }))];
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/* ------------------------------- Social links ------------------------------ */
/**
 * Social networks from Admin → Header & footer. `plain` = bare glyphs (menu-page headers, as in the
 * references), `circle` = round buttons, `pill` = icon + label.
 */
export function SocialLinks({ className, size = 18, variant = "plain" }: { className?: string; size?: number; variant?: "plain" | "circle" | "pill" }) {
  const { footer } = useSite().config;
  const links = footer.social.links.filter((l) => l.url.trim());
  if (links.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map((l) => (
        <SmartLink
          key={l.id}
          href={l.url}
          ariaLabel={l.label}
          title={l.label}
          className={cn(
            "inline-flex items-center justify-center transition",
            variant === "plain" && "h-9 w-9 rounded-full hover:bg-ink/10",
            variant === "circle" && "h-10 w-10 rounded-full border border-ink/70 hover:border-yellow hover:bg-yellow",
            variant === "pill" && "h-10 gap-2 rounded-full border border-ink/70 pl-2.5 pr-4 text-[12.5px] font-medium hover:border-yellow hover:bg-yellow",
          )}
        >
          <PlatformIcon platform={l.platform} size={size} />
          {variant === "pill" && <span>{l.label}</span>}
        </SmartLink>
      ))}
    </div>
  );
}

/** Review platforms — entries without a URL render as plain text until the link is pasted in the admin. */
export function ReviewLinks({ className }: { className?: string }) {
  const { footer } = useSite().config;
  if (footer.reviews.links.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      {footer.reviews.links.map((l) => {
        const has = !!l.url.trim();
        const inner = (
          <>
            <PlatformIcon platform={l.platform} size={16} />
            <span className={cn(has && "underline decoration-yellow decoration-2 underline-offset-4")}>{l.label}</span>
            {has && <ExternalLink size={11} className="text-muted" aria-hidden />}
          </>
        );
        return (
          <li key={l.id}>
            {has ? (
              <SmartLink href={l.url} className="inline-flex items-center gap-2 text-[13.5px] transition hover:text-ink/70">
                {inner}
              </SmartLink>
            ) : (
              <span className="inline-flex items-center gap-2 text-[13.5px] text-muted" title="Link coming soon">
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------- Header --------------------------------- */
export function SiteHeader() {
  const { config } = useSite();
  const nav = useNavLinks();
  const { header } = config;
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 border-b border-ink/70">
      <div className="flex h-[68px] items-center px-4 sm:px-[calc(34*var(--u))]">
        <Link to="/" className="flex flex-none items-center gap-3" aria-label={`${header.brand} home`}>
          {header.showLogo ? (
            <Logo size={62} className="translate-y-[6px]" />
          ) : (
            <span className="display text-[26px] leading-none">
              {header.brand} <span className="text-[12px] tracking-[0.3em]">{header.brandSub}</span>
            </span>
          )}
        </Link>
        <nav className="ml-8 hidden items-center gap-7 sm:flex" aria-label="Primary">
          {nav.map((l) => (
            <SmartLink key={l.id} href={l.href} className="kicker hover:text-ink/60">
              {l.label}
            </SmartLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {header.cta.show && (
            <SmartLink href={header.cta.href} className="kicker inline-flex h-9 items-center gap-2 rounded-[3px] bg-yellow px-5 font-bold transition hover:bg-yellow-2">
              {header.cta.label} <Icon.ArrowRight size={13} strokeWidth={2.5} />
            </SmartLink>
          )}
          <button type="button" className="grid h-10 w-10 place-items-center sm:hidden" aria-expanded={open} aria-label="Open navigation" onClick={() => setOpen((o) => !o)}>
            {open ? <Icon.X size={20} /> : <Icon.Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="anim-fade-in flex flex-col border-t border-ink/20 px-4 py-2 sm:hidden" aria-label="Primary mobile">
          {nav.map((l) => (
            <SmartLink key={l.id} href={l.href} className="kicker py-3" onClick={() => setOpen(false)}>
              {l.label}
            </SmartLink>
          ))}
        </nav>
      )}
    </header>
  );
}

/* --------------------------------- Footer --------------------------------- */
function FooterColumn({ icon: IconCmp, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 flex-none place-items-center bg-yellow text-ink">
          <IconCmp size={15} strokeWidth={2.25} aria-hidden />
        </span>
        <h3 className="cond text-[15px] font-semibold uppercase tracking-[0.16em]">{title}</h3>
      </div>
      <div className="mt-4 space-y-3.5">{children}</div>
    </div>
  );
}

function FooterRow({ icon: IconCmp, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <IconCmp size={16} strokeWidth={2} className="mt-[3px] flex-none text-ink/70" aria-hidden />
      <div className="min-w-0 text-[13.5px] leading-relaxed">
        <p className="kicker text-[9px] text-muted">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

const footerLink = "underline decoration-yellow decoration-2 underline-offset-4 transition hover:bg-yellow/40";

export function SiteFooter({ className }: { className?: string }) {
  const { config } = useSite();
  const f = config.footer;
  const year = String(new Date().getFullYear());
  const showConnect = (f.show.social && f.social.links.some((l) => l.url.trim())) || (f.show.reviews && f.reviews.links.length > 0);

  return (
    <footer id="contact" className={cn("border-t border-ink/70 px-4 pb-[calc(var(--sab)+20px)] pt-8 sm:px-[calc(34*var(--u))] sm:pt-10", className)}>
      {/* Brand row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Logo size={64} />
        <div>
          <p className="cond text-[18px] font-semibold tracking-[0.2em]">{f.brand}</p>
          <p className="text-[13px] tracking-[0.3em] text-ink/80">{f.brandSub}</p>
        </div>
        {f.tagline && <p className="kicker ml-2 hidden text-ink/70 md:block">{f.tagline}</p>}
        {f.handwritten && <p className="hand ml-auto -rotate-6 whitespace-pre-line text-right text-[16px] uppercase leading-[1.1] text-ink/75">{f.handwritten}</p>}
      </div>

      {/* Columns */}
      {(f.show.contact || f.show.location || showConnect) && (
        <div className="mt-8 grid gap-8 border-t border-ink/20 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          {f.show.contact && (
            <FooterColumn icon={Phone} title={f.contact.title}>
              {f.contact.phone && (
                <FooterRow icon={Phone} label="Phone">
                  <a href={telHref(f.contact.phone)} className={footerLink}>
                    {f.contact.phone}
                  </a>
                </FooterRow>
              )}
              {f.contact.email && (
                <FooterRow icon={Mail} label="Email">
                  <a href={`mailto:${f.contact.email}`} className={cn(footerLink, "break-all")}>
                    {f.contact.email}
                  </a>
                  {f.contact.emailNote && <span className="block text-[12px] text-muted">{f.contact.emailNote}</span>}
                </FooterRow>
              )}
              {f.contact.supportNote && (
                <FooterRow icon={ShieldCheck} label={f.contact.supportLabel || "Customer support"}>
                  {f.contact.supportNote}
                </FooterRow>
              )}
            </FooterColumn>
          )}

          {f.show.location && (
            <FooterColumn icon={MapPin} title={f.location.title}>
              {f.location.address && (
                <FooterRow icon={MapPin} label="Address">
                  <address className="whitespace-pre-line not-italic">{f.location.address}</address>
                  {f.location.mapUrl && (
                    <SmartLink href={f.location.mapUrl} className="kicker mt-2 inline-flex items-center gap-2 border border-ink px-3 py-1.5 font-semibold transition hover:bg-ink hover:text-cream">
                      <Navigation size={11} aria-hidden /> {f.location.directionsLabel || "Get directions"}
                    </SmartLink>
                  )}
                </FooterRow>
              )}
              {f.location.hours && (
                <FooterRow icon={Clock} label={f.location.hoursLabel || "Hours"}>
                  {f.location.hours}
                </FooterRow>
              )}
              {f.location.happyHour && (
                <FooterRow icon={Wine} label={f.location.happyHourLabel || "Happy hour"}>
                  <span className="stroke-y px-0.5 font-medium">{f.location.happyHour}</span>
                </FooterRow>
              )}
            </FooterColumn>
          )}

          {showConnect && (
            <FooterColumn icon={Share2} title={f.social.title}>
              {f.show.social && <SocialLinks variant="pill" />}
              {f.show.reviews && f.reviews.links.length > 0 && (
                <div className={cn(f.show.social && "border-t border-ink/15 pt-3.5")}>
                  <p className="kicker text-[9px] text-muted">{f.reviews.title}</p>
                  <ReviewLinks className="mt-2" />
                </div>
              )}
            </FooterColumn>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div className="mt-8 flex flex-col gap-3 border-t border-ink/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center" aria-label="Footer">
          {f.nav.map((l, i) => (
            <span key={l.id} className="flex items-center">
              {i > 0 && <span className="h-4 w-px bg-ink/50" aria-hidden />}
              <SmartLink href={l.href} className={cn("kicker font-medium hover:text-ink/60", i === 0 ? "pr-4" : "px-4")}>
                {l.label}
              </SmartLink>
            </span>
          ))}
        </nav>
        {f.serviceNote && <p className="text-[11px] text-ink/80">{f.serviceNote}</p>}
      </div>
      <div className="mt-3 flex flex-col gap-1 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
        {f.copyright && <p>{f.copyright.replace("{year}", year)}</p>}
        {f.thanks && <p className="kicker text-[8px]">{f.thanks}</p>}
      </div>
    </footer>
  );
}
