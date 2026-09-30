import { useRef, useState } from "react";
import { useStore } from "../state/store";
import { computeScenarioForExport, downloadScenarioFile, parseScenarioFromJson } from "../lib/exportImport";
import ConvertDialog from "./ConvertDialog";

export default function TopBar() {
  const [showConvert, setShowConvert] = useState(false);
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const scenario = useStore((s) => s.scenario);
  const switchProject = useStore((s) => s.switchProject);
  const closeProject = useStore((s) => s.closeProject);
  const newScenario = useStore((s) => s.newScenario);
  const loadScenario = useStore((s) => s.loadScenario);
  const update = useStore((s) => s.update);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleImportClick() {
    fileInput.current?.click();
  }

  function handleExport() {
    const final = computeScenarioForExport(scenario);
    downloadScenarioFile(final);
    // Reload the exported result into the current tab so the editor's
    // version hash matches what was just written to disk.
    update(() => final);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = parseScenarioFromJson(text);
      loadScenario(parsed);
    } catch (err) {
      alert(`Failed to import scenario: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="topbar-wrap">
      <div className="topbar">
        <button onClick={handleImportClick}>Import JSON</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button onClick={handleExport}>Export JSON</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <div className="topbar-right">
          <button onClick={() => setShowConvert(true)}>Convert v1 → v2</button>
          <strong className="topbar-title">PoW Map Editor</strong>
        </div>
      </div>
      {showConvert && <ConvertDialog onClose={() => setShowConvert(false)} />}
      <div className="tabstrip">
        {projects.map((p) => (
          <div
            key={p.id}
            className={"scenario-tab" + (p.id === activeProjectId ? " active" : "")}
            onClick={() => switchProject(p.id)}
          >
            <span>{p.scenario.metadata.name || p.scenario.metadata.id || "Untitled"}</span>
            {projects.length > 1 && (
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Close this scenario tab? Unsaved changes in it will be lost.")) {
                    closeProject(p.id);
                  }
                }}
              >
                x
              </button>
            )}
          </div>
        ))}
        <button className="tab-add" onClick={() => newScenario()}>
          +
        </button>
      </div>
    </div>
  );
}
