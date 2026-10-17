import type { CSSProperties } from "react";

export const AREA_COVER_IMAGE = "/images/area-card-cover.svg";

/** Hue rotations that tint the shared cover art into distinct variants. */
export const AREA_COVER_HUES = [0, 70, 30, 190, 150] as const;

export const randomAreaCoverVariant = () =>
  Math.floor(Math.random() * AREA_COVER_HUES.length);

/** Picks a stable variant for an area so its cover looks the same everywhere. */
export function getAreaCoverVariant(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % AREA_COVER_HUES.length;
}

export function areaCoverStyle(
  imageUrl: string | null | undefined,
  variant: number,
): CSSProperties {
  if (imageUrl) return { backgroundImage: `url('${imageUrl}')` };

  return {
    backgroundImage: `url('${AREA_COVER_IMAGE}')`,
    filter: `hue-rotate(${AREA_COVER_HUES[variant % AREA_COVER_HUES.length]}deg) saturate(0.85)`,
  };
}
