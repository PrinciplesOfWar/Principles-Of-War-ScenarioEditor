import { useRef } from "react";

interface Props {
  onResize: (deltaX: number) => void;
}

// A thin vertical drag bar. `onResize` receives the raw pointer delta each move;
// the caller decides which direction/sign to apply it in (left vs. right sidebar).
export default function ResizeHandle({ onResize }: Props) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const delta = e.clientX - lastX.current;
    lastX.current = e.clientX;
    onResize(delta);
  }

  function handlePointerUp(e: React.PointerEvent) {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  return (
    <div
      className="resize-handle"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
