import { useState } from "react";
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { AppProvider, useApp } from "@/context/AppContext";
import { SiteProvider, useSite } from "@/context/SiteContext";
import { CartBar, CartDrawer, ItemSheet, Toasts } from "@/components/ordering";
import { AgentWidget } from "@/components/AgentWidget";
import { Icon } from "@/components/ui";
import { EXPECTED_PHOTOS, photos } from "@/data/assets";
import Home from "@/pages/Home";
import PastaMenu from "@/pages/PastaMenu";
import PizzaMenu from "@/pages/PizzaMenu";
import DrinksMenu from "@/pages/DrinksMenu";
import OrderStatus from "@/pages/OrderStatus";
import Staff from "@/pages/Staff";
import Admin from "@/pages/admin/Admin";
import CustomPage from "@/pages/CustomPage";

function MissingAssetsChip() {
  const { config } = useSite();
  const missing = EXPECTED_PHOTOS.filter((k) => !photos[k] && !config.media[k]);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem("gg.assets.dismissed") === "1");
  if (missing.length === 0 || hidden) return null;
  return (
    <div className="fixed right-4 top-4 z-[55] hidden max-w-[320px] md:block">
      <div className="rounded-xl border border-line bg-cream/95 p-3 text-[11px] leading-snug shadow-lg backdrop-blur">
        <div className="flex items-start gap-2">
          <p className="flex-1">
            <strong className="font-semibold">{missing.length} photo placement{missing.length === 1 ? "" : "s"} empty.</strong> Upload the originals in{" "}
            <Link to="/admin" className="underline">
              Admin → Media
            </Link>
            .{" "}
            <button type="button" className="underline" onClick={() => setOpen((o) => !o)}>
              {open ? "Hide list" : "Show list"}
            </button>
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            className="grid h-6 w-6 flex-none place-items-center rounded-full hover:bg-ink/10"
            onClick={() => {
              sessionStorage.setItem("gg.assets.dismissed", "1");
              setHidden(true);
            }}
          >
            <Icon.X size={12} />
          </button>
        </div>
        {open && (
          <ul className="mt-2 grid grid-cols-2 gap-x-3 font-mono text-[10px] text-muted">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DraftPill() {
  const { hasDraft, isDirty } = useSite();
  const location = useLocation();
  if (!hasDraft || !isDirty || location.pathname.startsWith("/admin") || sessionStorage.getItem("gg.staff.role") !== "admin") return null;
  return (
    <Link to="/admin" className="fixed left-1/2 top-3 z-[56] -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-yellow shadow-lg">
      Draft preview — publish in admin
    </Link>
  );
}

function Shell() {
  const { itemCount } = useApp();
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith("/admin") || location.pathname.startsWith("/staff");
  return (
    <div className={cn("min-h-dvh", itemCount > 0 && !isBackoffice && "pb-[calc(78px+var(--sab))] md:pb-0")}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Navigate to="/menu/pasta" replace />} />
        <Route path="/menu/pasta" element={<PastaMenu />} />
        <Route path="/menu/pizza" element={<PizzaMenu />} />
        <Route path="/menu/drinks" element={<DrinksMenu />} />
        <Route path="/order/:id" element={<OrderStatus />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/:slug" element={<CustomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isBackoffice && (
        <>
          <ItemSheet />
          <CartDrawer />
          <CartBar />
          <AgentWidget />
          <MissingAssetsChip />
          <DraftPill />
        </>
      )}
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <SiteProvider>
          <Shell />
        </SiteProvider>
      </AppProvider>
    </HashRouter>
  );
}
