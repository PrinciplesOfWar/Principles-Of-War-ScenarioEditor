import { useRef } from "react";
import { useStore } from "../state/store";
import { exportScenarioToFile, parseScenarioFromJson } from "../lib/exportImport";

export default function TopBar() {
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const scenario = useStore((s) => s.scenario);
  const switchProject = useStore((s) => s.switchProject);
  const closeProject = useStore((s) => s.closeProject);
  const newScenario = useStore((s) => s.newScenario);
  const loadScenario = useStore((s) => s.loadScenario);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleImportClick() {
    fileInput.current?.click();
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
        <strong>PoW Map Editor</strong>
        <button onClick={() => newScenario()}>New tab</button>
        <button onClick={handleImportClick}>Import JSON</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button onClick={() => exportScenarioToFile(scenario)}>Export JSON</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
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
