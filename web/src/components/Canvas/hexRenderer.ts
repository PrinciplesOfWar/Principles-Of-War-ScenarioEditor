import { getLandmarkImage, getPortImage, getTerrainImage, getUnitIconImage, isImageReady } from "../../lib/assets";
import {
  hexCorners,
  hexEdgeMidpoint,
  hexHeight,
  hexToPixel,
  hexWidth,
  neighborOffset,
} from "../../lib/hexGrid";
import type { LayerId, LayerSettings } from "../../types/app";
import type { HexagonV2, LabelEntry, ScenarioV2, UnitV2 } from "../../types/scenarioV2";

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#6fa84b",
  forest: "#2f6b2f",
  mud: "#7a5c3e",
  sand: "#d9c37a",
  snow: "#e8f0f5",
  mountain: "#8a8a8a",
  water: "#3b6ea5",
};

// Colors are assigned by each faction's position in scenario.factions (a real array now,
// so this order is stable across renames without any extra bookkeeping).
const FACTION_PALETTE = ["#c82828", "#285ac8", "#2f9e44", "#e8a400", "#9632c8", "#00838f"];

function factionColor(scenario: ScenarioV2, factionId: string): string {
  if (factionId === "neutral") return "transparent";
  const idx = scenario.factions.findIndex((f) => f.id === factionId);
  return FACTION_PALETTE[idx % FACTION_PALETTE.length] ?? "#888";
}

function layerAlpha(settings: Record<LayerId, LayerSettings> | undefined, id: LayerId): number | null {
  const s = settings?.[id];
  if (!s || !s.visible) return null;
  return s.opacity;
}

export function computeMapPixelBounds(scenario: ScenarioV2): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const hex of scenario.map.hexagons) {
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
  scenario: ScenarioV2,
  activeLayer: LayerId,
  _selected: { x: number; y: number } | null,
  layerSettings: Record<LayerId, LayerSettings>,
  cycledUnitIndex: Record<string, number>,
  referenceImage?: {
    img: HTMLImageElement;
    scaleX: number;
    scaleY: number;
  } | null
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  for (const hex of scenario.map.hexagons) {
    drawHex(ctx, hex, scenario, activeLayer, layerSettings, cycledUnitIndex);
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
    for (const hex of scenario.map.hexagons) {
      drawRiverEdges(ctx, hex);
    }
    ctx.restore();
  }

  // Labels are drawn in their own pass too, on top of everything else, so long names
  // are always fully legible regardless of what's underneath.
  const labelsAlpha = layerAlpha(layerSettings, "labels");
  if (labelsAlpha !== null) {
    ctx.save();
    ctx.globalAlpha = labelsAlpha;
    drawLabels(ctx, scenario.map.labels);
    ctx.restore();
  }

  // Logistics (railway) network is drawn as hub-and-spoke lines between the centers
  // of adjacent logistics hexes, so a hex naturally reads as a dead end, a through-line,
  // a turn, or a hub depending on how many of its neighbors also have logistics.
  const railwayAlpha = layerAlpha(layerSettings, "railway");
  if (railwayAlpha !== null) {
    ctx.save();
    ctx.globalAlpha = railwayAlpha;
    for (const hex of scenario.map.hexagons) {
      if (hex.logistics) drawRailwayNode(ctx, scenario, hex);
    }
    ctx.restore();
  }
}

