import type { Scenario } from "../types/scenario";
import type { HexagonV2, LandmarkV2, ScenarioV2, UnitTypeV2, UnitV2, FactionV2 } from "../types/scenarioV2";
import { contentHash } from "./contentHash";
import { computeScenarioForExport } from "./exportImport";
import { validateScenarioV2 } from "./validateScenarioV2";

export interface ConvertResult {
  success: boolean;
  data: ScenarioV2 | null;
  errors: string[];
}

export function parseV1ScenarioJson(text: string): Scenario {
  const data = JSON.parse(text);
  if (!data.metadata || !data.hexagons || !data.unit_types) {
    throw new Error("Invalid v1 scenario JSON: missing required top-level keys");
  }
  return data as Scenario;
}

export async function convertV1ToV2(v1: Scenario): Promise<ConvertResult> {
  const errors: string[] = [];

  // --- factions ---
  const factionEntries = Object.entries(v1.factions);
  const factionNameToId = new Map<string, string>();
  const factionOldIdToNewId = new Map<string, string>(); // "faction_0"/"faction_1" -> new uuid
  const factions: FactionV2[] = factionEntries.map(([name, f]) => {
    const id = crypto.randomUUID();
    factionNameToId.set(name, id);
    factionOldIdToNewId.set(f.id, id);
    return {
      id,
      name: f.name,
      units: { ...f.units },
      manpower: { ...f.manpower },
      fuel: { ...f.fuel },
      airpower: { ...f.airpower },
    };
  });

  // Unresolvable references are passed through as-is rather than erroring here —
  // validateScenarioV2 (run below, on the fully-built candidate) reports every dangling
  // faction/unit-type/icon reference in one place instead of duplicating those checks.
  function resolveFaction(name: string): string {
    if (name === "neutral") return "neutral";
    return factionNameToId.get(name) ?? name;
  }

  // --- unit_icons (content-hash rekeying, with dedup) ---
  const unitIcons: Record<string, string> = {};
  const iconKeyToHash = new Map<string, string>();
  for (const [iconKey, base64] of Object.entries(v1.unit_icons ?? {})) {
    const hash = await contentHash(base64);
    iconKeyToHash.set(iconKey, hash);
    unitIcons[hash] = base64;
  }

  // --- unit_types ---
  const unitTypeEntries = Object.entries(v1.unit_types ?? {});
  const unitTypeKeyToId = new Map<string, string>();
  for (const [key] of unitTypeEntries) unitTypeKeyToId.set(key, crypto.randomUUID());

  const unit_types: UnitTypeV2[] = unitTypeEntries.map(([key, t]) => ({
    id: unitTypeKeyToId.get(key)!,
    name: t.name,
    description: t.description,
    faction: resolveFaction(t.faction),
    branch: t.branch,
    icon: iconKeyToHash.get(t.icon) ?? t.icon,
    attack: t.attack,
    defense: t.defense,
    movement: t.movement,
    cost: t.cost,
    fuel_consumption: t.fuel_consumption,
    frequency: t.frequency,
  }));

  // --- landmarks lookup by (x,y), across all three kinds ---
  type LandmarkKind = "city" | "oilfield" | "supply";
  const landmarkByXY = new Map<string, { kind: LandmarkKind; x: number; y: number }>();
  const landmarks = v1.landmarks ?? { city: [], oilfield: [], supply: [] };
  for (const kind of ["city", "oilfield", "supply"] as const) {
    for (const entry of landmarks[kind] ?? []) {
      const key = `${entry.x},${entry.y}`;
      const existing = landmarkByXY.get(key);
      if (existing) {
        errors.push(
          `Hex (${entry.x},${entry.y}) has more than one landmark entry (${existing.kind} and ${kind})`
        );
        continue;
      }
      landmarkByXY.set(key, { kind, x: entry.x, y: entry.y });
    }
  }
  const consumedXY = new Set<string>();

  function buildLandmark(kind: LandmarkKind, x: number, y: number): LandmarkV2 {
    if (kind === "city") {
      const c = landmarks.city.find((e) => e.x === x && e.y === y)!;
      return { type: "city", name: c.name, population: c.population };
    }
    if (kind === "oilfield") {
      const o = landmarks.oilfield.find((e) => e.x === x && e.y === y)!;
      return { type: "oilfield", production: o.production };
    }
    return { type: "supply" };
  }

  // --- hexagons -> map.hexagons ---
  const hexagons: HexagonV2[] = v1.hexagons.map((h) => {
    const key = `${h.x},${h.y}`;
    let landmark: LandmarkV2 | null = null;
    if (h.landmark !== "default") {
      const found = landmarkByXY.get(key);
      if (found && found.kind === h.landmark) {
        consumedXY.add(key);
        landmark = buildLandmark(found.kind, h.x, h.y);
      } else if (!found && h.landmark === "city") {
        // A hex flagged "city" with no landmarks.city entry is a nameless city, not an error —
        // known real-world case (city marker's data was lost/never set while the flag stuck).
        landmark = { type: "city", name: "", population: 0 };
      } else if (found) {
        errors.push(
          `Hex (${h.x},${h.y}) is flagged as landmark "${h.landmark}" but landmarks.${found.kind} claims this coordinate instead`
        );
      } else {
        errors.push(
          `Hex (${h.x},${h.y}) is flagged as landmark "${h.landmark}" but has no matching landmarks.${h.landmark} entry`
        );
      }
    }

    const objective: string[] = [];
    for (const oldId of ["faction_0", "faction_1"] as const) {
      if (h.objective[oldId]) {
        const newId = factionOldIdToNewId.get(oldId);
        if (!newId) {
          errors.push(`Hex (${h.x},${h.y}) has objective flag for "${oldId}" but no faction with that id exists`);
        } else {
          objective.push(newId);
        }
      }
    }

    return {
      x: h.x,
      y: h.y,
      terrain: h.terrain,
      faction: resolveFaction(h.faction),
      landmark,
      logistics: h.railway,
      river: [...h.river] as HexagonV2["river"],
      port: h.port,
      objective,
    };
  });

  for (const [key, { kind, x, y }] of landmarkByXY) {
    if (!consumedXY.has(key)) {
      errors.push(`landmarks.${kind} entry at (${x},${y}) has no hex flagged with that landmark`);
    }
  }

  // --- units ---
  const units: UnitV2[] = (v1.units ?? []).map((u) => ({
    x: u.x,
    y: u.y,
    faction: resolveFaction(u.faction),
    type: unitTypeKeyToId.get(u.type) ?? u.type,
    attack: u.attack,
    defense: u.defense,
    movement: u.movement,
  }));

  const now = Math.floor(Date.now() / 1000);
  const candidate: ScenarioV2 = {
    metadata: {
      id: crypto.randomUUID(),
      name: v1.metadata.name,
      creator: v1.metadata.creator,
      type: v1.metadata.type,
      description: v1.metadata.description,
      created_at: v1.metadata.created_at || now,
      updated_at: now,
    },
    version: { hash: "" },
    factions,
    map: {
      width: v1.metadata.width,
      height: v1.metadata.height,
      hexagons,
      labels: v1.labels ?? [],
    },
    time: v1.time,
    turn: v1.turn,
    unit_types,
    units,
    unit_icons: unitIcons,
  };

  errors.push(...validateScenarioV2(candidate));

  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }

  return { success: true, data: computeScenarioForExport(candidate), errors: [] };
}
