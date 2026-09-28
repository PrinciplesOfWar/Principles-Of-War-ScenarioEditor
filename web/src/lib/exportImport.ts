import { md5 } from "js-md5";
import type { ScenarioV2 } from "../types/scenarioV2";
import { pyDumpsSorted } from "./pyJson";
import { validateScenarioV2 } from "./validateScenarioV2";

export function computeScenarioForExport(scenario: ScenarioV2): ScenarioV2 {
  const { version: _version, ...withoutVersion } = scenario;
  const hash = md5(pyDumpsSorted(withoutVersion));
  const now = Math.floor(Date.now() / 1000);
  return {
    ...withoutVersion,
    metadata: { ...scenario.metadata, updated_at: now },
    version: { hash },
  };
}

export function exportScenarioToFile(scenario: ScenarioV2): void {
  const final = computeScenarioForExport(scenario);
  const blob = new Blob([JSON.stringify(final, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${final.metadata.id || "scenario"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
