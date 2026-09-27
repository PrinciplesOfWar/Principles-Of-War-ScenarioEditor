import { useState } from "react";
import TopBar from "./components/TopBar";
import ResizeHandle from "./components/ResizeHandle";
import LayerPanel from "./components/Sidebar/LayerPanel";
import ToolPanel from "./components/Sidebar/ToolPanel";
import UnitPanel from "./components/Sidebar/UnitPanel";
import HexCanvas from "./components/Canvas/HexCanvas";
import MetadataForm from "./components/Panels/MetadataForm";
import SizeForm from "./components/Panels/SizeForm";
import FactionsForm from "./components/Panels/FactionsForm";
import TimeSeasonsForm from "./components/Panels/TimeSeasonsForm";
import TurnForm from "./components/Panels/TurnForm";
import UnitTypesEditor from "./components/Panels/UnitTypesEditor";

const MIN_SIDEBAR = 180;
const MAX_SIDEBAR = 600;

type LeftTab = "metadata" | "size" | "factions" | "time" | "turn" | "unit_types";

const TABS: { id: LeftTab; label: string }[] = [
  { id: "metadata", label: "Metadata" },
  { id: "size", label: "Size" },
  { id: "factions", label: "Factions" },
  { id: "time", label: "Time / Seasons" },
  { id: "turn", label: "Turn" },
  { id: "unit_types", label: "Unit Types" },
];

export default function App() {
  const [tab, setTab] = useState<LeftTab>("metadata");
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(340);

  return (
    <div className="app">
      <TopBar />
      <div className="app-body">
        <div className="left-col" style={{ width: leftWidth }}>
          <div className="tabs">
            <select
              className="tab-select"
              value={tab}
              onChange={(e) => setTab(e.target.value as LeftTab)}
            >
              {TABS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tab-content">
            {tab === "metadata" && <MetadataForm />}
            {tab === "size" && <SizeForm />}
            {tab === "factions" && <FactionsForm />}
            {tab === "time" && <TimeSeasonsForm />}
            {tab === "turn" && <TurnForm />}
            {tab === "unit_types" && <UnitTypesEditor />}
          </div>
        </div>
        <ResizeHandle
          onResize={(delta) =>
            setLeftWidth((w) => Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, w + delta)))
          }
        />
        <div className="center-col">
          <HexCanvas />
        </div>
        <ResizeHandle
          onResize={(delta) =>
            setRightWidth((w) => Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, w - delta)))
          }
        />
        <div className="right-col" style={{ width: rightWidth }}>
          <LayerPanel />
          <ToolPanel />
          <UnitPanel />
        </div>
      </div>
    </div>
  );
}
