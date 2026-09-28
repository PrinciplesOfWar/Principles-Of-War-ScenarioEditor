import type { LandmarkType, TerrainType } from "../types/scenarioV2";

// Static art dropped in web/public by design — terrain tiles follow the "<type>_0.png"
// naming convention (variant 0), landmark icons have no suffix.
type Listener = () => void;
const listeners: Listener[] = [];

export function onAssetLoaded(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function notify() {
  listeners.forEach((cb) => cb());
}

const cache = new Map<string, HTMLImageElement>();

function load(path: string): HTMLImageElement {
  const existing = cache.get(path);
  if (existing) return existing;
  const img = new Image();
  img.onload = () => notify();
  img.src = path;
  cache.set(path, img);
  return img;
}

export function getTerrainImage(type: TerrainType): HTMLImageElement {
  return load(`/${type}_0.png`);
}

export function getLandmarkImage(type: LandmarkType): HTMLImageElement | null {
  if (type === "default") return null;
  return load(`/${type}.png`);
}

export function getPortImage(): HTMLImageElement {
  return load("/port.png");
}

// Unit icons live inside the scenario itself (unit_icons, keyed by content hash) rather
// than as static files, so they're cached/decoded from their base64 data URL instead of
// going through load()'s path-based cache.
const unitIconCache = new Map<string, HTMLImageElement>();

export function getUnitIconImage(hash: string, base64: string): HTMLImageElement {
  const existing = unitIconCache.get(hash);
  if (existing) return existing;
  const img = new Image();
  img.onload = () => notify();
  img.src = `data:image/png;base64,${base64}`;
  unitIconCache.set(hash, img);
  return img;
}

export function isImageReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}
