import { useEffect, useState } from "react";
import { useStore } from "../../state/store";
import { orderedFactionNames } from "../../types/scenario";
import type { Faction, Factions } from "../../types/scenario";

function cloneFaction(f: Faction): Faction {
  return {
    id: f.id,
    name: f.name,
    units: { ...f.units },
    manpower: { ...f.manpower },
    fuel: { ...f.fuel },
    airpower: { ...f.airpower },
  };
}

function validateName(name: string, currentKey: string, factions: Factions): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name cannot be empty";
  const duplicate = Object.keys(factions).some(
    (k) => k !== currentKey && factions[k].name.trim() === trimmed
  );
  if (duplicate) return "Name must be unique";
  return null;
}

export default function FactionsForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const names = orderedFactionNames(scenario.factions);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const name = names.find((n) => scenario.factions[n].id === selectedId) ?? names[0];
  const stored = name ? scenario.factions[name] : undefined;

  const [draft, setDraft] = useState<Faction | null>(stored ? cloneFaction(stored) : null);

  useEffect(() => {
    setDraft(stored ? cloneFaction(stored) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const isDirty = !!draft && !!stored && JSON.stringify(draft) !== JSON.stringify(stored);
  const nameError = draft && name ? validateName(draft.name, name, scenario.factions) : null;

  const handleSave = () => {
    if (!draft || !name || nameError) return;
    const trimmed: Faction = { ...draft, name: draft.name.trim() };
    const oldName = name;
    const newName = trimmed.name;
    update((s) => {
      delete s.factions[oldName];
      s.factions[newName] = trimmed;
      if (oldName !== newName) {
        for (const hex of s.hexagons) {
          if (hex.faction === oldName) hex.faction = newName;
        }
        for (const city of s.landmarks.city) {
          if (city.faction === oldName) city.faction = newName;
        }
        for (const supply of s.landmarks.supply) {
          if (supply.faction === oldName) supply.faction = newName;
        }
        for (const unitType of Object.values(s.unit_types)) {
          if (unitType.faction === oldName) unitType.faction = newName;
        }
        for (const unit of s.units) {
          if (unit.faction === oldName) unit.faction = newName;
        }
      }
      return s;
    });
    setDraft(trimmed);
  };

  const handleDiscard = () => {
    if (stored) setDraft(cloneFaction(stored));
  };

  return (
    <div className="panel">
      <h3>Factions</h3>
      <select
        className="tab-select"
        value={stored?.id ?? ""}
        disabled={isDirty}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {names.map((n) => (
          <option key={scenario.factions[n].id} value={scenario.factions[n].id}>
            {scenario.factions[n].name}
          </option>
        ))}
      </select>
      {draft && name && (
        <div className="detail-form faction-block">
          <label>Name</label>
          <input
            className={nameError ? "invalid" : ""}
            value={draft.name}
            onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              setDraft((d) => (d ? { ...d, name: trimmed } : d));
            }}
          />
          {nameError && <p className="field-error">{nameError}</p>}
          <label>ID</label>
          <input value={draft.id} readOnly disabled />
          <label>Unit cap</label>
          <input
            type="number"
            value={draft.units.cap}
            onChange={(e) =>
              setDraft((d) =>
                d ? { ...d, units: { ...d.units, cap: Number(e.target.value) } } : d
              )
            }
          />
          {(["manpower", "fuel", "airpower"] as const).map((res) => (
            <fieldset key={res}>
              <legend>{res}</legend>
              <label>Points</label>
              <input
                type="number"
                value={draft[res].points}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, [res]: { ...d[res], points: Number(e.target.value) } } : d
                  )
                }
              />
              <label>Income</label>
              <input
                type="number"
                value={draft[res].income}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, [res]: { ...d[res], income: Number(e.target.value) } } : d
                  )
                }
              />
              <label>Cap</label>
              <input
                type="number"
                value={draft[res].cap}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, [res]: { ...d[res], cap: Number(e.target.value) } } : d
                  )
                }
              />
            </fieldset>
          ))}
          {isDirty && (
            <div className="row pending-actions">
              <button className="save" disabled={!!nameError} onClick={handleSave}>
                Save
              </button>
              <button onClick={handleDiscard}>Discard</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
