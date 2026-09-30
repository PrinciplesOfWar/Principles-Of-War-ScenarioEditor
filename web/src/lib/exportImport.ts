import { md5 } from "js-md5";
import type { ScenarioV2 } from "../types/scenarioV2";
import { pyDumpsSorted } from "./pyJson";
import { validateScenarioV2 } from "./validateScenarioV2";

export function computeScenarioForExport(scenario: ScenarioV2): ScenarioV2 {
  const { version: _version, ...withoutVersion } = scenario;
  // A label placed but never named is just an unfinished placeholder in the editor —
  // it already renders as nothing (see hexRenderer's drawLabels) and shouldn't be
  // saved into the file either.
  withoutVersion.map = {
    ...withoutVersion.map,
    labels: withoutVersion.map.labels.filter((l) => l.name.trim() !== ""),
    // Water hexes can't belong to a faction — force them neutral regardless of
    // what was painted in the faction layer.
    hexagons: withoutVersion.map.hexagons.map((h) =>
      h.terrain === "water" && h.faction !== "neutral" ? { ...h, faction: "neutral" } : h
    ),
  };
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
