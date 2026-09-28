import type { ScenarioV2 } from "../types/scenarioV2";

// Strict validation for a ScenarioV2 tree — id uniqueness and reference resolution only
// (well-formed v2 data has no separate landmarks collection to reconcile against a hex
// flag, unlike v1, so that check is converter-only). On any error the caller rejects the
// file outright; there is no repair path (per web/docs/scenario-schema-v2.md).
export function validateScenarioV2(s: ScenarioV2): string[] {
  const errors: string[] = [];

  const factionIds = new Set<string>();
  for (const f of s.factions) {
    if (factionIds.has(f.id)) errors.push(`Duplicate faction id "${f.id}" (${f.name})`);
    factionIds.add(f.id);
  }

  const unitTypeIds = new Set<string>();
  for (const t of s.unit_types) {
    if (unitTypeIds.has(t.id)) errors.push(`Duplicate unit type id "${t.id}" (${t.name})`);
    unitTypeIds.add(t.id);
  }

  function checkFaction(faction: string, context: string) {
    if (faction === "neutral") return;
    if (!factionIds.has(faction)) errors.push(`${context}: references unknown faction "${faction}"`);
  }

  for (const t of s.unit_types) {
    checkFaction(t.faction, `Unit type "${t.name}"`);
    if (!(t.icon in s.unit_icons)) {
      errors.push(`Unit type "${t.name}": icon "${t.icon}" not found in unit_icons`);
    }
  }

  for (const h of s.map.hexagons) {
    checkFaction(h.faction, `Hex (${h.x},${h.y})`);
    for (const factionId of h.objective) {
      if (!factionIds.has(factionId)) {
        errors.push(`Hex (${h.x},${h.y}): objective references unknown faction "${factionId}"`);
      }
    }
  }

  for (const u of s.units) {
    checkFaction(u.faction, `Unit at (${u.x},${u.y})`);
    if (!unitTypeIds.has(u.type)) {
      errors.push(`Unit at (${u.x},${u.y}): references unknown unit type "${u.type}"`);
    }
  }

  return errors;
}
