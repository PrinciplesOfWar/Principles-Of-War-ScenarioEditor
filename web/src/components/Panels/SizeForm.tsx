import { useStore } from "../../state/store";

export default function SizeForm() {
  const scenario = useStore((s) => s.scenario);
  const resizeMap = useStore((s) => s.resizeMap);
  const m = scenario.metadata;

  return (
    <div className="panel">
      <h3>Size</h3>
      <label>Width</label>
      <input
        type="number"
        min={1}
        value={m.width}
        onChange={(e) => resizeMap(Number(e.target.value), m.height)}
      />
      <label>Height</label>
      <input
        type="number"
        min={1}
        value={m.height}
        onChange={(e) => resizeMap(m.width, Number(e.target.value))}
      />
    </div>
  );
}
