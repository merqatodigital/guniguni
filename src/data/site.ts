import rawMenu from "./menu.json";
import type { MenuData } from "./menu";
import { uid } from "@/lib/format";
import { DEFAULT_SKILLS, DEFAULT_TASKS } from "./agentSkills";

/* ------------------------------------------------------------------ */
/* Media                                                                */
/* ------------------------------------------------------------------ */
export type MediaKind = "image" | "video" | "embed";
export interface MediaAsset {
  /** idb:<key> (demo/IndexedDB), data: URL, /uploads/… (server) or https:// (Supabase Storage / remote) */
  url: string;
  kind: MediaKind;
  alt?: string;
  name?: string;
}

export interface MediaSlot {
  key: string;
  label: string;
  where: string;
  video: boolean;
}

/** Every photograph placement in the reference layouts. */
export const MEDIA_SLOTS: MediaSlot[] = [
  { key: "logo", label: "Round tree logo", where: "Every page", video: false },
  { key: "hero-pizza", label: "Hero pizza (round cutout)", where: "Home · hero", video: false },
  { key: "the-place", label: "The Place — dining room", where: "Home · The Place", video: true },
  { key: "pasta-plate", label: "Truffle cream tagliatelle", where: "Home carousel · Pasta page", video: false },
  { key: "salad-plate", label: "Round salad plate (cutout)", where: "Home carousel", video: false },
  { key: "plants", label: "Tropical leaves (cutout)", where: "Home · See you band", video: false },
  { key: "tuna-tartare", label: "Tuna tartare (cutout)", where: "Pasta page · Room for more", video: false },
  { key: "pizza-slice", label: "Cheese-pull pizza slice", where: "Pizza page", video: true },
  { key: "chicken-burger", label: "Spicy chicken burger", where: "Pizza page · Burgers", video: true },
  { key: "mediterranean-salad", label: "Mediterranean salad", where: "Pizza page · Start fresh", video: false },
  { key: "beef-carpaccio", label: "Beef carpaccio", where: "Pizza page · Start fresh", video: false },
  { key: "cocktails", label: "Cocktails", where: "Drinks page", video: true },
  { key: "milkshakes", label: "Milkshakes", where: "Drinks page", video: true },
  { key: "jeep", label: "Yellow jeep (corrected photo)", where: "Drinks page", video: false },
];

/* ------------------------------------------------------------------ */
/* Theme & fonts                                                        */
/* ------------------------------------------------------------------ */
export interface ThemeColors {
  cream: string;
  cream2: string;
  yellow: string;
  yellow2: string;
  ink: string;
  muted: string;
  line: string;
  leaf: string;
}
export type FontRole = "display" | "cond" | "hand" | "sans";
export type ThemeFonts = Record<FontRole, string>;
export interface ThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
  customFontCssUrl: string;
}

export const COLOR_META: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: "cream", label: "Background", hint: "Warm white page background" },
  { key: "cream2", label: "Background 2", hint: "Panels and admin surfaces" },
  { key: "yellow", label: "Accent", hint: "Mustard bands, buttons, highlights" },
  { key: "yellow2", label: "Accent hover", hint: "Lighter accent on hover" },
  { key: "ink", label: "Ink", hint: "Headlines and body text" },
  { key: "muted", label: "Muted text", hint: "Descriptions and captions" },
  { key: "line", label: "Hairlines", hint: "Dividers between menu rows" },
  { key: "leaf", label: "Vegetarian leaf", hint: "Green leaf marking" },
];

