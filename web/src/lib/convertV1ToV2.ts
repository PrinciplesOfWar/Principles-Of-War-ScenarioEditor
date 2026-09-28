import { md5 } from "js-md5";
import type { Scenario } from "../types/scenario";
import type { HexagonV2, LandmarkV2, ScenarioV2, UnitTypeV2, UnitV2, FactionV2 } from "../types/scenarioV2";
import { pyDumpsSorted } from "./pyJson";

export interface ConvertResult {
  success: boolean;
  data: ScenarioV2 | null;
  errors: string[];
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function contentHash(base64: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", base64ToBytes(base64) as BufferSource);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
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

  function resolveFaction(name: string, context: string): string {
    if (name === "neutral") return "neutral";
    const id = factionNameToId.get(name);
    if (!id) {
      errors.push(`${context}: references unknown faction "${name}"`);
      return name;
    }
    return id;
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

  const unit_types: UnitTypeV2[] = unitTypeEntries.map(([key, t]) => {
    const iconHash = iconKeyToHash.get(t.icon);
    if (!iconHash) {
      errors.push(`Unit type "${t.name}" (${key}): icon "${t.icon}" not found in unit_icons`);
    }
    return {
      id: unitTypeKeyToId.get(key)!,
      name: t.name,
      description: t.description,
      faction: resolveFaction(t.faction, `Unit type "${t.name}"`),
      branch: t.branch,
      icon: iconHash ?? t.icon,
      attack: t.attack,
      defense: t.defense,
      movement: t.movement,
      cost: t.cost,
      fuel_consumption: t.fuel_consumption,
      frequency: t.frequency,
    };
  });

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
      faction: resolveFaction(h.faction, `Hex (${h.x},${h.y})`),
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
  const units: UnitV2[] = (v1.units ?? []).map((u) => {
    const typeId = unitTypeKeyToId.get(u.type);
    if (!typeId) errors.push(`Unit at (${u.x},${u.y}): references unknown unit type "${u.type}"`);
    return {
      x: u.x,
      y: u.y,
      faction: resolveFaction(u.faction, `Unit at (${u.x},${u.y})`),
      type: typeId ?? u.type,
      attack: u.attack,
      defense: u.defense,
      movement: u.movement,
    };
  });

  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }

  const now = Math.floor(Date.now() / 1000);
  const withoutVersion = {
    metadata: {
      id: crypto.randomUUID(),
      name: v1.metadata.name,
      creator: v1.metadata.creator,
      type: v1.metadata.type,
      description: v1.metadata.description,
      created_at: v1.metadata.created_at || now,
      updated_at: now,
    },
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

  const hash = md5(pyDumpsSorted(withoutVersion));
  const data: ScenarioV2 = { ...withoutVersion, version: { hash } };

  return { success: true, data, errors: [] };
}
