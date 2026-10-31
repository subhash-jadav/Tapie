import type { ReactNode } from "react";
import { H, W } from "@/lib/constants";

export function FlipCard({ flipped, front, back, className = "" }: { flipped: boolean; front: ReactNode; back: ReactNode; className?: string }) {
  const face = "absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: `${W} / ${H}`, perspective: 1800 }}>
      <div
        className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(.3,1.3,.5,1)] [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        <div className={face} style={{ pointerEvents: flipped ? "none" : "auto" }}>
          {front}
        </div>
        <div className={face} style={{ transform: "rotateY(180deg)", pointerEvents: flipped ? "auto" : "none" }}>
          {back}
        </div>
      </div>
    </div>
  );
}
