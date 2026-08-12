"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  BookOpenText,
  Cards,
  Check,
  Lock,
  Question,
  TreasureChest,
  ArrowClockwise,
} from "@phosphor-icons/react";
import type { RoadmapNode } from "@/lib/roadmap";
import { cn } from "@/lib/utils";
import { playTap } from "@/lib/sounds";

const typeIcon = {
  read: BookOpenText,
  flashcards: Cards,
  quiz: Question,
  review: ArrowClockwise,
  chest: TreasureChest,
} as const;

/** offset X in px rispetto al centro (stile path Duolingo) */
function nodeOffsetX(i: number): number {
  const pattern = [0, -56, 0, 56];
  return pattern[i % 4];
}

type Props = {
  nodes: RoadmapNode[];
  unitTitle: string;
  unitSubtitle: string;
  xp: number;
  onSelect: (node: RoadmapNode) => void;
};

export function StudyPath({
  nodes,
  unitTitle,
  unitSubtitle,
  xp,
  onSelect,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pathD, setPathD] = useState("");
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !nodes.length) return;

    const update = () => {
      const listRect = list.getBoundingClientRect();
      const pts: { x: number; y: number }[] = [];
      nodeRefs.current.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        // centro del cerchio (il bottone contiene chip+cerchio+label; cerchio è ~68px, chip sopra)
        // puntiamo al cerchio: metà larghezza del bottone, e y del cerchio ≈ chip(~20) + 34
        const circle = el.querySelector("[data-circle]") as HTMLElement | null;
        if (circle) {
          const cr = circle.getBoundingClientRect();
          pts.push({
            x: cr.left + cr.width / 2 - listRect.left,
            y: cr.top + cr.height / 2 - listRect.top,
          });
        } else {
          pts.push({
            x: r.left + r.width / 2 - listRect.left,
            y: r.top + r.height / 2 - listRect.top,
          });
        }
      });
      if (pts.length < 2) {
        setPathD("");
        return;
      }
      // curva smooth tra i centri
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const midY = (prev.y + cur.y) / 2;
        d += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
      }
      setPathD(d);
      setSvgSize({ w: listRect.width, h: listRect.height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(list);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [nodes]);

  return (
    <div className="relative mx-auto max-w-md">
      <div className="sticky top-14 z-20 mb-6 overflow-hidden rounded-2xl bg-emerald-500 px-4 py-3 shadow-lg shadow-emerald-900/15">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              {unitSubtitle}
            </p>
            <p className="truncate text-lg font-bold text-white">{unitTitle}</p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-sm font-bold text-white">
            {xp} XP
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-700/40">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{
              width: `${
                nodes.length
                  ? (nodes.filter((n) => n.status === "done").length /
                      nodes.length) *
                    100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      <div className="relative pb-16 pt-2">
        <ul ref={listRef} className="relative flex flex-col gap-8">
          {/* SVG path dietro i nodi, segue i centri dei cerchi */}
          {pathD && (
            <svg
              className="pointer-events-none absolute left-0 top-0 z-0"
              width={svgSize.w}
              height={svgSize.h}
              aria-hidden
            >
              <path
                d={pathD}
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1000"
                strokeDashoffset={
                  1000 -
                  1000 *
                    (nodes.filter((n) => n.status === "done").length /
                      Math.max(1, nodes.length - 1))
                }
                className="transition-all duration-500"
                opacity={0.85}
              />
            </svg>
          )}

          {nodes.map((node, i) => {
            const Icon = typeIcon[node.type] || BookOpenText;
            const done = node.status === "done";
            const current = node.status === "current";
            const locked = node.status === "locked";
            const ox = nodeOffsetX(i);

            return (
              <li
                key={node.id}
                className="relative z-10 flex justify-center"
                style={{ minHeight: 120 }}
              >
                <button
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (!locked) {
                      playTap();
                      onSelect(node);
                    }
                  }}
                  className={cn(
                    "relative flex flex-col items-center transition",
                    locked && "cursor-not-allowed opacity-75",
                    !locked && "active:scale-95"
                  )}
                  style={{ transform: `translateX(${ox}px)` }}
                >
                  <span
                    className={cn(
                      "mb-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      current
                        ? "bg-amber-100 text-amber-800"
                        : done
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-100 text-zinc-500"
                    )}
                  >
                    Giorno {node.day}
                  </span>

                  <span
                    data-circle
                    className={cn(
                      "flex h-[68px] w-[68px] items-center justify-center rounded-full border-[5px] shadow-md transition",
                      done &&
                        "border-emerald-600 bg-emerald-500 text-white shadow-emerald-900/20",
                      current &&
                        "border-emerald-400 bg-white text-emerald-600 shadow-emerald-500/30 ring-4 ring-emerald-400/30",
                      locked &&
                        "border-zinc-200 bg-zinc-100 text-zinc-400 shadow-none dark:border-zinc-700 dark:bg-zinc-800"
                    )}
                  >
                    {done ? (
                      <Check weight="bold" className="h-8 w-8" />
                    ) : locked ? (
                      <Lock weight="fill" className="h-7 w-7" />
                    ) : node.type === "chest" ? (
                      <TreasureChest
                        weight="fill"
                        className="h-8 w-8 text-amber-500"
                      />
                    ) : (
                      <Icon weight="fill" className="h-8 w-8" />
                    )}
                  </span>

                  <span
                    className={cn(
                      "mt-2 max-w-[9.5rem] text-center text-xs font-semibold leading-snug",
                      current
                        ? "text-emerald-800 dark:text-emerald-300"
                        : done
                          ? "text-zinc-600 dark:text-zinc-300"
                          : "text-zinc-400"
                    )}
                  >
                    {node.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
