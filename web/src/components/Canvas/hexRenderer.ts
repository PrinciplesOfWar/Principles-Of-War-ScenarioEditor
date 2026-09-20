import { getLandmarkImage, getPortImage, getTerrainImage, isImageReady } from "../../lib/assets";
import {
  hexCorners,
  hexEdgeMidpoint,
  hexHeight,
  hexToPixel,
  hexWidth,
  neighborOffset,
} from "../../lib/hexGrid";
import type { Hexagon, LayerId, LayerSettings, Scenario } from "../../types/scenario";

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#6fa84b",
  forest: "#2f6b2f",
  mud: "#7a5c3e",
  sand: "#d9c37a",
  snow: "#e8f0f5",
  mountain: "#8a8a8a",
  water: "#3b6ea5",
};

// Colors are assigned by each faction's position in scenario.factions, not by name,
// so renamed or legacy (e.g. old "red"/"blue") faction names still get distinct colors.
const FACTION_PALETTE = ["#c82828", "#285ac8", "#2f9e44", "#e8a400", "#9632c8", "#00838f"];

function factionColor(scenario: Scenario, faction: string): string {
  if (faction === "neutral") return "transparent";
  const idx = Object.keys(scenario.factions).indexOf(faction);
  return FACTION_PALETTE[idx % FACTION_PALETTE.length] ?? "#888";
}

function layerAlpha(settings: Record<LayerId, LayerSettings> | undefined, id: LayerId): number | null {
  const s = settings?.[id];
  if (!s || !s.visible) return null;
  return s.opacity;
}

export function computeMapPixelBounds(scenario: Scenario): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const hex of scenario.hexagons) {
    const { px, py } = hexToPixel(hex.x, hex.y);
    for (const [cx, cy] of hexCorners(px, py)) {
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx);
      maxY = Math.max(maxY, cy);
    }
  }
  return { minX, minY, maxX, maxY };
}

export function drawScenario(
  ctx: CanvasRenderingContext2D,
  scenario: Scenario,
  activeLayer: LayerId,
  _selected: { x: number; y: number } | null,
  layerSettings: Record<LayerId, LayerSettings>,
  referenceImage?: {
    img: HTMLImageElement;
    scaleX: number;
    scaleY: number;
  } | null
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  for (const hex of scenario.hexagons) {
    drawHex(ctx, hex, scenario, activeLayer, layerSettings);
  }

  const imageAlpha = layerAlpha(layerSettings, "image");
  if (referenceImage && imageAlpha !== null) {
    const { minX, minY, maxX, maxY } = computeMapPixelBounds(scenario);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const w = (maxX - minX) * referenceImage.scaleX;
    const h = (maxY - minY) * referenceImage.scaleY;
    ctx.save();
    ctx.globalAlpha = imageAlpha;
    ctx.drawImage(referenceImage.img, centerX - w / 2, centerY - h / 2, w, h);
    ctx.restore();
  }

  // Rivers are drawn in their own pass, on top of every hex fill/stroke (and the
  // reference image), so a shared edge never gets visually cut or hidden.
  const riverAlpha = layerAlpha(layerSettings, "rivers");
  if (riverAlpha !== null) {
    ctx.save();
    ctx.globalAlpha = riverAlpha;
    for (const hex of scenario.hexagons) {
      drawRiverEdges(ctx, hex);
    }
    ctx.restore();
  }

  // Logistics (railway) network is drawn as hub-and-spoke lines between the centers
  // of adjacent railway hexes, so a hex naturally reads as a dead end, a through-line,
  // a turn, or a hub depending on how many of its neighbors also have railway.
  const railwayAlpha = layerAlpha(layerSettings, "railway");
  if (railwayAlpha !== null) {
    ctx.save();
    ctx.globalAlpha = railwayAlpha;
    for (const hex of scenario.hexagons) {
      if (hex.railway) drawRailwayNode(ctx, scenario, hex);
    }
    ctx.restore();
  }
}

