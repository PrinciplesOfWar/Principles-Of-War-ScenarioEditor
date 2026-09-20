import { useState } from "react";
import { useStore } from "../../state/store";
import { TERRAIN_TYPES, type TerrainType } from "../../types/scenario";

export default function TimeSeasonsForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const [newKey, setNewKey] = useState("01-01");
  const t = scenario.time;
  const seasonKeys = Object.keys(t.seasons);

  function addSeasonKey() {
    if (!/^\d{2}-\d{2}$/.test(newKey)) return;
    update((s) => {
      if (!s.time.seasons[newKey]) s.time.seasons[newKey] = {};
      return s;
    });
  }

  function removeSeasonKey(key: string) {
    update((s) => {
      delete s.time.seasons[key];
      return s;
    });
  }

  function addRule(key: string) {
    update((s) => {
      s.time.seasons[key]["grass"] = { to: "snow", probability: 0.5 };
      return s;
    });
  }

  return (
    <div className="panel">
      <h3>Time</h3>
      <div className="row">
        <div>
          <label>Day</label>
          <input
            type="number"
            value={t.day}
            onChange={(e) =>
              update((s) => {
                s.time.day = Number(e.target.value);
                return s;
              })
            }
          />
        </div>
        <div>
          <label>Month</label>
          <input
            type="number"
            value={t.month}
            onChange={(e) =>
              update((s) => {
                s.time.month = Number(e.target.value);
                return s;
              })
            }
          />
        </div>
        <div>
          <label>Year</label>
          <input
            type="number"
            value={t.year}
            onChange={(e) =>
              update((s) => {
                s.time.year = Number(e.target.value);
                return s;
              })
            }
          />
        </div>
        <div>
          <label>Increment</label>
          <input
            type="number"
            value={t.increment}
            onChange={(e) =>
              update((s) => {
                s.time.increment = Number(e.target.value);
                return s;
              })
            }
          />
        </div>
      </div>

      <h4>Seasons</h4>
      <div className="row">
        <input
          value={newKey}
          placeholder="DD-MM"
          onChange={(e) => setNewKey(e.target.value)}
          style={{ width: "5rem" }}
        />
        <button onClick={addSeasonKey}>Add date</button>
      </div>

      {seasonKeys.map((key) => (
        <div key={key} className="detail-form faction-block">
          <div className="row">
            <strong>{key}</strong>
            <button onClick={() => removeSeasonKey(key)}>Remove date</button>
          </div>
          {Object.entries(t.seasons[key]).map(([fromTerrain, rule]) => (
            <div key={fromTerrain} className="row">
              <select
                value={fromTerrain}
                onChange={(e) =>
                  update((s) => {
                    const entry = s.time.seasons[key];
                    const from = fromTerrain as TerrainType;
                    const r = entry[from]!;
                    delete entry[from];
                    entry[e.target.value as TerrainType] = r;
                    return s;
                  })
                }
              >
                {TERRAIN_TYPES.map((tt) => (
                  <option key={tt} value={tt}>
                    {tt}
                  </option>
                ))}
              </select>
              <span>&rarr;</span>
              <select
                value={rule!.to}
                onChange={(e) =>
                  update((s) => {
                    const entry = s.time.seasons[key][fromTerrain as TerrainType];
                    if (entry) entry.to = e.target.value as TerrainType;
                    return s;
                  })
                }
              >
                {TERRAIN_TYPES.map((tt) => (
                  <option key={tt} value={tt}>
                    {tt}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={rule!.probability}
                onChange={(e) =>
                  update((s) => {
                    const entry = s.time.seasons[key][fromTerrain as TerrainType];
                    if (entry) entry.probability = Number(e.target.value);
                    return s;
                  })
                }
              />
              <button
                onClick={() =>
                  update((s) => {
                    delete s.time.seasons[key][fromTerrain as TerrainType];
                    return s;
                  })
                }
              >
                Remove rule
              </button>
            </div>
          ))}
          <button onClick={() => addRule(key)}>Add rule</button>
        </div>
      ))}
    </div>
  );
}
