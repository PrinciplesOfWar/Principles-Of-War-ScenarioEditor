import { create } from "zustand";
import { canonicalEdgeSlot, neighborOffset, oppositeEdge } from "../lib/hexGrid";
import { LAYERS, type LayerId, type LayerSettings, type ReferenceImage } from "../types/app";
import {
  createEmptyScenarioV2,
  defaultHexagonV2,
  type HexagonV2,
  type LabelType,
  type LandmarkType,
  type ScenarioV2,
  type TerrainType,
} from "../types/scenarioV2";

const STORAGE_KEY = "pow-map-editor-projects-v2";
const LAYER_SETTINGS_KEY = "pow-map-editor-layer-settings";
const MAX_HISTORY = 50;

function defaultLayerSettings(): Record<LayerId, LayerSettings> {
  const entries = LAYERS.map((l) => [l.id, { visible: true, opacity: 1 }] as const);
  return Object.fromEntries(entries) as Record<LayerId, LayerSettings>;
}

function loadLayerSettings(): Record<LayerId, LayerSettings> {
  try {
    const raw = localStorage.getItem(LAYER_SETTINGS_KEY);
    if (raw) return { ...defaultLayerSettings(), ...(JSON.parse(raw) as Record<LayerId, LayerSettings>) };
  } catch {
    /* ignore corrupt storage */
  }
  return defaultLayerSettings();
}