export const THEME_PRESETS: { name: string; colors: ThemeColors }[] = [
  { name: "Original mustard", colors: { cream: "#fbf8f1", cream2: "#f4efe3", yellow: "#e8b73e", yellow2: "#f0c85a", ink: "#111111", muted: "#6f6a60", line: "#d9d3c6", leaf: "#4caf50" } },
  { name: "Forest & cream", colors: { cream: "#f7f6ef", cream2: "#ecebdf", yellow: "#8db35f", yellow2: "#a1c574", ink: "#12211a", muted: "#5f6b5e", line: "#d4d6c6", leaf: "#4caf50" } },
  { name: "Terracotta", colors: { cream: "#fbf5ee", cream2: "#f3e8db", yellow: "#e07d45", yellow2: "#ea9460", ink: "#1b1410", muted: "#7a6558", line: "#e0d2c4", leaf: "#4caf50" } },
  { name: "Sky & sand", colors: { cream: "#f8f7f2", cream2: "#eeece4", yellow: "#7fb7d6", yellow2: "#98c7e0", ink: "#10151c", muted: "#66707a", line: "#d5d6d0", leaf: "#4caf50" } },
  { name: "Midnight & gold", colors: { cream: "#15161a", cream2: "#1e2026", yellow: "#e8b73e", yellow2: "#f0c85a", ink: "#f6f1e6", muted: "#a39f93", line: "#33363d", leaf: "#6fcf73" } },
];

export interface FontOption {
  family: string;
  weights?: string;
  roles: FontRole[];
}
export const FONT_CATALOG: FontOption[] = [
  { family: "Anton", roles: ["display"] },
  { family: "Bebas Neue", roles: ["display"] },
  { family: "Archivo Black", roles: ["display"] },
  { family: "League Gothic", roles: ["display", "cond"] },
  { family: "Six Caps", roles: ["display"] },
  { family: "Fjalla One", roles: ["display", "cond"] },
  { family: "Teko", weights: "400;500;600;700", roles: ["display", "cond"] },
  { family: "Big Shoulders Display", weights: "400;500;600;700;800;900", roles: ["display"] },
  { family: "Alfa Slab One", roles: ["display"] },
  { family: "Bungee", roles: ["display"] },
  { family: "Passion One", weights: "400;700;900", roles: ["display"] },
  { family: "Squada One", roles: ["display", "cond"] },
  { family: "Oswald", weights: "400;500;600;700", roles: ["display", "cond"] },
  { family: "Roboto Condensed", weights: "400;500;600;700", roles: ["cond", "sans"] },
  { family: "Barlow Condensed", weights: "400;500;600;700", roles: ["cond", "display"] },
  { family: "Archivo Narrow", weights: "400;500;600;700", roles: ["cond"] },
  { family: "PT Sans Narrow", weights: "400;700", roles: ["cond"] },
  { family: "Saira Condensed", weights: "400;500;600;700", roles: ["cond"] },
  { family: "Antonio", weights: "400;500;600;700", roles: ["cond", "display"] },
  { family: "Pathway Gothic One", roles: ["cond"] },
  { family: "Caveat", weights: "400;600;700", roles: ["hand"] },
  { family: "Kalam", weights: "400;700", roles: ["hand"] },
  { family: "Permanent Marker", roles: ["hand"] },
  { family: "Shadows Into Light", roles: ["hand"] },
  { family: "Patrick Hand", roles: ["hand"] },
  { family: "Indie Flower", roles: ["hand"] },
  { family: "Reenie Beanie", roles: ["hand"] },
  { family: "Homemade Apple", roles: ["hand"] },
  { family: "Gloria Hallelujah", roles: ["hand"] },
  { family: "Rock Salt", roles: ["hand"] },
  { family: "Nanum Pen Script", roles: ["hand"] },
  { family: "Just Another Hand", roles: ["hand"] },
  { family: "Covered By Your Grace", roles: ["hand"] },
  { family: "Architects Daughter", roles: ["hand"] },
  { family: "Inter", weights: "400;500;600;700;800;900", roles: ["sans"] },
  { family: "Manrope", weights: "400;500;600;700;800", roles: ["sans"] },
  { family: "DM Sans", weights: "400;500;600;700", roles: ["sans"] },
  { family: "Work Sans", weights: "400;500;600;700", roles: ["sans"] },
  { family: "Poppins", weights: "400;500;600;700", roles: ["sans"] },
  { family: "Nunito Sans", weights: "400;600;700;800", roles: ["sans"] },
  { family: "Source Sans 3", weights: "400;600;700", roles: ["sans"] },
  { family: "Lato", weights: "400;700;900", roles: ["sans"] },
  { family: "Rubik", weights: "400;500;600;700", roles: ["sans"] },
  { family: "Space Grotesk", weights: "400;500;600;700", roles: ["sans"] },
  { family: "Plus Jakarta Sans", weights: "400;500;600;700;800", roles: ["sans"] },
  { family: "Figtree", weights: "400;500;600;700;800", roles: ["sans"] },
  { family: "Outfit", weights: "400;500;600;700", roles: ["sans"] },
  { family: "Karla", weights: "400;500;600;700", roles: ["sans"] },
];

