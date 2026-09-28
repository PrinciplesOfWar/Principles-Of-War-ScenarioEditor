import { useState } from "react";
import { useStore } from "../../state/store";
import { UNIT_BRANCHES } from "../../types/scenarioV2";
import IconUploader from "./IconUploader";

export default function UnitTypesEditor() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const factions = scenario.factions;

  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const faction =
    selectedFaction && factions.some((f) => f.id === selectedFaction) ? selectedFaction : factions[0]?.id;

  const types = scenario.unit_types.filter((t) => t.faction === faction);
  const id = selectedId && types.some((t) => t.id === selectedId) ? selectedId : types[0]?.id;
  const t = id ? types.find((tt) => tt.id === id) : undefined;

  function addUnitType() {
    if (!faction) return;
    const newId = crypto.randomUUID();
    update((s) => {
      s.unit_types.push({
        id: newId,
        name: "New unit type",
        description: "",
        faction,
        branch: "infantry",
        icon: "",
        attack: 1,
        defense: 1,
        movement: 1,
        cost: 1,
        fuel_consumption: 0,
        frequency: 1,
      });
      return s;
    });
    setSelectedId(newId);
  }

  function removeUnitType(removeId: string) {
    update((s) => {
      s.unit_types = s.unit_types.filter((tt) => tt.id !== removeId);
      s.units = s.units.filter((u) => u.type !== removeId);
      return s;
    });
    setSelectedId(null);
  }

  return (
    <div className="panel">
      <h3>Unit Types</h3>
      <select
        className="tab-select"
        value={faction ?? ""}
        onChange={(e) => {
          setSelectedFaction(e.target.value);
          setSelectedId(null);
        }}
      >
        {factions.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      {types.length > 0 && (
        <select className="tab-select" value={id ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
          {types.map((ut) => (
            <option key={ut.id} value={ut.id}>
              {ut.name}
            </option>
          ))}
        </select>
      )}

      {t && id && (
        <div className="detail-form faction-block">
          <label>Name</label>
          <input
            value={t.name}
            onChange={(e) => {
              const name = e.target.value.replace(/[^a-zA-Z0-9 ]/g, "");
              update((s) => {
                const ut = s.unit_types.find((tt) => tt.id === id);
                if (ut) ut.name = name;
                return s;
              });
            }}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (!name) return;
              update((s) => {
                const ut = s.unit_types.find((tt) => tt.id === id);
                if (ut) ut.name = name;
                return s;
              });
            }}
          />
          <label>ID</label>
          <input value={t.id} readOnly disabled />
          <label>Description</label>
          <input
            value={t.description}
            onChange={(e) =>
              update((s) => {
                const ut = s.unit_types.find((tt) => tt.id === id);
                if (ut) ut.description = e.target.value;
                return s;
              })
            }
          />
          <label>Branch</label>
          <select
            value={t.branch}
            onChange={(e) =>
              update((s) => {
                const ut = s.unit_types.find((tt) => tt.id === id);
                if (ut) ut.branch = e.target.value as typeof t.branch;
                return s;
              })
            }
          >
            {UNIT_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {(["attack", "defense", "movement", "cost", "fuel_consumption", "frequency"] as const)
            .filter((field) => field !== "fuel_consumption" || t.branch === "motorized")
            .map((field) => (
              <div key={field}>
                <label>{field.replace(/_/g, " ")}</label>
                <input
                  type="number"
                  value={t[field]}
                  onChange={(e) =>
                    update((s) => {
                      const ut = s.unit_types.find((tt) => tt.id === id);
                      if (ut) ut[field] = Number(e.target.value);
                      return s;
                    })
                  }
                />
              </div>
            ))}

          <label>Icon</label>
          <IconUploader
            iconKey={t.icon}
            onIconKeyChange={(key) =>
              update((s) => {
                const ut = s.unit_types.find((tt) => tt.id === id);
                if (ut) ut.icon = key;
                return s;
              })
            }
          />

          <button onClick={() => removeUnitType(id)}>Remove unit type</button>
        </div>
      )}
      <button onClick={addUnitType} disabled={!faction}>
        Add unit type
      </button>
    </div>
  );
}