function persistLayerSettings(settings: Record<LayerId, LayerSettings>) {
  try {
    localStorage.setItem(LAYER_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full or unavailable, ignore */
  }
}

export interface Project {
  id: string;
  scenario: ScenarioV2;
  past: ScenarioV2[];
  future: ScenarioV2[];
  referenceImage: ReferenceImage | null;
}

interface PersistedShape {
  projects: { id: string; scenario: ScenarioV2; referenceImage: ReferenceImage | null }[];
  activeProjectId: string;
}

interface StoreState {
  projects: Project[];
  activeProjectId: string;
  scenario: ScenarioV2;
  referenceImage: ReferenceImage | null;

  activeLayer: LayerId;
  activeTerrain: TerrainType;
  activeFaction: string;
  activeLandmark: LandmarkType;
  activeLabelType: LabelType;
  selectedHex: { x: number; y: number } | null;
  selectedLabelSlot: { edge: number | null } | null;
  layerSettings: Record<LayerId, LayerSettings>;

  setActiveLayer: (l: LayerId) => void;
  setActiveTerrain: (t: TerrainType) => void;
  setActiveFaction: (f: string) => void;
  setActiveLandmark: (l: LandmarkType) => void;
  setActiveLabelType: (t: LabelType) => void;
  selectHex: (x: number, y: number) => void;
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;

  switchProject: (id: string) => void;
  addProject: (scenario?: ScenarioV2) => void;
  closeProject: (id: string) => void;

  setReferenceImage: (dataUrl: string, width: number, height: number) => void;
  setReferenceScale: (scaleX: number, scaleY: number) => void;
  clearReferenceImage: () => void;

  update: (mutator: (s: ScenarioV2) => ScenarioV2) => void;
  loadScenario: (s: ScenarioV2) => void;
  newScenario: () => void;
  undo: () => void;
  redo: () => void;

  paintTerrain: (x: number, y: number) => void;
  paintFaction: (x: number, y: number, faction: string) => void;
  togglePort: (x: number, y: number) => void;
  toggleLogistics: (x: number, y: number) => void;
  toggleRiverEdge: (x: number, y: number, edge: number) => void;
  toggleObjective: (x: number, y: number, which: "player" | "enemy") => void;
  setLandmark: (x: number, y: number, type: LandmarkType) => void;
  placeOrSelectLabel: (x: number, y: number, edge: number | null) => void;
  removeLabel: (x: number, y: number, edge: number | null) => void;
  resizeMap: (width: number, height: number) => void;
}

function getHex(s: ScenarioV2, x: number, y: number): HexagonV2 | undefined {
  return s.map.hexagons.find((h) => h.x === x && h.y === y);
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadFromStorage(): { projects: Project[]; activeProjectId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedShape;
      if (parsed.projects?.length) {
        return {
          projects: parsed.projects.map((p) => ({
            id: p.id,
            scenario: p.scenario,
            past: [],
            future: [],
            referenceImage: p.referenceImage ?? null,
          })),
          activeProjectId: parsed.activeProjectId ?? parsed.projects[0].id,
        };
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  const scenario = createEmptyScenarioV2();
  const id = makeId();
  return { projects: [{ id, scenario, past: [], future: [], referenceImage: null }], activeProjectId: id };
}

function persist(projects: Project[], activeProjectId: string) {
  try {
    const shape: PersistedShape = {
      projects: projects.map((p) => ({ id: p.id, scenario: p.scenario, referenceImage: p.referenceImage })),
      activeProjectId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  } catch {
    /* storage full or unavailable (large reference images can exceed the quota), ignore */
  }
}

const initial = loadFromStorage();

export const useStore = create<StoreState>((set, get) => ({
  projects: initial.projects,
  activeProjectId: initial.activeProjectId,
  scenario: initial.projects.find((p) => p.id === initial.activeProjectId)!.scenario,
  referenceImage: initial.projects.find((p) => p.id === initial.activeProjectId)!.referenceImage,

  activeLayer: "terrain",
  activeTerrain: "grass",
  activeFaction: "neutral",
  activeLandmark: "city",
  activeLabelType: "water",
  selectedHex: null,
  selectedLabelSlot: null,
  layerSettings: loadLayerSettings(),

  setActiveLayer: (l) => set({ activeLayer: l }),
  setActiveTerrain: (t) => set({ activeTerrain: t }),
  setActiveFaction: (f) => set({ activeFaction: f }),
  setActiveLandmark: (l) => set({ activeLandmark: l }),
  setActiveLabelType: (t) => set({ activeLabelType: t }),
  selectHex: (x, y) => set({ selectedHex: { x, y }, selectedLabelSlot: null }),

  setLayerVisible: (id, visible) => {
    const next = { ...get().layerSettings, [id]: { ...get().layerSettings[id], visible } };
    persistLayerSettings(next);
    set({ layerSettings: next });
  },

  setLayerOpacity: (id, opacity) => {
    const next = { ...get().layerSettings, [id]: { ...get().layerSettings[id], opacity } };
    persistLayerSettings(next);
    set({ layerSettings: next });
  },

  switchProject: (id) => {
    const { projects } = get();
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    persist(projects, id);
    set({ activeProjectId: id, scenario: project.scenario, referenceImage: project.referenceImage, selectedHex: null });
  },

  addProject: (scenario) => {
    const { projects } = get();
    const id = makeId();
    const next: Project = {
      id,
      scenario: scenario ?? createEmptyScenarioV2(),
      past: [],
      future: [],
      referenceImage: null,
    };
    const nextProjects = [...projects, next];
    persist(nextProjects, id);
    set({
      projects: nextProjects,
      activeProjectId: id,
      scenario: next.scenario,
      referenceImage: null,
      selectedHex: null,
    });
  },

  closeProject: (id) => {
    const { projects, activeProjectId } = get();
    if (projects.length <= 1) return;
    const remaining = projects.filter((p) => p.id !== id);
    const nextActiveId = id === activeProjectId ? remaining[0].id : activeProjectId;
    const nextActive = remaining.find((p) => p.id === nextActiveId)!;
    persist(remaining, nextActiveId);
    set({
      projects: remaining,
      activeProjectId: nextActiveId,
      scenario: nextActive.scenario,
      referenceImage: nextActive.referenceImage,
    });
  },

  setReferenceImage: (dataUrl, width, height) => {
    const { projects, activeProjectId } = get();
    const image: ReferenceImage = { dataUrl, width, height, scaleX: 1, scaleY: 1 };
    const nextProjects = projects.map((p) => (p.id === activeProjectId ? { ...p, referenceImage: image } : p));
    persist(nextProjects, activeProjectId);
    set({ projects: nextProjects, referenceImage: image });
  },

  setReferenceScale: (scaleX, scaleY) => {
    const { projects, activeProjectId, referenceImage } = get();
    if (!referenceImage) return;
    const image: ReferenceImage = { ...referenceImage, scaleX, scaleY };
    const nextProjects = projects.map((p) => (p.id === activeProjectId ? { ...p, referenceImage: image } : p));
    persist(nextProjects, activeProjectId);
    set({ projects: nextProjects, referenceImage: image });
  },

  clearReferenceImage: () => {
    const { projects, activeProjectId } = get();
    const nextProjects = projects.map((p) => (p.id === activeProjectId ? { ...p, referenceImage: null } : p));
    persist(nextProjects, activeProjectId);
    set({ projects: nextProjects, referenceImage: null });
  },

  update: (mutator) => {
    const { projects, activeProjectId, scenario } = get();
    const next = mutator(structuredClone(scenario));
    const nextProjects = projects.map((p) =>
      p.id === activeProjectId
        ? { ...p, scenario: next, past: [...p.past, scenario].slice(-MAX_HISTORY), future: [] }
        : p
    );
    persist(nextProjects, activeProjectId);
    set({ projects: nextProjects, scenario: next });
  },

  loadScenario: (s) => {
    // Import: opens the scenario in a brand-new tab so the current tab's work is preserved.
    get().addProject(s);
  },

  newScenario: () => {
    get().addProject();
  },

  undo: () => {
    const { projects, activeProjectId, scenario } = get();
    const project = projects.find((p) => p.id === activeProjectId)!;
    if (project.past.length === 0) return;
    const prev = project.past[project.past.length - 1];
    const nextProjects = projects.map((p) =>
      p.id === activeProjectId
        ? { ...p, scenario: prev, past: p.past.slice(0, -1), future: [scenario, ...p.future].slice(0, MAX_HISTORY) }
        : p
    );
    persist(nextProjects, activeProjectId);
    set({ projects: nextProjects, scenario: prev });
  },

  redo: () => {
    const { projects, activeProjectId, scenario } = get();
    const project = projects.find((p) => p.id === activeProjectId)!;
    if (project.future.length === 0) return;
    const next = project.future[0];
    const nextProjects = projects.map((p) =>
      p.id === activeProjectId
        ? { ...p, scenario: next, future: p.future.slice(1), past: [...p.past, scenario].slice(-MAX_HISTORY) }
        : p
    );
    persist(nextProjects, activeProjectId);
    set({ projects: nextProjects, scenario: next });
  },

  paintTerrain: (x, y) => {
    const { activeTerrain } = get();
    get().update((s) => {
      const h = getHex(s, x, y);
      if (h) h.terrain = activeTerrain;
      return s;
    });
  },

  paintFaction: (x, y, faction) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (h) h.faction = faction;
      return s;
    });
  },

  togglePort: (x, y) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (h) h.port = !h.port;
      return s;
    });
  },

  toggleLogistics: (x, y) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (h) h.logistics = !h.logistics;
      return s;
    });
  },

  toggleRiverEdge: (x, y, edge) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (!h) return s;
      const next = !h.river[edge];
      h.river[edge] = next;

      // Keep the shared edge in sync on the neighboring hex, if it exists on the map.
      const n = neighborOffset(x, y, edge);
      const neighborHex = getHex(s, n.x, n.y);
      if (neighborHex) neighborHex.river[oppositeEdge(edge)] = next;

      return s;
    });
  },

  toggleObjective: (x, y, which) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (!h) return s;
      const factionId = s.factions[which === "player" ? 0 : 1]?.id;
      if (!factionId) return s; // fewer than 2 factions — this layer is inert
      h.objective = h.objective.includes(factionId)
        ? h.objective.filter((id) => id !== factionId)
        : [...h.objective, factionId];
      return s;
    });
  },

  setLandmark: (x, y, type) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (!h) return s;
      h.landmark =
        type === "city"
          ? { type: "city", name: "", population: 0 }
          : type === "oilfield"
            ? { type: "oilfield", production: 0 }
            : type === "supply"
              ? { type: "supply" }
              : null;
      return s;
    });
  },

  placeOrSelectLabel: (x, y, edge) => {
    const { scenario, activeLabelType } = get();
    const c = canonicalEdgeSlot(x, y, edge, scenario.map.width, scenario.map.height);
    const existing = scenario.map.labels.find((l) => l.x === c.x && l.y === c.y && l.edge === c.edge);
    if (!existing) {
      get().update((s) => {
        s.map.labels.push({ x: c.x, y: c.y, edge: c.edge, type: activeLabelType, name: "" });
        return s;
      });
    } else if (existing.type !== activeLabelType) {
      get().update((s) => {
        const l = s.map.labels.find((ll) => ll.x === c.x && ll.y === c.y && ll.edge === c.edge);
        if (l) l.type = activeLabelType;
        return s;
      });
    }
    // selectedHex is re-anchored to the canonical hex too, so LabelDetail (which reads
    // selectedHex + selectedLabelSlot together) always looks up the same slot the label
    // is actually stored at, regardless of which side of the edge was clicked.
    set({ selectedHex: { x: c.x, y: c.y }, selectedLabelSlot: { edge: c.edge } });
  },

  removeLabel: (x, y, edge) => {
    const { scenario } = get();
    const c = canonicalEdgeSlot(x, y, edge, scenario.map.width, scenario.map.height);
    get().update((s) => {
      s.map.labels = s.map.labels.filter((l) => !(l.x === c.x && l.y === c.y && l.edge === c.edge));
      return s;
    });
    set({ selectedLabelSlot: null });
  },

  resizeMap: (width, height) => {
    get().update((s) => {
      const old = new Map(s.map.hexagons.map((h) => [`${h.x},${h.y}`, h]));
      const next: HexagonV2[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          next.push(old.get(`${x},${y}`) ?? defaultHexagonV2(x, y));
        }
      }
      s.map.hexagons = next;
      s.map.width = width;
      s.map.height = height;
      const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
      s.units = s.units.filter((u) => inBounds(u.x, u.y));
      s.map.labels = s.map.labels.filter((l) => inBounds(l.x, l.y));
      return s;
    });
  },
}));
