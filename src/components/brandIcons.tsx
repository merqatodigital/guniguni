import { BedDouble, CalendarCheck, Globe, Hotel, Link2, Star, createLucideIcon, type LucideIcon } from "@/lib/lucide";
import type { SocialPlatform } from "@/data/site";

/**
 * Brand marks built with Lucide's own icon factory so they share the 24px grid, 2px stroke,
 * round caps and the `size` / `strokeWidth` props of every other icon on the site.
 * Paths: Instagram / Facebook / YouTube from Lucide (ISC); X / TikTok / WhatsApp / Tripadvisor
 * adapted from Tabler Icons (MIT).
 */
export const InstagramIcon = createLucideIcon({
  name: "instagram",
  size: 24,
  node: [
    ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5", key: "r" }],
    ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", key: "c" }],
    ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "d" }],
  ],
});

export const FacebookIcon = createLucideIcon({
  name: "facebook",
  size: 24,
  node: [["path", { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z", key: "f" }]],
});

export const YoutubeIcon = createLucideIcon({
  name: "youtube",
  size: 24,
  node: [
    ["path", { d: "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17", key: "b" }],
    ["path", { d: "m10 15 5-3-5-3z", key: "p" }],
  ],
});

export const XIcon = createLucideIcon({
  name: "x-brand",
  size: 24,
  node: [
    ["path", { d: "M4 4l11.733 16h4.267l-11.733-16z", key: "a" }],
    ["path", { d: "M4 20l6.768-6.768m2.46-2.46L20 4", key: "b" }],
  ],
});

export const TiktokIcon = createLucideIcon({
  name: "tiktok",
  size: 24,
  node: [["path", { d: "M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2V3h4.083a6.005 6.005 0 0 0 4.917 4.917z", key: "t" }]],
});

export const WhatsappIcon = createLucideIcon({
  name: "whatsapp",
  size: 24,
  node: [
    ["path", { d: "M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21", key: "a" }],
    ["path", { d: "M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1", key: "b" }],
  ],
});

export const TripadvisorIcon = createLucideIcon({
  name: "tripadvisor",
  size: 24,
  node: [
    ["circle", { cx: "6.5", cy: "13.5", r: "1.5", key: "e1" }],
    ["circle", { cx: "17.5", cy: "13.5", r: "1.5", key: "e2" }],
    ["path", { d: "M17.5 9a4.5 4.5 0 1 0 3.5 1.671L22 9h-4.5z", key: "h1" }],
    ["path", { d: "M6.5 9a4.5 4.5 0 1 1-3.5 1.671L2 9h4.5z", key: "h2" }],
    ["path", { d: "M10.5 15.5 12 17.5l1.5-2", key: "beak" }],
    ["path", { d: "M9 6.75c2-.667 4-.667 6 0", key: "brow" }],
  ],
});

export const PLATFORM_ICON: Record<SocialPlatform, LucideIcon> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  x: XIcon,
  whatsapp: WhatsappIcon,
  tripadvisor: TripadvisorIcon,
  hostelworld: BedDouble,
  booking: CalendarCheck,
  agoda: Hotel,
  google: Star,
  website: Globe,
  other: Link2,
};

export function PlatformIcon({ platform, size = 18, className, strokeWidth = 2 }: { platform: SocialPlatform; size?: number; className?: string; strokeWidth?: number }) {
  const Cmp = PLATFORM_ICON[platform] ?? Link2;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
