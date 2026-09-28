// The v2 scenario file schema — see web/docs/scenario-schema-v2.md. This is the single
// source of truth for the enums/shared shapes; types/scenario.ts (v1) imports the ones
// that are unchanged between v1 and v2 from here rather than redefining them.

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

// Tool-selection enum ("which landmark type is the paint tool set to place"), decoupled
// from the stored discriminated-union shape below ("default" means "no landmark").
export const LANDMARK_TYPES = ["default", "city", "oilfield", "supply"] as const;
export type LandmarkType = (typeof LANDMARK_TYPES)[number];

// Each label sits either on one of a hex's 6 edges (0-5) or at its center (edge: null).
export const LABEL_TYPES = ["water"] as const;
export type LabelType = (typeof LABEL_TYPES)[number];

export interface LabelEntry {
  x: number;
  y: number;
  edge: number | null;
  type: LabelType;
  name: string;
}

export const UNIT_BRANCHES = [
  "motorized",
  "infantry",
  "leader",
  "fortification",
  "naval",
  "light_infantry",
] as const;
export type UnitBranch = (typeof UNIT_BRANCHES)[number];

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

export interface MetadataV2 {
  id: string;
  name: string;
  creator: string;
  type: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export interface VersionV2 {
  hash: string;
}

export interface FactionResourceV2 {
  points: number;
  income: number;
  cap: number;
}

export interface FactionV2 {
  id: string;
  name: string;
  units: { cap: number };
  manpower: FactionResourceV2;
  fuel: FactionResourceV2;
  airpower: FactionResourceV2;
}

export interface CityLandmarkV2 {
  type: "city";
  name: string;
  population: number;
}

export interface OilfieldLandmarkV2 {
  type: "oilfield";
  production: number;
}

export interface SupplyLandmarkV2 {
  type: "supply";
}

export type LandmarkV2 = CityLandmarkV2 | OilfieldLandmarkV2 | SupplyLandmarkV2;

export interface HexagonV2 {
  x: number;
  y: number;
  terrain: TerrainType;
  faction: string; // "neutral" | faction id (uuid)
  landmark: LandmarkV2 | null;
  logistics: boolean;
  river: [boolean, boolean, boolean, boolean, boolean, boolean];
  port: boolean;
  objective: string[]; // faction ids (uuid)
}

export interface MapV2 {
  width: number;
  height: number;
  hexagons: HexagonV2[];
  labels: LabelEntry[];
}

export interface UnitTypeV2 {
  id: string;
  name: string;
  description: string;
  faction: string;
  branch: UnitBranch;
  icon: string; // content hash, key into unit_icons
  attack: number;
  defense: number;
  movement: number;
  cost: number;
  fuel_consumption: number;
  frequency: number;
}

export interface UnitV2 {
  x: number;
  y: number;
  faction: string;
  type: string; // unit_types[].id
  attack: number;
  defense: number;
  movement: number;
}

export type UnitIconsV2 = Record<string, string>; // content hash -> base64 PNG (no data: prefix)

export interface ScenarioV2 {
  metadata: MetadataV2;
  version: VersionV2;
  factions: FactionV2[];
  map: MapV2;
  time: TimeData;
  turn: TurnData;
  unit_types: UnitTypeV2[];
  units: UnitV2[];
  unit_icons: UnitIconsV2;
}

export function defaultHexagonV2(x: number, y: number): HexagonV2 {
  return {
    x,
    y,
    terrain: "grass",
    faction: "neutral",
    landmark: null,
    logistics: false,
    river: [false, false, false, false, false, false],
    port: false,
    objective: [],
  };
}

function seedFaction(name: string): FactionV2 {
  return {
    id: crypto.randomUUID(),
    name,
    units: { cap: 0 },
    manpower: { points: 0, income: 0, cap: 0 },
    fuel: { points: 0, income: 0, cap: 0 },
    airpower: { points: 0, income: 0, cap: 0 },
  };
}

export function createEmptyScenarioV2(): ScenarioV2 {
  const width = 11;
  const height = 11;
  const hexagons: HexagonV2[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      hexagons.push(defaultHexagonV2(x, y));
    }
  }
  const now = Math.floor(Date.now() / 1000);
  return {
    metadata: {
      id: crypto.randomUUID(),
      name: "New Scenario",
      creator: "",
      type: "original",
      description: "",
      created_at: now,
      updated_at: now,
    },
    version: { hash: "" },
    factions: [seedFaction("faction 0"), seedFaction("faction 1")],
    map: { width, height, hexagons, labels: [] },
    time: { day: 1, month: 1, year: 2025, increment: 1, seasons: {} },
    turn: { duration: 1000 },
    unit_types: [],
    units: [],
    unit_icons: {},
  };
}
