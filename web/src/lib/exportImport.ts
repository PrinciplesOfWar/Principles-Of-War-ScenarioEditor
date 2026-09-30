import { md5 } from "js-md5";
import { neighborOffset } from "./hexGrid";
import type { HexagonV2, ScenarioV2 } from "../types/scenarioV2";
import { pyDumpsSorted } from "./pyJson";
import { validateScenarioV2 } from "./validateScenarioV2";

function terrainAt(hexagons: HexagonV2[], x: number, y: number): string | undefined {
  return hexagons.find((h) => h.x === x && h.y === y)?.terrain;
}

function isAdjacentToWater(hexagons: HexagonV2[], x: number, y: number): boolean {
  for (let edge = 0; edge < 6; edge++) {
    const n = neighborOffset(x, y, edge);
    if (terrainAt(hexagons, n.x, n.y) === "water") return true;
  }
  return false;
}

export function computeScenarioForExport(scenario: ScenarioV2): ScenarioV2 {
  const { version: _version, ...withoutVersion } = scenario;
  // A label placed but never named is just an unfinished placeholder in the editor —
  // it already renders as nothing (see hexRenderer's drawLabels) and shouldn't be
  // saved into the file either.
  const sourceHexagons = withoutVersion.map.hexagons;
  withoutVersion.map = {
    ...withoutVersion.map,
    labels: withoutVersion.map.labels.filter((l) => l.name.trim() !== ""),
    hexagons: sourceHexagons.map((h) => {
      // Water hexes can't belong to a faction, be an objective, carry a landmark,
      // or have logistics — force/clear regardless of what was painted there.
      if (h.terrain === "water" && (h.faction !== "neutral" || h.objective.length > 0 || h.landmark || h.logistics)) {
        h = { ...h, faction: "neutral", objective: [], landmark: null, logistics: false };
      }
      // A port only makes sense on a hex adjacent to water.
      if (h.port && !isAdjacentToWater(sourceHexagons, h.x, h.y)) {
        h = { ...h, port: false };
      }
      // A river can't run along an edge touching a water hex on either side.
      if (h.river.some((r) => r)) {
        const river = h.river.map((r, edge) => {
          if (!r || h.terrain === "water") return false;
          const n = neighborOffset(h.x, h.y, edge);
          return terrainAt(sourceHexagons, n.x, n.y) === "water" ? false : r;
        }) as HexagonV2["river"];
        if (river.some((r, i) => r !== h.river[i])) h = { ...h, river };
      }
      return h;
    }),
  };
  // Units can't sit on a water hex.
  withoutVersion.units = withoutVersion.units.filter((u) => terrainAt(sourceHexagons, u.x, u.y) !== "water");
  // id/created_at/updated_at are identity & bookkeeping, not scenario content —
  // excluded so the hash reflects only what the scenario actually contains.
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...hashableMetadata } = withoutVersion.metadata;
  const hash = md5(pyDumpsSorted({ ...withoutVersion, metadata: hashableMetadata }));
  const now = Math.floor(Date.now() / 1000);
  return {
    ...withoutVersion,
    metadata: { ...scenario.metadata, updated_at: now },
    version: { hash },
  };
}

export function downloadScenarioFile(scenario: ScenarioV2): void {
  const blob = new Blob([JSON.stringify(scenario, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${scenario.metadata.id || "scenario"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportScenarioToFile(scenario: ScenarioV2): void {
  downloadScenarioFile(computeScenarioForExport(scenario));
}

export function parseScenarioFromJson(text: string): ScenarioV2 {
  const data = JSON.parse(text);
  if (!data.metadata || !data.map || !data.factions || !data.unit_types || !data.units || !data.unit_icons) {
    throw new Error("Invalid scenario JSON: missing required top-level keys");
  }
  const scenario = data as ScenarioV2;
  const errors = validateScenarioV2(scenario);
  if (errors.length > 0) {
    throw new Error(`Invalid scenario JSON:\n${errors.join("\n")}`);
  }
  return scenario;
}
