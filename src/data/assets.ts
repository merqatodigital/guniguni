/**
 * Supplied photographs are picked up by file name from src/assets/photos/.
 * See src/assets/photos/README.md for the required names. Missing files render
 * as labelled "photo not supplied" slots — nothing is regenerated or swapped in.
 */
const modules = import.meta.glob("../assets/photos/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export const photos: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const key = file.replace(/\.[^.]+$/, "");
  photos[key] = url;
}

export const EXPECTED_PHOTOS = [
  "logo",
  "hero-pizza",
  "the-place",
  "pasta-plate",
  "salad-plate",
  "plants",
  "tuna-tartare",
  "pizza-slice",
  "chicken-burger",
  "mediterranean-salad",
  "beef-carpaccio",
  "cocktails",
  "milkshakes",
  "jeep",
] as const;

export type PhotoKey = (typeof EXPECTED_PHOTOS)[number];

export const missingPhotos = (): PhotoKey[] => EXPECTED_PHOTOS.filter((k) => !photos[k]);