function drawRiverEdges(ctx: CanvasRenderingContext2D, hex: Hexagon) {
  const { px, py } = hexToPixel(hex.x, hex.y);
  const corners = hexCorners(px, py);
  for (let edge = 0; edge < 6; edge++) {
    if (hex.river[edge]) {
      const a = corners[edge];
      const b = corners[(edge + 1) % 6];
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
}

function findHex(scenario: Scenario, x: number, y: number): Hexagon | undefined {
  return scenario.hexagons.find((h) => h.x === x && h.y === y);
}

function drawRailwayNode(ctx: CanvasRenderingContext2D, scenario: Scenario, hex: Hexagon) {
  const { px, py } = hexToPixel(hex.x, hex.y);

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);

  let connections = 0;
  for (let edge = 0; edge < 6; edge++) {
    const n = neighborOffset(hex.x, hex.y, edge);
    const neighbor = findHex(scenario, n.x, n.y);
    if (!neighbor?.railway) continue;
    connections++;
    const { px: nx, py: ny } = hexToPixel(n.x, n.y);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(nx, ny);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // A hex with no connected railway neighbor still gets a marker (isolated node);
  // one with any connections gets a small hub dot at its center (dead end, turn, or hub).
  ctx.beginPath();
  ctx.arc(px, py, connections <= 1 ? 3 : 4, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  hex: Hexagon,
  scenario: Scenario,
  activeLayer: LayerId,
  layerSettings: Record<LayerId, LayerSettings>
) {
  const { px, py } = hexToPixel(hex.x, hex.y);
  const corners = hexCorners(px, py);

  ctx.beginPath();
  corners.forEach(([cx, cy], i) => (i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)));
  ctx.closePath();

  const terrainAlpha = layerAlpha(layerSettings, "terrain");
  if (terrainAlpha !== null) {
    ctx.save();
    ctx.globalAlpha = terrainAlpha;
    const terrainImg = getTerrainImage(hex.terrain);
    if (isImageReady(terrainImg)) {
      ctx.save();
      ctx.clip();
      const w = hexWidth();
      const h = hexHeight();
      ctx.drawImage(terrainImg, px - w / 2, py - h / 2, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = TERRAIN_COLORS[hex.terrain] ?? "#444";
      ctx.fill();
    }
    ctx.restore();
  }

  const factionAlpha = layerAlpha(layerSettings, "faction");
  if (factionAlpha !== null && hex.faction !== "neutral") {
    ctx.save();
    ctx.globalAlpha = factionAlpha;
    ctx.fillStyle = factionColor(scenario, hex.faction);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const portAlpha = layerAlpha(layerSettings, "ports");
  if (portAlpha !== null && hex.port) {
    ctx.save();
    ctx.globalAlpha = portAlpha;
    const portImg = getPortImage();
    if (isImageReady(portImg)) {
      const w = hexWidth();
      const h = hexHeight();
      ctx.drawImage(portImg, px - w / 2, py - h / 2, w, h);
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0a3d62";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#0a3d62";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("P", px, py + 3);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  const objectivePlayerAlpha = layerAlpha(layerSettings, "objective_player");
  if (objectivePlayerAlpha !== null && hex.objective.faction_0) {
    ctx.save();
    ctx.globalAlpha = objectivePlayerAlpha;
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.restore();
  }
  const objectiveEnemyAlpha = layerAlpha(layerSettings, "objective_enemy");
  if (objectiveEnemyAlpha !== null && hex.objective.faction_1) {
    ctx.save();
    ctx.globalAlpha = objectiveEnemyAlpha;
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.restore();
  }

  const landmarkAlpha = layerAlpha(layerSettings, "landmarks");
  if (landmarkAlpha !== null && hex.landmark !== "default") {
    ctx.save();
    ctx.globalAlpha = landmarkAlpha;
    const landmarkImg = getLandmarkImage(hex.landmark);
    if (isImageReady(landmarkImg)) {
      const w = hexWidth();
      const h = hexHeight();
      ctx.drawImage(landmarkImg, px - w / 2, py - h / 2, w, h);
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      const label = hex.landmark === "city" ? "C" : hex.landmark === "oilfield" ? "O" : "S";
      ctx.fillText(label, px, py + 3);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  const unitsAlpha = layerAlpha(layerSettings, "units");
  const unitsHere = scenario.units.filter((u) => u.x === hex.x && u.y === hex.y);
  if (unitsAlpha !== null && unitsHere.length > 0) {
    ctx.save();
    ctx.globalAlpha = unitsAlpha;
    const baseY = py + 18;
    unitsHere.forEach((u, i) => {
      const ux = px - (unitsHere.length - 1) * 6 + i * 12;
      ctx.beginPath();
      ctx.arc(ux, baseY, 6, 0, Math.PI * 2);
      const color = factionColor(scenario, u.faction);
      ctx.fillStyle = color === "transparent" ? "#888" : color;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    ctx.restore();
  }

  if (activeLayer === "rivers") {
    ctx.fillStyle = "rgba(28,158,255,0.6)";
    for (let edge = 0; edge < 6; edge++) {
      const [mx, my] = hexEdgeMidpoint(px, py, edge);
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