export const FONT_ROLE_META: { role: FontRole; label: string; hint: string; sample: string }[] = [
  { role: "display", label: "Display", hint: "Oversized condensed black headings", sample: "THE MENU." },
  { role: "cond", label: "Condensed", hint: "Menu item names and labels", sample: "TRUFFLE CREAM ₱390" },
  { role: "hand", label: "Handwritten", hint: "Notes and captions", sample: "Pasta makes everything better." },
  { role: "sans", label: "Body", hint: "Descriptions, prices, buttons", sample: "Mushrooms, truffle cream and white onions." },
];

export const FONT_FALLBACK: Record<FontRole, string> = {
  display: 'Impact, "Arial Narrow Bold", sans-serif',
  cond: '"Arial Narrow", sans-serif',
  hand: '"Segoe Print", "Bradley Hand", cursive',
  sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

export function googleFontsUrl(family: string): string {
  const opt = FONT_CATALOG.find((f) => f.family === family);
  const name = family.trim().replace(/\s+/g, "+");
  const fam = opt?.weights ? `family=${name}:wght@${opt.weights}` : `family=${name}`;
  return `https://fonts.googleapis.com/css2?${fam}&display=swap`;
}
export function fontStack(role: FontRole, family: string): string {
  return `"${family.replace(/"/g, "")}", ${FONT_FALLBACK[role]}`;
}

/* ------------------------------------------------------------------ */
/* Site chrome & home                                                   */
/* ------------------------------------------------------------------ */
export interface NavLink {
  id: string;
  label: string;
  href: string;
}
export interface HeaderConfig {
  brand: string;
  brandSub: string;
  tagline: string;
  showLogo: boolean;
  nav: NavLink[];
  cta: { show: boolean; label: string; href: string };
}
export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "youtube" | "x" | "whatsapp" | "tripadvisor" | "hostelworld" | "booking" | "agoda" | "google" | "website" | "other";
export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
}
export const PLATFORMS: { id: SocialPlatform; label: string; placeholder: string; kind: "social" | "review" | "any" }[] = [
  { id: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/…", kind: "social" },
  { id: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/…", kind: "social" },
  { id: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@…", kind: "social" },
  { id: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@…", kind: "social" },
  { id: "x", label: "X (Twitter)", placeholder: "https://x.com/…", kind: "social" },
  { id: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/639…", kind: "social" },
  { id: "tripadvisor", label: "Tripadvisor", placeholder: "https://www.tripadvisor.com/Restaurant_Review-…", kind: "review" },
  { id: "hostelworld", label: "Hostelworld", placeholder: "https://www.hostelworld.com/…", kind: "review" },
  { id: "booking", label: "Booking.com", placeholder: "https://www.booking.com/hotel/ph/…", kind: "review" },
  { id: "agoda", label: "Agoda", placeholder: "https://www.agoda.com/…", kind: "review" },
  { id: "google", label: "Google Reviews", placeholder: "https://g.page/r/…", kind: "review" },
  { id: "website", label: "Website", placeholder: "https://…", kind: "any" },
  { id: "other", label: "Other link", placeholder: "https://…", kind: "any" },
];
export const platformLabel = (p: SocialPlatform) => PLATFORMS.find((x) => x.id === p)?.label ?? "Link";

export interface FooterConfig {
  brand: string;
  brandSub: string;
  nav: NavLink[];
  tagline: string;
  handwritten: string;
  serviceNote: string;
  thanks: string;
  copyright: string;
  contact: { title: string; phone: string; email: string; emailNote: string; supportLabel: string; supportNote: string };
  location: { title: string; address: string; hoursLabel: string; hours: string; happyHourLabel: string; happyHour: string; directionsLabel: string; mapUrl: string };
  social: { title: string; links: SocialLink[] };
  reviews: { title: string; links: SocialLink[] };
  show: { contact: boolean; location: boolean; social: boolean; reviews: boolean; onMenuPages: boolean };
}

export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.replace(/\s*\n\s*/g, ", "))}`;
}
export interface HomeTab {
  id: string;
  num: string;
  label: string;
  href: string;
  main: string;
  round: string;
}
export interface HomeConfig {
  hero: { show: boolean; line1: string; line2: string; noteLeft: string; noteRight: string; arcText: string; tagline: string; ctaLabel: string; ctaHref: string; spin: boolean };
  marquee: { show: boolean; text: string };
  place: { show: boolean; label: string; vertical: string; bigText: string };
  everything: { show: boolean; title: string; kicker: string; ctaLabel: string; note: string; tabs: HomeTab[] };
  seeYou: { show: boolean; title: string; text: string; ctaLabel: string; ctaHref: string };
}

/* ------------------------------------------------------------------ */
/* Custom sections & pages                                              */
/* ------------------------------------------------------------------ */
export type Placement = "home-after-hero" | "home-after-place" | "home-before-footer" | "page";
export type Tone = "cream" | "yellow" | "ink";
export type SectionType = "text" | "blog" | "location" | "gallery" | "video" | "faq" | "hours" | "cta" | "contact";

interface SectionBase {
  id: string;
  type: SectionType;
  title: string;
  kicker: string;
  visible: boolean;
  placement: Placement;
  pageId: string;
  tone: Tone;
}
export interface TextSection extends SectionBase {
  type: "text";
  body: string;
  media: string;
  mediaSide: "left" | "right";
  handwritten: string;
}
export interface BlogPost {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  body: string;
  cover: string;
}
export interface BlogSection extends SectionBase {
  type: "blog";
  posts: BlogPost[];
}
export interface LocationSection extends SectionBase {
  type: "location";
  address: string;
  mapEmbedUrl: string;
  directionsUrl: string;
  phone: string;
  hours: string;
  media: string;
}
export interface GalleryItem {
  id: string;
  media: string;
  caption: string;
}
export interface GallerySection extends SectionBase {
  type: "gallery";
  items: GalleryItem[];
}
export interface VideoSection extends SectionBase {
  type: "video";
  media: string;
  caption: string;
}
export interface FaqItem {
  id: string;
  q: string;
  a: string;
}
export interface FaqSection extends SectionBase {
  type: "faq";
  items: FaqItem[];
}
export interface HoursRow {
  id: string;
  day: string;
  hours: string;
}
export interface HoursSection extends SectionBase {
  type: "hours";
  rows: HoursRow[];
  note: string;
}
export interface CtaSection extends SectionBase {
  type: "cta";
  text: string;
  ctaLabel: string;
  ctaHref: string;
}
export interface ContactSection extends SectionBase {
  type: "contact";
  text: string;
  email: string;
  phone: string;
  address: string;
}
export type Section =
  | TextSection
  | BlogSection
  | LocationSection
  | GallerySection
  | VideoSection
  | FaqSection
  | HoursSection
  | CtaSection
  | ContactSection;

export interface Page {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  showInNav: boolean;
}

export const SECTION_TYPES: { type: SectionType; label: string; blurb: string }[] = [
  { type: "text", label: "Text / About", blurb: "Heading, paragraphs and an optional photo or video." },
  { type: "blog", label: "Blog / News", blurb: "Posts with cover image, date and story." },
  { type: "location", label: "Location", blurb: "Address, map embed, hours and directions." },
  { type: "gallery", label: "Gallery", blurb: "Grid of photos or short videos." },
  { type: "video", label: "Video", blurb: "One large video — upload or YouTube/Vimeo link." },
  { type: "faq", label: "FAQ", blurb: "Questions and answers." },
  { type: "hours", label: "Opening hours", blurb: "Day-by-day hours table." },
  { type: "cta", label: "Call-to-action band", blurb: "Accent band with a headline and button." },
  { type: "contact", label: "Contact", blurb: "Email, phone and address." },
];

export const PLACEMENT_META: { value: Placement; label: string }[] = [
  { value: "home-after-hero", label: "Home · after the hero" },
  { value: "home-after-place", label: "Home · after The Place" },
  { value: "home-before-footer", label: "Home · before the footer" },
  { value: "page", label: "On a custom page" },
];

export const RESERVED_SLUGS = ["menu", "order", "staff", "admin", "p"];

export function createSection(type: SectionType, placement: Placement = "home-before-footer", pageId = ""): Section {
  const base = { id: uid("sec_"), kicker: "", visible: true, placement, pageId, tone: "cream" as Tone };
  switch (type) {
    case "text":
      return { ...base, type, title: "About Guni Guni", body: "Write your story here.\n\nParagraphs are separated by a blank line.", media: "", mediaSide: "right", handwritten: "" };
    case "blog":
      return { ...base, type, title: "Stories from the table", posts: [{ id: uid("post_"), title: "New on the menu", date: new Date().toISOString().slice(0, 10), excerpt: "A short teaser for this post.", body: "Full story goes here.", cover: "" }] };
    case "location":
      return { ...base, type, title: "Find us", address: "Street, Barangay\nCity, Philippines", mapEmbedUrl: "", directionsUrl: "", phone: "", hours: "Daily · 7:00 AM – 11:00 PM", media: "" };
    case "gallery":
      return { ...base, type, title: "Around the bistro", items: [] };
    case "video":
      return { ...base, type, title: "A night at Guni Guni", media: "", caption: "" };
    case "faq":
      return { ...base, type, title: "Good to know", items: [{ id: uid("faq_"), q: "Do you take reservations?", a: "Walk-ins are always welcome — call us for groups." }] };
    case "hours":
      return {
        ...base,
        type,
        title: "Opening hours",
        rows: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => ({ id: uid("h_"), day: d, hours: "7:00 AM – 11:00 PM" })),
        note: "Kitchen closes 30 minutes before.",
      };
    case "cta":
      return { ...base, type, tone: "yellow", title: "Come hungry.\nStay curious.", text: "Good food brings people together.", ctaLabel: "View menu", ctaHref: "/menu/pasta" };
    case "contact":
      return { ...base, type, title: "Say hello", text: "Questions, events, big groups — we'd love to hear from you.", email: "", phone: "", address: "" };
  }
}

/* ------------------------------------------------------------------ */
/* AI agent                                                             */
/* ------------------------------------------------------------------ */
export interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  text: string;
  addedAt: string;
}
export interface AgentConfig {
  enabled: boolean;
  name: string;
  greeting: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  includeMenu: boolean;
  knowledge: KnowledgeFile[];
  lastTest: { ok: boolean; at: string; model: string; message: string } | null;
  skills: import("./agentSkills").SkillDef[];
  tasks: import("./agentSkills").AgentTask[];
}

/* ------------------------------------------------------------------ */
/* Whole site                                                           */
/* ------------------------------------------------------------------ */
export interface SiteConfig {
  version: number;
  updatedAt: string;
  seo: { title: string; description: string };
  theme: ThemeConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  home: HomeConfig;
  sections: Section[];
  pages: Page[];
  media: Record<string, MediaAsset>;
  menu: MenuData;
  agent: AgentConfig;
}

export const DEFAULT_SITE: SiteConfig = {
  version: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  seo: {
    title: "GUNI GUNI Bistro — Good Food, Good People",
    description: "GUNI GUNI Bistro — good food, good people. Homemade pasta, hand-tossed pizza, burgers and drinks. Order from your table.",
  },
  theme: {
    colors: { ...THEME_PRESETS[0].colors },
    fonts: { display: "Anton", cond: "Oswald", hand: "Caveat", sans: "Inter" },
    customFontCssUrl: "",
  },
  header: {
    brand: "GUNI GUNI",
    brandSub: "BISTRO",
    tagline: "GOOD FOOD GOOD PEOPLE",
    showLogo: true,
    nav: [
      { id: "nav-food", label: "The food", href: "/menu/pasta" },
      { id: "nav-place", label: "The place", href: "/#place" },
      { id: "nav-hello", label: "Say hello", href: "/#contact" },
    ],
    cta: { show: true, label: "View menu", href: "/menu/pasta" },
  },
  footer: {
    brand: "GUNI GUNI",
    brandSub: "Bistro",
    nav: [
      { id: "fnav-menu", label: "Menu", href: "/menu/pasta" },
      { id: "fnav-place", label: "The place", href: "/#place" },
      { id: "fnav-contact", label: "Contact", href: "/#contact" },
    ],
    tagline: "Come hungry. Stay curious.",
    handwritten: "Same tables.\nNew stories\nevery. day.",
    serviceNote: "A 5% service charge will be added to your total bill.",
    thanks: "Thank you for your support.",
    copyright: "© {year} Guni Guni Bistro · Puerto Princesa City, Palawan",
    contact: {
      title: "Contact & Support",
      phone: "+63 917 771 3992",
      email: "reservations@gunigunipalawan.com",
      emailNote: "General & booking inquiries",
      supportLabel: "Customer support",
      supportNote: "Adults-only policy active (18+ for hostel stays)",
    },
    location: {
      title: "Location & Hours",
      address: "263 Manalo Extension, Barangay Milagrosa,\nPuerto Princesa City, Palawan, 5300, Philippines",
      hoursLabel: "Bistro & Restobar hours",
      hours: "Open daily from 7:00 AM – 10:00 PM",
      happyHourLabel: "Happy hour",
      happyHour: "Daily from 4:00 PM – 7:00 PM",
      directionsLabel: "Get directions",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=263%20Manalo%20Extension%2C%20Barangay%20Milagrosa%2C%20Puerto%20Princesa%20City%2C%20Palawan%2C%205300%2C%20Philippines",
    },
    social: {
      title: "Social Media Connect",
      links: [
        { id: "so-instagram", platform: "instagram", label: "Instagram", url: "https://www.instagram.com/gunigunihostel/?hl=en" },
        { id: "so-facebook", platform: "facebook", label: "Facebook", url: "https://www.facebook.com/GuniGuniBistroBar/" },
      ],
    },
    reviews: {
      title: "Review platforms",
      links: [
        { id: "rv-tripadvisor", platform: "tripadvisor", label: "Tripadvisor", url: "" },
        { id: "rv-hostelworld", platform: "hostelworld", label: "Hostelworld", url: "" },
        { id: "rv-booking", platform: "booking", label: "Booking.com", url: "" },
      ],
    },
    show: { contact: true, location: true, social: true, reviews: true, onMenuPages: false },
  },
  home: {
    hero: {
      show: true,
      line1: "Guni",
      line2: "Guni",
      noteLeft: "Good food brings people together",
      noteRight: "Same tables.\nNew stories\nevery. day.",
      arcText: "MADE FOR SHARING",
      tagline: "Good food.\nA little\nimagination.",
      ctaLabel: "View menu",
      ctaHref: "/menu/pasta",
      spin: true,
    },
    marquee: { show: true, text: "Come hungry. Stay curious." },
    place: { show: true, label: "The place\nGuni Guni", vertical: "Pull up a chair.", bigText: "TULOY PO KAYO." },
    everything: {
      show: true,
      title: "A little of\neverything.",
      kicker: "Good food\ntastes better\ntogether.",
      ctaLabel: "View full menu",
      note: "Pizza\npasta\ngood\ntimes.",
      tabs: [
        { id: "tab-pizza", num: "01", label: "Pizza", href: "/menu/pizza?section=pizza", main: "pasta-plate", round: "salad-plate" },
        { id: "tab-pasta", num: "02", label: "Homemade Pasta", href: "/menu/pasta", main: "pasta-plate", round: "tuna-tartare" },
        { id: "tab-fav", num: "03", label: "Bistro Favorites", href: "/menu/pizza?section=burgers", main: "chicken-burger", round: "salad-plate" },
      ],
    },
    seeYou: { show: true, title: "See you\nat the table.", text: "Good food\nbrings people\ntogether.", ctaLabel: "Call us", ctaHref: "tel:+639177713992" },
  },
  sections: [],
  pages: [],
  media: {},
  menu: rawMenu as MenuData,
  agent: {
    enabled: true,
    name: "GUNI GUNI host",
    greeting:
      "Hello! I am the GUNI GUNI virtual host. Tell me what you are craving, ask about our dishes, drinks, or how to order straight from your table. No question is too serious, except asking if we have enough cheese.",
    model: "openrouter/free",
    temperature: 0.5,
    systemPrompt:
      "You are the funny, witty, charismatic, and always informative virtual host of GUNI GUNI Bistro in Puerto Princesa, Palawan. You love great food, playful banter, and good people. Give guests clever, witty, and warm answers, but ALWAYS keep dish details, exact prices in Philippine pesos (₱), vegetarian marks, table ordering steps, hours, and bistro facts 100% accurate. Never use markdown symbols like asterisks or dashes. Never use emojis. Output clean, readable plain text only.",
    includeMenu: true,
    knowledge: [],
    lastTest: null,
    skills: DEFAULT_SKILLS,
    tasks: DEFAULT_TASKS,
  },
};

/** Deep-merge a stored config over the defaults so new fields always exist. Arrays are replaced. */
export function mergeConfig(base: SiteConfig, patch: unknown): SiteConfig {
  const merge = (b: unknown, p: unknown): unknown => {
    if (p === undefined || p === null) return b;
    if (Array.isArray(b) || Array.isArray(p)) return p;
    if (typeof b === "object" && b && typeof p === "object" && p) {
      const out: Record<string, unknown> = { ...(b as Record<string, unknown>) };
      for (const [k, v] of Object.entries(p as Record<string, unknown>)) out[k] = merge(out[k], v);
      return out;
    }
    return p;
  };
  const merged = merge(base, patch) as SiteConfig;
  // Legacy footer shape (footer.socials {instagram, facebook, phone, email, address}) → structured blocks.
  const legacy = (merged.footer as unknown as { socials?: Record<string, string> }).socials;
  if (legacy && typeof legacy === "object") {
    const isReal = (u?: string) => !!u && !/^https?:\/\/(www\.)?(instagram|facebook)\.com\/?$/i.test(u);
    const f = merged.footer;
    f.social.links = f.social.links.map((l) => (l.platform === "instagram" && isReal(legacy.instagram) ? { ...l, url: legacy.instagram } : l.platform === "facebook" && isReal(legacy.facebook) ? { ...l, url: legacy.facebook } : l));
    if (legacy.phone) f.contact.phone = legacy.phone;
    if (legacy.email) f.contact.email = legacy.email;
    if (legacy.address) f.location.address = legacy.address;
    delete (f as unknown as { socials?: unknown }).socials;
  }
  // Upgrade old generic agent system prompt to the new funny, informative, no-symbols prompt
  if (merged.agent && (!merged.agent.systemPrompt || merged.agent.systemPrompt.includes("warm, concise virtual host"))) {
    merged.agent.systemPrompt = DEFAULT_SITE.agent.systemPrompt;
    merged.agent.greeting = DEFAULT_SITE.agent.greeting;
  }
  return merged;
}
