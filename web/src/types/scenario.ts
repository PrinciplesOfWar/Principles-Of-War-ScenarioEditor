// The v1 scenario file schema. Kept only as the input shape for lib/convertV1ToV2.ts —
// no live editing code in this app reads or writes this shape anymore (see
// web/docs/scenario-schema-v2.md and types/scenarioV2.ts for the format the editor
// actually works with).
import type { LabelEntry, LandmarkType, TerrainType, TimeData, TurnData, UnitBranch } from "./scenarioV2";

export interface Metadata {
  id: string;
  name: string;
  filename: string;
  hash: string;
  width: number;
  height: number;
  timestamp: number;
  created_at: number;
  updated_at: number;
  creator: string;
  version: number;
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
  labels: LabelEntry[];
  time: TimeData;
  turn: TurnData;
  unit_types: UnitTypes;
  units: UnitInstance[];
  unit_icons: UnitIcons;
}
