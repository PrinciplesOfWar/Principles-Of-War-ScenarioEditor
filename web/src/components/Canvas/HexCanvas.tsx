import { useEffect, useRef, useState } from "react";
import { useStore } from "../../state/store";
import { onAssetLoaded } from "../../lib/assets";
import { closestEdge, hexToPixel, pixelToHex } from "../../lib/hexGrid";
import { drawScenario } from "./hexRenderer";
import type { Hexagon, Scenario } from "../../types/scenario";

function landmarkTooltipContent(scenario: Scenario, hex: Hexagon) {
  if (hex.landmark === "city") {
    const c = scenario.landmarks.city.find((l) => l.x === hex.x && l.y === hex.y);
    if (!c) return null;
    return (
      <>
        <strong>{c.name}</strong>
        <div>Faction: {c.faction}</div>
        <div>Population: {c.population}</div>
      </>
    );
  }
  if (hex.landmark === "oilfield") {
    const o = scenario.landmarks.oilfield.find((l) => l.x === hex.x && l.y === hex.y);
    if (!o) return null;
    return (
      <>
        <strong>Oilfield</strong>
        <div>Production: {o.production}</div>
      </>
    );
  }
  if (hex.landmark === "supply") {
    const s = scenario.landmarks.supply.find((l) => l.x === hex.x && l.y === hex.y);
    if (!s) return null;
    return (
      <>
        <strong>Supply</strong>
        <div>Faction: {s.faction}</div>
      </>
    );
  }
  return null;
}

export default function HexCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scenario = useStore((s) => s.scenario);
  const activeLayer = useStore((s) => s.activeLayer);
  const selectedHex = useStore((s) => s.selectedHex);
  const selectHex = useStore((s) => s.selectHex);
  const paintTerrain = useStore((s) => s.paintTerrain);
  const paintFaction = useStore((s) => s.paintFaction);
  const activeFaction = useStore((s) => s.activeFaction);
  const toggleRailway = useStore((s) => s.toggleRailway);
  const togglePort = useStore((s) => s.togglePort);
  const toggleRiverEdge = useStore((s) => s.toggleRiverEdge);
  const toggleObjective = useStore((s) => s.toggleObjective);
  const setLandmark = useStore((s) => s.setLandmark);
  const activeLandmark = useStore((s) => s.activeLandmark);
  const referenceImage = useStore((s) => s.referenceImage);
  const layerSettings = useStore((s) => s.layerSettings);

  const [view, setView] = useState({ zoom: 1, offsetX: 40, offsetY: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [, forceRedraw] = useState(0);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [hoverHex, setHoverHex] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(
    null
  );

  useEffect(() => {
    if (!referenceImage) {
      setLoadedImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLoadedImage(img);
    img.src = referenceImage.dataUrl;
  }, [referenceImage?.dataUrl]);

  useEffect(() => onAssetLoaded(() => forceRedraw((n) => n + 1)), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => forceRedraw((n) => n + 1));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const container = containerRef.current!;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.zoom, view.zoom);
    drawScenario(
      ctx,
      scenario,
      activeLayer,
      selectedHex,
      layerSettings,
      loadedImage && referenceImage
        ? { img: loadedImage, scaleX: referenceImage.scaleX, scaleY: referenceImage.scaleY }
        : null
    );
    ctx.restore();
  });

  function zoomBy(factor: number, anchorClientX?: number, anchorClientY?: number) {
    setView((v) => {
      const nextZoom = Math.min(4, Math.max(0.2, v.zoom * factor));
      const rect = canvasRef.current?.getBoundingClientRect();
      const ax = anchorClientX ?? (rect ? rect.left + rect.width / 2 : 0);
      const ay = anchorClientY ?? (rect ? rect.top + rect.height / 2 : 0);
      const localX = rect ? ax - rect.left : 0;
      const localY = rect ? ay - rect.top : 0;
      const worldX = (localX - v.offsetX) / v.zoom;
      const worldY = (localY - v.offsetY) / v.zoom;
      return {
        zoom: nextZoom,
        offsetX: localX - worldX * nextZoom,
        offsetY: localY - worldY * nextZoom,
      };
    });
  }

  function resetView() {
    setView({ zoom: 1, offsetX: 40, offsetY: 40 });
  }

  function toWorld(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (clientX - rect.left - view.offsetX) / view.zoom;
    const y = (clientY - rect.top - view.offsetY) / view.zoom;
    return { x, y };
  }

  function handleClick(e: React.MouseEvent) {
    if (isPanning) return;
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
    const { x, y } = pixelToHex(wx, wy);
    const hex = scenario.hexagons.find((h) => h.x === x && h.y === y);
    if (!hex) return;
    selectHex(x, y);

    switch (activeLayer) {
      case "image":
        // selection only; use the Image panel to upload/adjust the reference overlay
        break;
      case "terrain":
        paintTerrain(x, y);
        break;
      case "faction":
        paintFaction(x, y, activeFaction);
        break;
      case "railway":
        toggleRailway(x, y);
        break;
      case "ports":
        togglePort(x, y);
        break;
      case "rivers": {
        const { px, py } = hexToPixel(x, y);
        const edge = closestEdge(px, py, wx, wy);
        toggleRiverEdge(x, y, edge);
        break;
      }
      case "objective_player":
        toggleObjective(x, y, "faction_0");
        break;
      case "objective_enemy":
        toggleObjective(x, y, "faction_1");
        break;
      case "landmarks":
        // A hex that already has a landmark is just selected (its data shows in the
        // sidebar) rather than mutated, so clicking it again never deletes it. Pick
        // "none" as the active type and click a landmark to remove it instead.
        if (hex.landmark !== activeLandmark) {
          setLandmark(x, y, activeLandmark);
        }
        break;
      case "units":
        // selection only; UnitPanel handles editing for selectedHex
        break;
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomBy(factor, e.clientX, e.clientY);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      setIsPanning(true);
      setHoverHex(null);
      panStart.current = { x: e.clientX, y: e.clientY, offsetX: view.offsetX, offsetY: view.offsetY };
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setView((v) => ({ ...v, offsetX: panStart.current.offsetX + dx, offsetY: panStart.current.offsetY + dy }));
      return;
    }

    if (!layerSettings.landmarks.visible) {
      setHoverHex(null);
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
    const { x, y } = pixelToHex(wx, wy);
    const hex = scenario.hexagons.find((h) => h.x === x && h.y === y);
    if (hex && hex.landmark !== "default") {
      setHoverHex({ x, y, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
    } else {
      setHoverHex(null);
    }
  }

  function handlePointerUp() {
    setIsPanning(false);
  }

  const hoverTooltip = (() => {
    if (!hoverHex) return null;
    const hex = scenario.hexagons.find((h) => h.x === hoverHex.x && h.y === hoverHex.y);
    if (!hex) return null;
    return landmarkTooltipContent(scenario, hex);
  })();

  return (
    <div ref={containerRef} className="hex-canvas-container">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setHoverHex(null)}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="zoom-controls">
        <button onClick={() => zoomBy(1 / 1.2)}>-</button>
        <span>{Math.round(view.zoom * 100)}%</span>
        <button onClick={() => zoomBy(1.2)}>+</button>
        <button onClick={resetView}>Reset</button>
      </div>
      {hoverHex && hoverTooltip && (
        <div className="landmark-tooltip" style={{ left: hoverHex.screenX, top: hoverHex.screenY }}>
          {hoverTooltip}
        </div>
      )}
    </div>
  );
}
