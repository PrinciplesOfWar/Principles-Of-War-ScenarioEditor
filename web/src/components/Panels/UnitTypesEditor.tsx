import { useStore } from "../../state/store";
import { orderedFactionNames, UNIT_BRANCHES } from "../../types/scenario";
import IconUploader from "./IconUploader";

export default function UnitTypesEditor() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const factionNames = orderedFactionNames(scenario.factions);
  const ids = Object.keys(scenario.unit_types);

  function addUnitType() {
    update((s) => {
      let n = Object.keys(s.unit_types).length;
      let id = `unit_type_${n}`;
      while (s.unit_types[id]) {
        n += 1;
        id = `unit_type_${n}`;
      }
      s.unit_types[id] = {
        id,
        name: id,
        description: "",
        faction: orderedFactionNames(s.factions)[0] ?? "",
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
  }

  function removeUnitType(id: string) {
    update((s) => {
      delete s.unit_types[id];
      s.units = s.units.filter((u) => u.type !== id);
      return s;
    });
  }

  function renameUnitType(oldId: string, newId: string) {
    if (!newId || newId === oldId) return;
    update((s) => {
      if (s.unit_types[newId]) return s; // avoid collision
      const def = s.unit_types[oldId];
      delete s.unit_types[oldId];
      def.id = newId;
      s.unit_types[newId] = def;
      s.units.forEach((u) => {
        if (u.type === oldId) u.type = newId;
      });
      return s;
    });
  }

  return (
    <div className="panel">
      <h3>Unit Types</h3>
      {ids.map((id) => {
        const t = scenario.unit_types[id];
        return (
          <div key={id} className="detail-form faction-block">
            <label>ID</label>
            <input
              defaultValue={id}
              onBlur={(e) => renameUnitType(id, e.target.value)}
            />
            <label>Name</label>
            <input
              value={t.name}
              onChange={(e) =>
                update((s) => {
                  s.unit_types[id].name = e.target.value;
                  return s;
                })
              }
            />
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
            <label>Faction</label>
            <select
              value={t.faction}
              onChange={(e) =>
                update((s) => {
                  s.unit_types[id].faction = e.target.value;
                  return s;
                })
              }
            >
              {factionNames.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
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

            <div className="row">
              {(["attack", "defense", "movement", "cost", "fuel_consumption", "frequency"] as const).map(
                (field) => (
                  <div key={field}>
                    <label>{field}</label>
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
                )
              )}
            </div>

            <label>Icon name</label>
            <input
              value={t.icon}
              onChange={(e) =>
                update((s) => {
                  s.unit_types[id].icon = e.target.value;
                  return s;
                })
              }
            />
            <IconUploader iconKey={t.icon} />

            <button onClick={() => removeUnitType(id)}>Remove unit type</button>
          </div>
        );
      })}
      <button onClick={addUnitType}>Add unit type</button>
    </div>
  );
}
