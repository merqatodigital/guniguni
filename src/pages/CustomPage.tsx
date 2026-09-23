import { Link, useParams } from "react-router-dom";
import { useSite } from "@/context/SiteContext";
import { Icon } from "@/components/ui";
import { useScrollTop } from "@/components/nav";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { SectionsAt } from "@/components/sections";
import { HOME_UNIT } from "@/pages/Home";

export default function CustomPage() {
  useScrollTop();
  const { slug = "" } = useParams();
  const { config } = useSite();
  const page = config.pages.find((p) => p.slug === slug);

  return (
    <div style={HOME_UNIT} className="mx-auto w-full max-w-[1180px]">
      <SiteHeader />
      {page ? (
        <>
          <section className="px-4 pb-4 pt-8 sm:px-[calc(40*var(--u))] sm:pt-12">
            <p className="kicker text-muted">{config.header.brand}</p>
            <h1 className="display mt-2 text-[16vw] leading-[0.88] sm:text-[calc(96*var(--u))]">{page.title}</h1>
            {page.subtitle && <p className="mt-3 max-w-[560px] text-[15px] tracking-[0.06em] text-ink/85">{page.subtitle}</p>}
            <div className="rule-y mt-5 w-16" style={{ height: 3 }} />
          </section>
          <SectionsAt placement="page" pageId={page.id} />
          {config.sections.filter((s) => s.visible && s.placement === "page" && s.pageId === page.id).length === 0 && (
            <p className="px-4 pb-10 text-sm text-muted sm:px-[calc(40*var(--u))]">This page has no sections yet — add some in the admin under Sections.</p>
          )}
        </>
      ) : (
        <section className="px-4 py-20 text-center">
          <h1 className="display text-[56px]">Page not found.</h1>
          <p className="mt-3 text-sm text-muted">There's no page at “/{slug}”.</p>
          <Link to="/" className="kicker mt-6 inline-flex items-center gap-2 bg-yellow px-5 py-3 font-bold">
            Back home <Icon.ArrowRight size={12} />
          </Link>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}