function drawRiverEdges(ctx: CanvasRenderingContext2D, hex: HexagonV2) {
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

const LABEL_SCALE = 2.4; // 300% of the original size, reduced 20%

function drawLabels(ctx: CanvasRenderingContext2D, labels: LabelEntry[]) {
  ctx.font = `${10 * LABEL_SCALE}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const label of labels) {
    if (!label.name) continue;
    const { px, py } = hexToPixel(label.x, label.y);
    const [tx, ty] = label.edge === null ? [px, py] : hexEdgeMidpoint(px, py, label.edge);
    const textWidth = ctx.measureText(label.name).width;
    const w = textWidth + 6 * LABEL_SCALE;
    const h = 12 * LABEL_SCALE;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(tx - w / 2, ty - h / 2, w, h);
    ctx.fillStyle = "#fff";
    ctx.fillText(label.name, tx, ty + 1 * LABEL_SCALE);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function findHex(scenario: ScenarioV2, x: number, y: number): HexagonV2 | undefined {
  return scenario.map.hexagons.find((h) => h.x === x && h.y === y);
}

function drawRailwayNode(ctx: CanvasRenderingContext2D, scenario: ScenarioV2, hex: HexagonV2) {
  const { px, py } = hexToPixel(hex.x, hex.y);

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);

  let connections = 0;
  for (let edge = 0; edge < 6; edge++) {
    const n = neighborOffset(hex.x, hex.y, edge);
    const neighbor = findHex(scenario, n.x, n.y);
    if (!neighbor?.logistics) continue;
    connections++;
    const { px: nx, py: ny } = hexToPixel(n.x, n.y);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(nx, ny);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // A hex with no connected logistics neighbor still gets a marker (isolated node);
  // one with any connections gets a small hub dot at its center (dead end, turn, or hub).
  ctx.beginPath();
  ctx.arc(px, py, connections <= 1 ? 3 : 4, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
}

function drawUnitStat(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x, y);
}

function drawUnitStats(ctx: CanvasRenderingContext2D, u: UnitV2, ux: number, uy: number, size: number) {
  const marginX = size * 0.15;
  const marginY = size * 0.35;
  const left = ux - size / 2 + marginX;
  const right = ux + size / 2 - marginX;
  const top = uy - size / 2 + marginY;
  const bottom = uy + size / 2 - marginY;

  ctx.save();
  ctx.font = `bold ${Math.round(size * 0.22)}px sans-serif`;
  ctx.lineJoin = "round";
  ctx.textBaseline = "middle";

  ctx.textAlign = "left";
  drawUnitStat(ctx, String(u.attack), left, bottom);
  drawUnitStat(ctx, String(u.movement), left, top);

  ctx.textAlign = "right";
  drawUnitStat(ctx, String(u.defense), right, bottom);

  ctx.restore();
}

function drawUnitIndexBadge(ctx: CanvasRenderingContext2D, px: number, py: number, index: number, total: number) {
  const [cx, cy] = hexCorners(px, py)[1]; // top-right corner
  ctx.save();
  ctx.font = "bold 12px sans-serif";
  ctx.lineJoin = "round";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  drawUnitStat(ctx, `${index}/${total}`, cx - 4, cy + 6);
  ctx.restore();
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  hex: HexagonV2,
  scenario: ScenarioV2,
  activeLayer: LayerId,
  layerSettings: Record<LayerId, LayerSettings>,
  cycledUnitIndex: Record<string, number>
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

  const objectivePlayerId = scenario.factions[0]?.id;
  const objectivePlayerAlpha = layerAlpha(layerSettings, "objective_player");
  if (objectivePlayerAlpha !== null && objectivePlayerId && hex.objective.includes(objectivePlayerId)) {
    ctx.save();
    ctx.globalAlpha = objectivePlayerAlpha;
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.restore();
  }
  const objectiveEnemyId = scenario.factions[1]?.id;
  const objectiveEnemyAlpha = layerAlpha(layerSettings, "objective_enemy");
  if (objectiveEnemyAlpha !== null && objectiveEnemyId && hex.objective.includes(objectiveEnemyId)) {
    ctx.save();
    ctx.globalAlpha = objectiveEnemyAlpha;
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.restore();
  }

  const landmarkAlpha = layerAlpha(layerSettings, "landmarks");
  if (landmarkAlpha !== null && hex.landmark) {
    ctx.save();
    ctx.globalAlpha = landmarkAlpha;
    const landmarkImg = getLandmarkImage(hex.landmark.type);
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
      const label = hex.landmark.type === "city" ? "C" : hex.landmark.type === "oilfield" ? "O" : "S";
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
    const size = 74; // 20% bigger than the original 62
    // Only one unit is shown per hex at a time; right-click cycles which one via
    // cycledUnitIndex, keyed by hex coordinate.
    const index = (cycledUnitIndex[`${hex.x},${hex.y}`] ?? 0) % unitsHere.length;
    const u = unitsHere[index];
    const unitType = scenario.unit_types.find((t) => t.id === u.type);
    const base64 = unitType ? scenario.unit_icons[unitType.icon] : undefined;
    const iconImg = unitType && base64 ? getUnitIconImage(unitType.icon, base64) : null;
    if (isImageReady(iconImg)) {
      ctx.drawImage(iconImg, px - size / 2, py - size / 2, size, size);
    } else {
      // Fallback while the icon loads (or when the unit has none assigned yet) —
      // a faction-colored dot, same as before icons were drawn.
      ctx.beginPath();
      ctx.arc(px, py, size / 3, 0, Math.PI * 2);
      const color = factionColor(scenario, u.faction);
      ctx.fillStyle = color === "transparent" ? "#888" : color;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    drawUnitStats(ctx, u, px, py, size);
    if (unitsHere.length > 1) {
      drawUnitIndexBadge(ctx, px, py, index + 1, unitsHere.length);
    }
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

  if (activeLayer === "labels") {
    ctx.fillStyle = "rgba(255,165,0,0.6)";
    for (let edge = 0; edge < 6; edge++) {
      const [mx, my] = hexEdgeMidpoint(px, py, edge);
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
