import { md5 } from "js-md5";
import type { Scenario } from "../types/scenario";
import { pyDumpsSorted } from "./pyJson";

export function computeScenarioForExport(scenario: Scenario): Scenario {
  // Mirrors src/scenario_compile.py: hash is computed while metadata.hash is "" and
  // metadata.timestamp is still its pre-set value ("") — timestamp is only assigned
  // to a real epoch value AFTER the hash is taken, so it must be excluded the same way here.
  const forHashing: Scenario = {
    ...scenario,
    metadata: { ...scenario.metadata, hash: "", timestamp: "" as unknown as number },
  };
  const hash = md5(pyDumpsSorted(forHashing));
  return {
    ...scenario,
    metadata: { ...scenario.metadata, hash, timestamp: Math.floor(Date.now() / 1000) },
  };
}

export function exportScenarioToFile(scenario: Scenario): void {
  const withFilename: Scenario = {
    ...scenario,
    metadata: { ...scenario.metadata, filename: `${scenario.metadata.id || "scenario"}.json` },
  };
  const final = computeScenarioForExport(withFilename);
  const blob = new Blob([JSON.stringify(final, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = final.metadata.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseScenarioFromJson(text: string): Scenario {
  const data = JSON.parse(text);
  if (!data.metadata || !data.hexagons || !data.unit_types) {
    throw new Error("Invalid scenario JSON: missing required top-level keys");
  }
  return data as Scenario;
}
