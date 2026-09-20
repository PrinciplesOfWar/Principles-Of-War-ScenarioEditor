import { useStore } from "../../state/store";

export default function TurnForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);

  return (
    <div className="panel">
      <h3>Turn</h3>
      <label>Duration</label>
      <input
        type="number"
        value={scenario.turn.duration}
        onChange={(e) =>
          update((s) => {
            s.turn.duration = Number(e.target.value);
            return s;
          })
        }
      />
    </div>
  );
}
