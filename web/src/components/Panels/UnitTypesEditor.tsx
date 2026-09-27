import { useState } from "react";
import { useStore } from "../../state/store";
import { orderedFactionNames, UNIT_BRANCHES } from "../../types/scenario";
import IconUploader from "./IconUploader";

export default function UnitTypesEditor() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const factionNames = orderedFactionNames(scenario.factions);
  const allIds = Object.keys(scenario.unit_types);

  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const faction = selectedFaction && factionNames.includes(selectedFaction)
    ? selectedFaction
    : factionNames[0];

  const ids = allIds.filter((id) => scenario.unit_types[id].faction === faction);
  const id = selectedId && ids.includes(selectedId) ? selectedId : ids[0];
  const t = id ? scenario.unit_types[id] : undefined;

  function addUnitType() {
    if (!faction) return;
    let n = allIds.length;
    let newId = `unit_type_${n}`;
    while (scenario.unit_types[newId]) {
      n += 1;
      newId = `unit_type_${n}`;
    }
    update((s) => {
      s.unit_types[newId] = {
        id: newId,
        name: newId,
        description: "",
        faction,
        branch: "infantry",
        icon: "unknown",
        attack: 1,
        defense: 1,
        movement: 1,
        cost: 1,
        fuel_consumption: 0,
        frequency: 1,
      };
      return s;
    });
    setSelectedId(newId);
  }

  function removeUnitType(removeId: string) {
    update((s) => {
      delete s.unit_types[removeId];
      s.units = s.units.filter((u) => u.type !== removeId);
      return s;
    });
    setSelectedId(null);
  }

  function commitUnitTypeName(currentId: string, rawName: string) {
    const name = rawName.trim();
    const newId = name.toLowerCase().replace(/ /g, "_");
    if (!name || newId === currentId) {
      update((s) => {
        if (name) s.unit_types[currentId].name = name;
        return s;
      });
      return;
    }
    if (scenario.unit_types[newId]) return; // avoid collision, keep old id
    update((s) => {
      const def = s.unit_types[currentId];
      delete s.unit_types[currentId];
      def.name = name;
      def.id = newId;
      s.unit_types[newId] = def;
      s.units.forEach((u) => {
        if (u.type === currentId) u.type = newId;
      });
      return s;
    });
    setSelectedId(newId);
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
        {factionNames.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      {ids.length > 0 && (
        <select
          className="tab-select"
          value={id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {ids.map((uid) => (
            <option key={uid} value={uid}>
              {scenario.unit_types[uid].name}
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
                s.unit_types[id].name = name;
                return s;
              });
            }}
            onBlur={(e) => commitUnitTypeName(id, e.target.value)}
          />
          <label>ID (auto-generated)</label>
          <input value={t.id} readOnly disabled />
          <label>Description</label>
          <input
            value={t.description}
            onChange={(e) =>
              update((s) => {
                s.unit_types[id].description = e.target.value;
                return s;
              })
            }
          />
          <label>Branch</label>
          <select
            value={t.branch}
            onChange={(e) =>
              update((s) => {
                s.unit_types[id].branch = e.target.value as typeof t.branch;
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
                      s.unit_types[id][field] = Number(e.target.value);
                      return s;
                    })
                  }
                />
              </div>
            ))}

          <label>Icon filename</label>
          <input value={t.icon} readOnly disabled />
          <IconUploader
            iconKey={t.icon}
            onIconKeyChange={(key) =>
              update((s) => {
                s.unit_types[id].icon = key;
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
