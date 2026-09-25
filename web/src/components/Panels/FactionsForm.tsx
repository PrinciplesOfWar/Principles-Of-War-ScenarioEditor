import { useStore } from "../../state/store";
import { orderedFactionNames } from "../../types/scenario";

export default function FactionsForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const names = orderedFactionNames(scenario.factions);

  return (
    <div className="panel">
      <h3>Factions</h3>
      {names.map((name) => {
        const f = scenario.factions[name];
        return (
          <div key={name} className="detail-form faction-block">
            <label>Name</label>
            <input
              value={f.name}
              onChange={(e) =>
                update((s) => {
                  const old = s.factions[name];
                  delete s.factions[name];
                  old.name = e.target.value;
                  s.factions[e.target.value] = old;
                  return s;
                })
              }
            />
            <label>Unit cap</label>
            <input
              type="number"
              value={f.units.cap}
              onChange={(e) =>
                update((s) => {
                  s.factions[name].units.cap = Number(e.target.value);
                  return s;
                })
              }
            />
            {(["manpower", "fuel", "airpower"] as const).map((res) => (
              <fieldset key={res}>
                <legend>{res}</legend>
                <label>Points</label>
                <input
                  type="number"
                  value={f[res].points}
                  onChange={(e) =>
                    update((s) => {
                      s.factions[name][res].points = Number(e.target.value);
                      return s;
                    })
                  }
                />
                <label>Income</label>
                <input
                  type="number"
                  value={f[res].income}
                  onChange={(e) =>
                    update((s) => {
                      s.factions[name][res].income = Number(e.target.value);
                      return s;
                    })
                  }
                />
                <label>Cap</label>
                <input
                  type="number"
                  value={f[res].cap}
                  onChange={(e) =>
                    update((s) => {
                      s.factions[name][res].cap = Number(e.target.value);
                      return s;
                    })
                  }
                />
              </fieldset>
            ))}
          </div>
        );
      })}
    </div>
  );
}
