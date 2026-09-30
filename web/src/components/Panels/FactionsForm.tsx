import { useEffect, useState } from "react";
import { parseNonNegativeInt } from "../../lib/number";
import { useStore } from "../../state/store";
import type { FactionV2 } from "../../types/scenarioV2";

function cloneFaction(f: FactionV2): FactionV2 {
  return {
    id: f.id,
    name: f.name,
    units: { ...f.units },
    manpower: { ...f.manpower },
    fuel: { ...f.fuel },
    airpower: { ...f.airpower },
  };
}

function validateName(name: string, currentId: string, factions: FactionV2[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name cannot be empty";
  const duplicate = factions.some((f) => f.id !== currentId && f.name.trim() === trimmed);
  if (duplicate) return "Name must be unique";
  return null;
}

export default function FactionsForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const factions = scenario.factions;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stored = factions.find((f) => f.id === selectedId) ?? factions[0];

  const [draft, setDraft] = useState<FactionV2 | null>(stored ? cloneFaction(stored) : null);

  useEffect(() => {
    setDraft(stored ? cloneFaction(stored) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?.id]);

  const isDirty = !!draft && !!stored && JSON.stringify(draft) !== JSON.stringify(stored);
  const nameError = draft ? validateName(draft.name, draft.id, factions) : null;

  const handleSave = () => {
    if (!draft || nameError) return;
    // id never changes on rename, so this is a plain field update — no references to it
    // (hexagons/units/unit_types/etc.) ever need rewriting.
    const trimmed: FactionV2 = { ...draft, name: draft.name.trim() };
    update((s) => {
      const f = s.factions.find((ff) => ff.id === trimmed.id);
      if (f) Object.assign(f, trimmed);
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
        {factions.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      {draft && (
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
            min={0}
            step={1}
            value={draft.units.cap}
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, units: { ...d.units, cap: parseNonNegativeInt(e.target.value) } } : d))
            }
          />
          {/* airpower is intentionally not editable here yet, but stays in the
              draft/scenario untouched and is still saved on export. */}
          {(["manpower", "fuel"] as const).map((res) => (
            <fieldset key={res}>
              <legend>{res}</legend>
              <label>Points</label>
              <input
                type="number"
                value={draft[res].points}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, [res]: { ...d[res], points: Number(e.target.value) } } : d))
                }
              />
              <label>Income</label>
              <input
                type="number"
                value={draft[res].income}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, [res]: { ...d[res], income: Number(e.target.value) } } : d))
                }
              />
              <label>Cap</label>
              <input
                type="number"
                value={draft[res].cap}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, [res]: { ...d[res], cap: Number(e.target.value) } } : d))
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
