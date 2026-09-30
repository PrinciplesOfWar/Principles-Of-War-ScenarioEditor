import { useEffect, useState } from "react";
import { daysInMonth, formatSeasonKey, MONTH_NAMES } from "../../lib/calendar";
import { clampProbability, parseInteger, parsePositiveInt } from "../../lib/number";
import { useStore } from "../../state/store";
import { TERRAIN_TYPES, type TerrainType } from "../../types/scenarioV2";

export default function TimeSeasonsForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const [newDay, setNewDay] = useState(1);
  const [newMonth, setNewMonth] = useState(1);
  const t = scenario.time;
  const seasonKeys = Object.keys(t.seasons);
  const dayOptions = (month: number) => Array.from({ length: daysInMonth(month, t.year) }, (_, i) => i + 1);

  // A scenario loaded from a file predating this validation (or edited outside the
  // editor) can carry a day past the end of its month — clamp it so the dropdown
  // below always has a matching option.
  useEffect(() => {
    const max = daysInMonth(t.month, t.year);
    if (t.day > max) {
      update((s) => {
        s.time.day = daysInMonth(s.time.month, s.time.year);
        return s;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.day, t.month, t.year]);

  function addSeasonKey() {
    const key = `${String(newDay).padStart(2, "0")}-${String(newMonth).padStart(2, "0")}`;
    update((s) => {
      if (!s.time.seasons[key]) s.time.seasons[key] = {};
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
      <label>Day</label>
      <select
        value={t.day}
        onChange={(e) =>
          update((s) => {
            s.time.day = Number(e.target.value);
            return s;
          })
        }
      >
        {dayOptions(t.month).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <label>Month</label>
      <select
        value={t.month}
        onChange={(e) =>
          update((s) => {
            const month = Number(e.target.value);
            s.time.month = month;
            // Switching months (or the day-count changing below) can leave the
            // stored day past the end of the new month — clamp it back in range.
            const max = daysInMonth(month, s.time.year);
            if (s.time.day > max) s.time.day = max;
            return s;
          })
        }
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <label>Year</label>
      <input
        type="number"
        step={1}
        value={t.year}
        onChange={(e) =>
          update((s) => {
            const year = parseInteger(e.target.value);
            s.time.year = year;
            // A year change can turn Feb 29 invalid (or valid) — re-clamp the day.
            const max = daysInMonth(s.time.month, year);
            if (s.time.day > max) s.time.day = max;
            return s;
          })
        }
      />
      <label>Increment (days)</label>
      <input
        type="number"
        min={1}
        step={1}
        value={t.increment}
        onChange={(e) =>
          update((s) => {
            s.time.increment = parsePositiveInt(e.target.value);
            return s;
          })
        }
      />

      <h4>Seasons</h4>
      <div className="detail-form faction-block">
        <div className="row">
          <select value={newDay} onChange={(e) => setNewDay(Number(e.target.value))}>
            {dayOptions(newMonth).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={newMonth}
            onChange={(e) => {
              const month = Number(e.target.value);
              setNewMonth(month);
              const max = daysInMonth(month, t.year);
              if (newDay > max) setNewDay(max);
            }}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <button onClick={addSeasonKey}>Add date</button>
        </div>
      </div>

      {seasonKeys.map((key) => (
        <div key={key} className="detail-form faction-block">
          <div className="row">
            <strong>{formatSeasonKey(key)}</strong>
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
                min={0.05}
                max={1}
                step={0.05}
                value={rule!.probability}
                onChange={(e) =>
                  update((s) => {
                    const entry = s.time.seasons[key][fromTerrain as TerrainType];
                    if (entry) entry.probability = clampProbability(e.target.value);
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
