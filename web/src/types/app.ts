// Editor/UI state — not part of the scenario file schema (see types/scenarioV2.ts for that).

export type LayerId =
  | "image"
  | "terrain"
  | "faction"
  | "rivers"
  | "railway"
  | "ports"
  | "objective_player"
  | "objective_enemy"
  | "landmarks"
  | "labels"
  | "units";

export const LAYERS: { id: LayerId; label: string }[] = [
  { id: "image", label: "Image (reference)" },
  { id: "terrain", label: "Terrain" },
  { id: "faction", label: "Factions" },
  { id: "rivers", label: "Rivers" },
  { id: "railway", label: "Logistics" },
  { id: "ports", label: "Ports" },
  { id: "objective_player", label: "Objective (1st faction)" },
  { id: "objective_enemy", label: "Objective (2nd faction)" },
  { id: "landmarks", label: "Landmarks" },
  { id: "labels", label: "Labels" },
  { id: "units", label: "Units" },
];

export interface LayerSettings {
  visible: boolean;
  opacity: number; // 0..1
}

export interface ReferenceImage {
  dataUrl: string;
  // Visibility/opacity for the image layer live in the generic per-layer
  // settings (same mechanism as every other layer), not here.
  width: number; // natural pixel width of the uploaded image
  height: number; // natural pixel height of the uploaded image
  scaleX: number; // 1 = fitted to map bounds width
  scaleY: number; // 1 = fitted to map bounds height
}
