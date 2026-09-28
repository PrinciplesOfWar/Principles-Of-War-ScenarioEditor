import { useState } from "react";
import { parseScenarioFromJson } from "../lib/exportImport";
import { convertV1ToV2 } from "../lib/convertV1ToV2";
import type { ScenarioV2 } from "../types/scenarioV2";

type Status = "idle" | "converting" | "done";

export default function ConvertDialog({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ScenarioV2 | null>(null);
  const [fileName, setFileName] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("converting");
    setErrors([]);
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const v1 = parseScenarioFromJson(text);
      const converted = await convertV1ToV2(v1);
      setErrors(converted.errors);
      setResult(converted.data);
    } catch (err) {
      setErrors([`Failed to read file: ${(err as Error).message}`]);
    } finally {
      setStatus("done");
      e.target.value = "";
    }
  }

  function handleSave() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.json$/i, "") + ".v2.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Convert v1 → v2</h3>
        <p className="hint">Upload a v1 scenario JSON file to convert it to the v2 format.</p>
        <label className="file-button">
          Choose file
          <input type="file" accept="application/json" onChange={handleFile} />
        </label>

        {status === "converting" && <p className="hint">Converting…</p>}

        {status === "done" && errors.length > 0 && (
          <div className="convert-errors">
            <p className="field-error">
              {errors.length} error{errors.length === 1 ? "" : "s"} found — conversion cannot be saved:
            </p>
            <ul>
              {errors.map((err, i) => (
                <li key={i} className="field-error">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {status === "done" && result && errors.length === 0 && (
          <div className="convert-success">
            <p>
              Converted successfully — {result.factions.length} factions, {result.map.hexagons.length}{" "}
              hexagons, {result.unit_types.length} unit types, {result.units.length} units.
            </p>
            <button className="save" onClick={handleSave}>
              Save v2 JSON
            </button>
          </div>
        )}

        <div className="row pending-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
