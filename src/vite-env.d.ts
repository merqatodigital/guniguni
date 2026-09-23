/// <reference types="vite/client" />

/*
 * Deep imports into lucide-react's per-icon ESM files. Importing from the package root pulls
 * ~1,600 icon modules into the bundle graph; the per-icon files keep the build small and fast.
 */
declare module "lucide-react/dist/esm/icons/*" {
  const icon: import("react").ForwardRefExoticComponent<
    Omit<import("react").SVGProps<SVGSVGElement>, "ref"> & {
      size?: number | string;
      strokeWidth?: number | string;
      absoluteStrokeWidth?: boolean;
    } & import("react").RefAttributes<SVGSVGElement>
  >;
  export default icon;
}

declare module "lucide-react/dist/esm/createLucideIcon.mjs" {
  type LucideNode = [string, Record<string, string | number>][];
  const createLucideIcon: (data: { name: string; size?: number; node: LucideNode }) => import("react").ForwardRefExoticComponent<
    Omit<import("react").SVGProps<SVGSVGElement>, "ref"> & {
      size?: number | string;
      strokeWidth?: number | string;
      absoluteStrokeWidth?: boolean;
    } & import("react").RefAttributes<SVGSVGElement>
  >;
  export default createLucideIcon;
}
