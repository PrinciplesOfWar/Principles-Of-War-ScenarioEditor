import { useStore } from "../../state/store";
import { LANDMARK_TYPES, orderedFactionNames, TERRAIN_TYPES } from "../../types/scenario";

export default function ToolPanel() {
  const activeLayer = useStore((s) => s.activeLayer);
  const activeTerrain = useStore((s) => s.activeTerrain);
  const setActiveTerrain = useStore((s) => s.setActiveTerrain);
  const activeLandmark = useStore((s) => s.activeLandmark);
  const setActiveLandmark = useStore((s) => s.setActiveLandmark);
  const activeFaction = useStore((s) => s.activeFaction);
  const setActiveFaction = useStore((s) => s.setActiveFaction);
  const scenario = useStore((s) => s.scenario);
  const selectedHex = useStore((s) => s.selectedHex);

  const factionNames = ["neutral", ...orderedFactionNames(scenario.factions)];

  return (
    <div className="panel">
      <h3>Tool Options</h3>

      {activeLayer === "image" && <ImageLayerControls />}

      {activeLayer === "terrain" && (
        <>
          <label>Terrain type</label>
          <div className="swatches">
            {TERRAIN_TYPES.map((t) => (
              <button
                key={t}
                className={activeTerrain === t ? "active" : ""}
                onClick={() => setActiveTerrain(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {activeLayer === "faction" && (
        <>
          <label>Faction (front-line ownership)</label>
          <div className="swatches">
            {factionNames.map((f) => (
              <button
                key={f}
                className={activeFaction === f ? "active" : ""}
                onClick={() => setActiveFaction(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="hint">Click a hex to set which faction currently holds it.</p>
        </>
      )}

      {activeLayer === "rivers" && (
        <p className="hint">Click near a hex edge to toggle a river segment on that edge.</p>
      )}

      {activeLayer === "railway" && <p className="hint">Click a hex to toggle railway.</p>}

      {activeLayer === "ports" && <p className="hint">Click a hex to toggle a port.</p>}

      {(activeLayer === "objective_player" || activeLayer === "objective_enemy") && (
        <p className="hint">
          Click a hex to toggle the objective flag for{" "}
          {activeLayer === "objective_player" ? "faction_0" : "faction_1"}.
        </p>
      )}

      {activeLayer === "landmarks" && (
        <>
          <label>Landmark type to paint</label>
          <div className="swatches">
            {LANDMARK_TYPES.map((l) => (
              <button
                key={l}
                className={activeLandmark === l ? "active" : ""}
                onClick={() => setActiveLandmark(l)}
              >
                {l === "default" ? "none" : l}
              </button>
            ))}
          </div>
          <p className="hint">
            Click an empty hex to place the selected landmark type. Clicking a hex that already
            has a landmark just selects it so you can edit its details below — pick "none" and
            click a landmark to remove it instead.
          </p>
          {selectedHex && <LandmarkDetail x={selectedHex.x} y={selectedHex.y} />}
        </>
      )}

      {activeLayer === "units" && <p className="hint">Select a hex, then edit units in the panel below.</p>}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function ImageLayerControls() {
  const referenceImage = useStore((s) => s.referenceImage);
  const setReferenceImage = useStore((s) => s.setReferenceImage);
  const setReferenceScale = useStore((s) => s.setReferenceScale);
  const clearReferenceImage = useStore((s) => s.clearReferenceImage);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const { width, height } = await loadImageDimensions(dataUrl);
    setReferenceImage(dataUrl, width, height);
    e.target.value = "";
  }

  return (
    <>
      <p className="hint">
        Upload a reference image (satellite photo, hand-drawn sketch, etc.) to trace terrain
        placement over. It renders above the terrain layer and is never included in the exported
        scenario JSON. Use the visibility checkbox and opacity slider on the Image layer in the
        Layers panel to show/hide it or adjust transparency.
      </p>
      <label>Upload image</label>
      <input type="file" accept="image/*" onChange={handleFile} />

      {referenceImage && (
        <div className="detail-form">
          <label>Image size</label>
          <p className="hint">
            {referenceImage.width} x {referenceImage.height} px
          </p>

          <div className="row">
            <div>
              <label>X scaling ({Math.round(referenceImage.scaleX * 100)}%)</label>
              <input
                type="number"
                min={1}
                max={500}
                step={1}
                value={Math.round(referenceImage.scaleX * 100)}
                onChange={(e) =>
                  setReferenceScale(Math.max(1, Number(e.target.value)) / 100, referenceImage.scaleY)
                }
              />
            </div>
            <div>
              <label>Y scaling ({Math.round(referenceImage.scaleY * 100)}%)</label>
              <input
                type="number"
                min={1}
                max={500}
                step={1}
                value={Math.round(referenceImage.scaleY * 100)}
                onChange={(e) =>
                  setReferenceScale(referenceImage.scaleX, Math.max(1, Number(e.target.value)) / 100)
                }
              />
            </div>
          </div>
          <button onClick={() => setReferenceScale(1, 1)}>Reset scaling</button>

          <button onClick={clearReferenceImage}>Remove image</button>
        </div>
      )}
    </>
  );
}

function LandmarkDetail({ x, y }: { x: number; y: number }) {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const hex = scenario.hexagons.find((h) => h.x === x && h.y === y);
  const factionNames = ["neutral", ...orderedFactionNames(scenario.factions)];
  if (!hex || hex.landmark === "default") return null;

  if (hex.landmark === "city") {
    const entry = scenario.landmarks.city.find((c) => c.x === x && c.y === y);
    if (!entry) return null;
    return (
      <div className="detail-form">
        <label>Name</label>
        <input
          value={entry.name}
          onChange={(e) =>
            update((s) => {
              const c = s.landmarks.city.find((cc) => cc.x === x && cc.y === y);
              if (c) c.name = e.target.value;
              return s;
            })
          }
        />
        <label>Faction</label>
        <select
          value={entry.faction}
          onChange={(e) =>
            update((s) => {
              const c = s.landmarks.city.find((cc) => cc.x === x && cc.y === y);
              if (c) c.faction = e.target.value;
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
        <label>Population</label>
        <input
          type="number"
          value={entry.population}
          onChange={(e) =>
            update((s) => {
              const c = s.landmarks.city.find((cc) => cc.x === x && cc.y === y);
              if (c) c.population = Number(e.target.value);
              return s;
            })
          }
        />
      </div>
    );
  }

  if (hex.landmark === "oilfield") {
    const entry = scenario.landmarks.oilfield.find((c) => c.x === x && c.y === y);
    if (!entry) return null;
    return (
      <div className="detail-form">
        <label>Production</label>
        <input
          type="number"
          value={entry.production}
          onChange={(e) =>
            update((s) => {
              const o = s.landmarks.oilfield.find((oo) => oo.x === x && oo.y === y);
              if (o) o.production = Number(e.target.value);
              return s;
            })
          }
        />
      </div>
    );
  }

  if (hex.landmark === "supply") {
    const entry = scenario.landmarks.supply.find((c) => c.x === x && c.y === y);
    if (!entry) return null;
    return (
      <div className="detail-form">
        <label>Faction</label>
        <select
          value={entry.faction}
          onChange={(e) =>
            update((s) => {
              const sup = s.landmarks.supply.find((ss) => ss.x === x && ss.y === y);
              if (sup) sup.faction = e.target.value;
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
      </div>
    );
  }

  return null;
}
