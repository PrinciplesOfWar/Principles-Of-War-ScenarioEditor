export const TERRAIN_TYPES = [
  "grass",
  "forest",
  "mud",
  "sand",
  "snow",
  "mountain",
  "water",
] as const;
export type TerrainType = (typeof TERRAIN_TYPES)[number];

export const LANDMARK_TYPES = ["default", "city", "oilfield", "supply"] as const;
export type LandmarkType = (typeof LANDMARK_TYPES)[number];

export const UNIT_BRANCHES = [
  "motorized",
  "infantry",
  "leader",
  "fortification",
  "naval",
  "light_infantry",
] as const;
export type UnitBranch = (typeof UNIT_BRANCHES)[number];

export interface Metadata {
  id: string;
  name: string;
  filename: string;
  hash: string;
  width: number;
  height: number;
  timestamp: number;
  creator: string;
  version: string;
  type: string;
  description: string;
}

export interface FactionResource {
  points: number;
  income: number;
  cap: number;
}

export interface Faction {
  id: string;
  name: string;
  units: { cap: number };
  manpower: FactionResource;
  fuel: FactionResource;
  airpower: FactionResource;
}

export type Factions = Record<string, Faction>;

// Faction display/paint order must stay stable (faction 0 before faction 1, ...)
// even after a faction is renamed, which otherwise reorders Object.keys() by moving
// the renamed key to the end of insertion order. `id` ("faction_0", "faction_1", ...)
// never changes on rename, so sort by the numeric suffix of `id` instead.
function factionOrderKey(faction: Faction): number {
  const match = /_(\d+)$/.exec(faction.id);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export function orderedFactionNames(factions: Factions): string[] {
  return Object.keys(factions).sort((a, b) => factionOrderKey(factions[a]) - factionOrderKey(factions[b]));
}

export interface Hexagon {
  x: number;
  y: number;
  terrain: TerrainType;
  faction: string; // "neutral" | faction name
  landmark: LandmarkType;
  railway: boolean;
  river: [boolean, boolean, boolean, boolean, boolean, boolean];
  port: boolean;
  objective: { faction_0: boolean; faction_1: boolean };
}

export interface CityLandmark {
  x: number;
  y: number;
  name: string;
  faction: string;
  population: number;
}

export interface OilfieldLandmark {
  x: number;
  y: number;
  production: number;
}

export interface SupplyLandmark {
  x: number;
  y: number;
  faction: string;
}

export interface Landmarks {
  city: CityLandmark[];
  oilfield: OilfieldLandmark[];
  supply: SupplyLandmark[];
}

export interface SeasonRule {
  to: TerrainType;
  probability: number;
}

export type SeasonEntry = Partial<Record<TerrainType, SeasonRule>>;

export interface TimeData {
  day: number;
  month: number;
  year: number;
  increment: number;
  seasons: Record<string, SeasonEntry>; // key: "DD-MM"
}

export interface TurnData {
  duration: number;
}

export interface UnitTypeDef {
  id: string;
  name: string;
  description: string;
  faction: string;
  branch: UnitBranch;
  icon: string;
  attack: number;
  defense: number;
  movement: number;
  cost: number;
  fuel_consumption: number;
  frequency: number;
}

export type UnitTypes = Record<string, UnitTypeDef>;

export interface UnitInstance {
  x: number;
  y: number;
  faction: string;
  type: string;
  attack: number;
  defense: number;
  movement: number;
}

export type UnitIcons = Record<string, string>; // icon name -> base64 PNG (no data: prefix)

export interface Scenario {
  metadata: Metadata;
  factions: Factions;
  hexagons: Hexagon[];
  landmarks: Landmarks;
  time: TimeData;
  turn: TurnData;
  unit_types: UnitTypes;
  units: UnitInstance[];
  unit_icons: UnitIcons;
}

export function defaultHexagon(x: number, y: number): Hexagon {
  return {
    x,
    y,
    terrain: "grass",
    faction: "neutral",
    landmark: "default",
    railway: false,
    river: [false, false, false, false, false, false],
    port: false,
    objective: { faction_0: false, faction_1: false },
  };
}

export function createEmptyScenario(): Scenario {
  const width = 11;
  const height = 11;
  const hexagons: Hexagon[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      hexagons.push(defaultHexagon(x, y));
    }
  }
  return {
    metadata: {
      id: "new_scenario",
      name: "New Scenario",
      filename: "new_scenario.json",
      hash: "",
      width,
      height,
      timestamp: 0,
      creator: "",
      version: "",
      type: "original",
      description: "",
    },
    factions: {
      "faction 0": {
        id: "faction_0",
        name: "faction 0",
        units: { cap: 0 },
        manpower: { points: 0, income: 0, cap: 0 },
        fuel: { points: 0, income: 0, cap: 0 },
        airpower: { points: 0, income: 0, cap: 0 },
      },
      "faction 1": {
        id: "faction_1",
        name: "faction 1",
        units: { cap: 0 },
        manpower: { points: 0, income: 0, cap: 0 },
        fuel: { points: 0, income: 0, cap: 0 },
        airpower: { points: 0, income: 0, cap: 0 },
      },
    },
    hexagons,
    landmarks: { city: [], oilfield: [], supply: [] },
    time: { day: 1, month: 1, year: 2025, increment: 1, seasons: {} },
    turn: { duration: 1000 },
    unit_types: {},
    units: [],
    unit_icons: {},
  };
}

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
  | "units";

export const LAYERS: { id: LayerId; label: string }[] = [
  { id: "image", label: "Image (reference)" },
  { id: "terrain", label: "Terrain" },
  { id: "faction", label: "Factions" },
  { id: "rivers", label: "Rivers" },
  { id: "railway", label: "Logistics" },
  { id: "ports", label: "Ports" },
  { id: "objective_player", label: "Objective (Faction 0)" },
  { id: "objective_enemy", label: "Objective (Faction 1)" },
  { id: "landmarks", label: "Landmarks" },
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
