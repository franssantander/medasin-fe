const IMMERSIVE_ROUTES = [
  // Letter editor (`/letters/new`, `/letters/{uuid}`) and page studio.
  /^\/letters\/[^/]+(?:\/studio)?\/?$/,
];

/** Routes that render their own top bar without the app sidebar and header. */
export function isImmersiveRoute(pathname: string | null) {
  return Boolean(
    pathname && IMMERSIVE_ROUTES.some((route) => route.test(pathname)),
  );
}
