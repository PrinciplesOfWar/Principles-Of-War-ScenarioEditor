import { useStore } from "../../state/store";
import { LAYERS } from "../../types/app";

export default function LayerPanel() {
  const activeLayer = useStore((s) => s.activeLayer);
  const setActiveLayer = useStore((s) => s.setActiveLayer);
  const layerSettings = useStore((s) => s.layerSettings);
  const setLayerVisible = useStore((s) => s.setLayerVisible);
  const setLayerOpacity = useStore((s) => s.setLayerOpacity);
  const factions = useStore((s) => s.scenario.factions);

  function layerLabel(l: (typeof LAYERS)[number]): string {
    if (l.id === "objective_player") return `Objective (${factions[0]?.name ?? "1st faction"})`;
    if (l.id === "objective_enemy") return `Objective (${factions[1]?.name ?? "2nd faction"})`;
    return l.label;
  }

  return (
    <div className="panel">
      <h3>Layers</h3>
      <ul className="layer-list">
        {LAYERS.map((l) => {
          const settings = layerSettings[l.id];
          return (
            <li key={l.id} className="layer-row">
              <div className="layer-row-top">
                <button
                  className={activeLayer === l.id ? "active" : ""}
                  onClick={() => setActiveLayer(l.id)}
                >
                  {layerLabel(l)}
                </button>
                <input
                  type="checkbox"
                  title="Toggle layer visibility"
                  checked={settings?.visible ?? true}
                  onChange={(e) => setLayerVisible(l.id, e.target.checked)}
                />
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                title="Layer transparency"
                value={settings?.opacity ?? 1}
                onChange={(e) => setLayerOpacity(l.id, Number(e.target.value))}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
