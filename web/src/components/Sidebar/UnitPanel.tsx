import { parseIntInRange, parseNonNegativeInt, parsePositiveInt } from "../../lib/number";
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
  const hex = scenario.map.hexagons.find((h) => h.x === x && h.y === y);
  const isWater = hex?.terrain === "water";
  const isNeutral = hex?.faction === "neutral";

  function addUnit() {
    if (isWater || isNeutral || !hex) return; // units belong to the hex's faction, which must be set and non-water
    const firstType = unitTypes.find((t) => t.faction === hex.faction) ?? unitTypes[0];
    update((s) => {
      s.units.push({
        x,
        y,
        faction: hex.faction,
        type: firstType?.id ?? "",
        attack: firstType?.attack ?? 0,
        defense: firstType?.defense ?? 1,
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
      {isWater && <p className="hint">Water hexes can't host units.</p>}
      {isNeutral && !isWater && <p className="hint">Paint a faction on this hex before adding units.</p>}
      {unitsHere.length === 0 && <p className="hint">No units here.</p>}
      {unitsHere.map((u, idx) => (
        <div key={idx} className="unit-row">
          <div className="unit-field">
            <label>Type</label>
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
              {unitTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="unit-field">
            <label>Attack</label>
            <input
              type="number"
              min={0}
              step={1}
              value={u.attack}
              onChange={(e) =>
                update((s) => {
                  const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                  list[idx].attack = parseNonNegativeInt(e.target.value);
                  return s;
                })
              }
            />
          </div>
          <div className="unit-field">
            <label>Defense</label>
            <input
              type="number"
              min={1}
              step={1}
              value={u.defense}
              onChange={(e) =>
                update((s) => {
                  const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                  list[idx].defense = parsePositiveInt(e.target.value);
                  return s;
                })
              }
            />
          </div>
          <div className="unit-field">
            <label>Movement</label>
            <input
              type="number"
              min={0}
              max={4}
              step={1}
              value={u.movement}
              onChange={(e) =>
                update((s) => {
                  const list = s.units.filter((uu) => uu.x === x && uu.y === y);
                  list[idx].movement = parseIntInRange(e.target.value, 0, 4);
                  return s;
                })
              }
            />
          </div>
          <button onClick={() => removeUnit(idx)}>Remove</button>
        </div>
      ))}
      <button onClick={addUnit} disabled={isWater || isNeutral || unitTypes.length === 0}>
        Add unit
      </button>
    </div>
  );
}
