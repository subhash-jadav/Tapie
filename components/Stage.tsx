"use client";
import { createContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { H, W } from "@/lib/constants";

// Everything is designed at a fixed 640×400 and scaled to fit, so layouts look identical everywhere.
export const StageScale = createContext(1);

export function Stage({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative w-full ${className}`} style={{ aspectRatio: `${W} / ${H}`, ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <StageScale.Provider value={scale || 1}>{children}</StageScale.Provider>
      </div>
    </div>
  );
}
