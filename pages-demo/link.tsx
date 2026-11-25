import type { ComponentPropsWithoutRef } from "react";

export default function StaticLink({ href, ...props }: ComponentPropsWithoutRef<"a"> & { href: string }) {
  const base = import.meta.env.BASE_URL;
  const recipe = href.match(/^\/recipes\/([^/]+)$/);
  const destination = recipe ? `${base}?recipe=${encodeURIComponent(recipe[1])}` : base + href.replace(/^\//, "");
  return <a href={destination} {...props} />;
}
