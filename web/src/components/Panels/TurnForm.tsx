import { parseIntInRange } from "../../lib/number";
import { useStore } from "../../state/store";

export default function TurnForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);

  return (
    <div className="panel">
      <h3>Turn</h3>
      <label>Duration (seconds)</label>
      <input
        type="number"
        min={1}
        max={600}
        step={1}
        value={scenario.turn.duration}
        onChange={(e) =>
          update((s) => {
            s.turn.duration = parseIntInRange(e.target.value, 1, 600);
            return s;
          })
        }
      />
    </div>
  );
}
