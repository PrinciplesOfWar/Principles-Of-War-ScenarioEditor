import type { LabelEntry, TerrainType, TimeData, TurnData, UnitBranch } from "./scenario";

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
