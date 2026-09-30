import { useStore } from "../../state/store";

export default function UnitPanel() {
  const selectedHex = useStore((s) => s.selectedHex);
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const activeLayer = useStore((s) => s.activeLayer);

  if (activeLayer !== "units" || !selectedHex) return null;

  const { x, y } = selectedHex;
  const unitsHere = scenario.units.filter((u) => u.x === x && u.y === y);
  const unitTypes = scenario.unit_types;
  const factions = scenario.factions;
  const isWater = scenario.map.hexagons.find((h) => h.x === x && h.y === y)?.terrain === "water";

  function addUnit() {
    if (isWater) return; // units can't be placed on water hexes
    const firstType = unitTypes[0];
    update((s) => {
      s.units.push({
        x,
        y,
        faction: firstType?.faction ?? factions[0]?.id ?? "neutral",
        type: firstType?.id ?? "",
        attack: firstType?.attack ?? 0,
        defense: firstType?.defense ?? 0,
        movement: firstType?.movement ?? 0,
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
      {isWater && <p className="hint">Water hexes can't host units.</p>}
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
            {factions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={u.type}
            onChange={(e) =>
              update((s) => {
                const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                const t = s.unit_types.find((tt) => tt.id === e.target.value);
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
            {unitTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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
      <button onClick={addUnit} disabled={isWater || (unitTypes.length === 0 && factions.length === 0)}>
        Add unit
      </button>
    </div>
  );
}
