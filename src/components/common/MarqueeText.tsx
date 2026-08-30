"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useId,
  FC,
  PointerEvent,
} from "react";

// --- Component for the linear text loop ---

interface LinearLoopProps {
  /** The text to be displayed in the marquee */
  marqueeText?: string;
  /** The speed of the animation. Can be positive or negative. */
  speed?: number;
  /** Additional CSS classes for styling the text */
  className?: string;
  /** The direction of the marquee animation */
  direction?: "left" | "right";
  /** Whether the user can interact with the marquee by dragging */
  interactive?: boolean;
}

const LinearLoop: FC<LinearLoopProps> = ({
  marqueeText = "SCHOOL STUDY • SMART SCHOOL MANAGEMENT • MODERN EDUCATION • ",
  speed = 1.2,
  className,
  direction = "left",
  interactive = true,
}) => {
  // Memoize the text to ensure it has a trailing space for seamless looping
  const text = useMemo(() => {
    const hasTrailing = /\s|\u00A0$/.test(marqueeText);
    return (
      (hasTrailing ? marqueeText.replace(/\s+$/, "") : marqueeText) + "\u00A0\u00A0"
    );
  }, [marqueeText]);

  // Refs for SVG elements
  const measureRef = useRef<SVGTextElement | null>(null);
  const tspansRef = useRef<SVGTSpanElement[]>([]);
  const pathRef = useRef<SVGPathElement | null>(null);

  // State for measurements
  const [pathLength, setPathLength] = useState(0);
  const [spacing, setSpacing] = useState(0);

  // Unique ID for the SVG path
  const uid = useId();
  const pathId = `linear-path-${uid.replace(/:/g, "")}`;

  // Define the SVG path as a straight horizontal line.
  const pathD = "M-200,90 L2400,90";

  // Refs for interactive dragging logic
  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef<"left" | "right">(direction);
  const velRef = useRef(0); // Velocity of the drag

  // Effect to measure the width of a single text instance
  useEffect(() => {
    if (measureRef.current) {
      setSpacing(measureRef.current.getComputedTextLength());
    }
  }, [text, className]);

  // Effect to measure the total length of the SVG path
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  // Animation loop effect
  useEffect(() => {
    if (!spacing) return;

    let frame: number;
    const step = () => {
      tspansRef.current.forEach((t) => {
        if (!t) return;
        let x = parseFloat(t.getAttribute("x") || "0");

        if (!dragRef.current) {
          const delta =
            dirRef.current === "right" ? Math.abs(speed) : -Math.abs(speed);
          x += delta;
        }

        const totalWidth = tspansRef.current.length * spacing;
        if (x < -spacing) {
          x = x + totalWidth;
        }
        if (x > totalWidth - spacing) {
          x = x - totalWidth;
        }

        t.setAttribute("x", x.toString());
      });
      frame = requestAnimationFrame(step);
    };

    step();
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed]);

  const repeats =
    pathLength && spacing ? Math.ceil(pathLength / spacing) + 4 : 0;
  const ready = pathLength > 0 && spacing > 0;

  const onPointerDown = (e: PointerEvent) => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!interactive || !dragRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx;

    tspansRef.current.forEach((t) => {
      if (!t) return;
      let x = parseFloat(t.getAttribute("x") || "0");
      x += dx;

      const totalWidth = tspansRef.current.length * spacing;
      if (x < -spacing) {
        x = x + totalWidth;
      }
      if (x > totalWidth - spacing) {
        x = x - totalWidth;
      }

      t.setAttribute("x", x.toString());
    });
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    if (Math.abs(velRef.current) > 1) {
      dirRef.current = velRef.current > 0 ? "right" : "left";
    }
  };

  const cursorStyle = interactive
    ? dragRef.current
      ? "grabbing"
      : "grab"
    : "auto";

  return (
    <div
      style={{ visibility: ready ? "visible" : "hidden", cursor: cursorStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      className="select-none py-2"
    >
      <svg
        className="select-none w-full overflow-visible block text-[4.5rem] sm:text-[6rem] lg:text-[7.5rem] font-black tracking-[6px] uppercase leading-none"
        viewBox="0 0 1440 140"
      >
        <text
          ref={measureRef}
          xmlSpace="preserve"
          style={{ visibility: "hidden", opacity: 0, pointerEvents: "none" }}
        >
          {text}
        </text>
        <defs>
          <path
            ref={pathRef}
            id={pathId}
            d={pathD}
            fill="none"
            stroke="transparent"
          />
        </defs>
        {ready && (
          <text xmlSpace="preserve" className={className ?? "fill-current"}>
            <textPath href={`#${pathId}`} xmlSpace="preserve">
              {Array.from({ length: repeats }).map((_, i) => (
                <tspan
                  key={i}
                  x={i * spacing}
                  ref={(el) => {
                    if (el) tspansRef.current[i] = el;
                  }}
                >
                  {text}
                </tspan>
              ))}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
};

export function MarqueeText({
  text = "SCHOOL STUDY • SMART SCHOOL MANAGEMENT • MODERN EDUCATION • ",
  speed = 1.2,
  className = "fill-slate-900/10 dark:fill-white/10 hover:fill-blue-600/30 dark:hover:fill-blue-400/30 transition-colors duration-300",
}: {
  text?: string;
  speed?: number;
  className?: string;
}) {
  return (
    <div className="w-full overflow-hidden border-y border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-r from-blue-50/30 via-slate-50/50 to-indigo-50/30 dark:from-[#050913] dark:via-[#070b16] dark:to-[#050913] py-2">
      <LinearLoop
        marqueeText={text}
        speed={speed}
        direction="left"
        interactive={true}
        className={className}
      />
    </div>
  );
}

export default MarqueeText;
