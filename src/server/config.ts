export const demoMode = () => process.env.RECIPE_MODE === "demo" || (!process.env.DATABASE_URL && process.env.NODE_ENV === "development" && process.env.RECIPE_MODE !== "private");

export function siteOrigin(request: Request) {
  return new URL(process.env.APP_ORIGIN || request.url).origin;
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === siteOrigin(request);
}
