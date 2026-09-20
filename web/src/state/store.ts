import { create } from "zustand";
import { neighborOffset, oppositeEdge } from "../lib/hexGrid";
import {
  createEmptyScenario,
  defaultHexagon,
  LAYERS,
  type Hexagon,
  type LandmarkType,
  type LayerId,
  type LayerSettings,
  type ReferenceImage,
  type Scenario,
  type TerrainType,
} from "../types/scenario";

const STORAGE_KEY = "pow-map-editor-projects";
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
  scenario: Scenario;
  past: Scenario[];
  future: Scenario[];
  referenceImage: ReferenceImage | null;
}

interface PersistedShape {
  projects: { id: string; scenario: Scenario; referenceImage: ReferenceImage | null }[];
  activeProjectId: string;
}

interface StoreState {
  projects: Project[];
  activeProjectId: string;
  scenario: Scenario;
  referenceImage: ReferenceImage | null;

  activeLayer: LayerId;
  activeTerrain: TerrainType;
  activeFaction: string;
  activeLandmark: LandmarkType;
  selectedHex: { x: number; y: number } | null;
  layerSettings: Record<LayerId, LayerSettings>;

  setActiveLayer: (l: LayerId) => void;
  setActiveTerrain: (t: TerrainType) => void;
  setActiveFaction: (f: string) => void;
  setActiveLandmark: (l: LandmarkType) => void;
  selectHex: (x: number, y: number) => void;
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;

  switchProject: (id: string) => void;
  addProject: (scenario?: Scenario) => void;
  closeProject: (id: string) => void;

  setReferenceImage: (dataUrl: string, width: number, height: number) => void;
  setReferenceScale: (scaleX: number, scaleY: number) => void;
  clearReferenceImage: () => void;

  update: (mutator: (s: Scenario) => Scenario) => void;
  loadScenario: (s: Scenario) => void;
  newScenario: () => void;
  undo: () => void;
  redo: () => void;

  paintTerrain: (x: number, y: number) => void;
  paintFaction: (x: number, y: number, faction: string) => void;
  togglePort: (x: number, y: number) => void;
  toggleRailway: (x: number, y: number) => void;
  toggleRiverEdge: (x: number, y: number, edge: number) => void;
  toggleObjective: (x: number, y: number, which: "faction_0" | "faction_1") => void;
  setLandmark: (x: number, y: number, type: LandmarkType) => void;
  resizeMap: (width: number, height: number) => void;
}

function getHex(s: Scenario, x: number, y: number): Hexagon | undefined {
  return s.hexagons.find((h) => h.x === x && h.y === y);
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// One-time migration: projects saved before the default factions were renamed from
// "red"/"blue" to "faction 0"/"faction 1" still carry the old names everywhere they're
// referenced. Rename them in place (by id, not name) so old projects pick up the new
// naming/coloring automatically instead of looking "stuck" on red/blue.
function migrateLegacyFactionNames(scenario: Scenario): Scenario {
  const renames: Record<string, string> = {};
  for (const [name, faction] of Object.entries(scenario.factions)) {
    if (faction.id === "faction_0" && name !== "faction 0") renames[name] = "faction 0";
    if (faction.id === "faction_1" && name !== "faction 1") renames[name] = "faction 1";
  }
  if (Object.keys(renames).length === 0) return scenario;

  const next = structuredClone(scenario);
  for (const [oldName, newName] of Object.entries(renames)) {
    const faction = next.factions[oldName];
    delete next.factions[oldName];
    faction.name = newName;
    next.factions[newName] = faction;
  }
  const renameFaction = (f: string) => renames[f] ?? f;
  next.hexagons.forEach((h) => (h.faction = renameFaction(h.faction)));
  next.units.forEach((u) => (u.faction = renameFaction(u.faction)));
  next.unit_types = Object.fromEntries(
    Object.entries(next.unit_types).map(([id, t]) => [id, { ...t, faction: renameFaction(t.faction) }])
  );
  next.landmarks.city.forEach((l) => (l.faction = renameFaction(l.faction)));
  next.landmarks.supply.forEach((l) => (l.faction = renameFaction(l.faction)));
  return next;
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
            scenario: migrateLegacyFactionNames(p.scenario),
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
  const scenario = createEmptyScenario();
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
  selectedHex: null,
  layerSettings: loadLayerSettings(),

  setActiveLayer: (l) => set({ activeLayer: l }),
  setActiveTerrain: (t) => set({ activeTerrain: t }),
  setActiveFaction: (f) => set({ activeFaction: f }),
  setActiveLandmark: (l) => set({ activeLandmark: l }),
  selectHex: (x, y) => set({ selectedHex: { x, y } }),

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
      scenario: scenario ?? createEmptyScenario(),
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

  toggleRailway: (x, y) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (h) h.railway = !h.railway;
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
      if (h) h.objective[which] = !h.objective[which];
      return s;
    });
  },

  setLandmark: (x, y, type) => {
    get().update((s) => {
      const h = getHex(s, x, y);
      if (!h) return s;
      h.landmark = type;
      s.landmarks.city = s.landmarks.city.filter((l) => !(l.x === x && l.y === y));
      s.landmarks.oilfield = s.landmarks.oilfield.filter((l) => !(l.x === x && l.y === y));
      s.landmarks.supply = s.landmarks.supply.filter((l) => !(l.x === x && l.y === y));
      if (type === "city") {
        s.landmarks.city.push({ x, y, name: "City", faction: "neutral", population: 0 });
      } else if (type === "oilfield") {
        s.landmarks.oilfield.push({ x, y, production: 0 });
      } else if (type === "supply") {
        s.landmarks.supply.push({ x, y, faction: "neutral" });
      }
      return s;
    });
  },

  resizeMap: (width, height) => {
    get().update((s) => {
      const old = new Map(s.hexagons.map((h) => [`${h.x},${h.y}`, h]));
      const next: Hexagon[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          next.push(old.get(`${x},${y}`) ?? defaultHexagon(x, y));
        }
      }
      s.hexagons = next;
      s.metadata.width = width;
      s.metadata.height = height;
      const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
      s.units = s.units.filter((u) => inBounds(u.x, u.y));
      s.landmarks.city = s.landmarks.city.filter((l) => inBounds(l.x, l.y));
      s.landmarks.oilfield = s.landmarks.oilfield.filter((l) => inBounds(l.x, l.y));
      s.landmarks.supply = s.landmarks.supply.filter((l) => inBounds(l.x, l.y));
      return s;
    });
  },
}));
