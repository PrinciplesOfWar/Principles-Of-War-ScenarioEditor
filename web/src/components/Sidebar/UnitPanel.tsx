import { useStore } from "../../state/store";
import { orderedFactionNames } from "../../types/scenario";

export default function UnitPanel() {
  const selectedHex = useStore((s) => s.selectedHex);
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const activeLayer = useStore((s) => s.activeLayer);

  if (activeLayer !== "units" || !selectedHex) return null;

  const { x, y } = selectedHex;
  const unitsHere = scenario.units.filter((u) => u.x === x && u.y === y);
  const unitTypeIds = Object.keys(scenario.unit_types);
  const factionNames = orderedFactionNames(scenario.factions);

  function addUnit() {
    const firstType = unitTypeIds[0];
    const def = firstType ? scenario.unit_types[firstType] : undefined;
    update((s) => {
      s.units.push({
        x,
        y,
        faction: def?.faction ?? factionNames[0] ?? "neutral",
        type: firstType ?? "",
        attack: def?.attack ?? 0,
        defense: def?.defense ?? 0,
        movement: def?.movement ?? 0,
      });
      return s;
    });
  }

  function removeUnit(index: number) {
    update((s) => {
      const hereIndexes = s.units
        .map((u, i) => ({ u, i }))
        .filter(({ u }) => u.x === x && u.y === y)
        .map(({ i }) => i);
      s.units.splice(hereIndexes[index], 1);
      return s;
    });
  }

  return (
    <div className="panel">
      <h3>
        Units at ({x}, {y})
      </h3>
      {unitsHere.length === 0 && <p className="hint">No units here.</p>}
      {unitsHere.map((u, idx) => (
        <div key={idx} className="unit-row">
          <select
            value={u.faction}
            onChange={(e) =>
              update((s) => {
                const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                list[idx].faction = e.target.value;
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
          <select
            value={u.type}
            onChange={(e) =>
              update((s) => {
                const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                const t = s.unit_types[e.target.value];
                list[idx].type = e.target.value;
                if (t) {
                  list[idx].attack = t.attack;
                  list[idx].defense = t.defense;
                  list[idx].movement = t.movement;
                }
                return s;
              })
            }
          >
            <option value="">(none)</option>
            {unitTypeIds.map((id) => (
              <option key={id} value={id}>
                {scenario.unit_types[id].name}
              </option>
            ))}
          </select>
          <input
            type="number"
            title="attack"
            value={u.attack}
            onChange={(e) =>
              update((s) => {
                const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                list[idx].attack = Number(e.target.value);
                return s;
              })
            }
          />
          <input
            type="number"
            title="defense"
            value={u.defense}
            onChange={(e) =>
              update((s) => {
                const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                list[idx].defense = Number(e.target.value);
                return s;
              })
            }
          />
          <input
            type="number"
            title="movement"
            value={u.movement}
            onChange={(e) =>
              update((s) => {
                const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                list[idx].movement = Number(e.target.value);
                return s;
              })
            }
          />
          <button onClick={() => removeUnit(idx)}>Remove</button>
        </div>
      ))}
      <button onClick={addUnit} disabled={unitTypeIds.length === 0 && factionNames.length === 0}>
        Add unit
      </button>
    </div>
  );
}
