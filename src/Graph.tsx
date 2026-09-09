import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { GraphData } from './slides';

type Box = { x: number; y: number; width: number; height: number };

/** Var linjen möter kortets kant, sett från kortets mitt mot en punkt utanför. */
function edgePoint(box: Box, toward: { x: number; y: number }, gap: number) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const scale = Math.min(
    dx ? box.width / 2 / Math.abs(dx) : Infinity,
    dy ? box.height / 2 / Math.abs(dy) : Infinity,
  );
  const length = Math.hypot(dx, dy);
  return { x: cx + dx * scale + (dx / length) * gap, y: cy + dy * scale + (dy / length) * gap };
}

export default function Graph({ data, step }: { data: GraphData; step: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [size, setSize] = useState({ width: 0, height: 0 });

  // offsetLeft/Top struntar i transform, så en markerad nod flyttar inte sin linje.
  const measure = useCallback(() => {
    const node = root.current;
    if (!node) return;
    const next: Record<string, Box> = {};
    node.querySelectorAll<HTMLElement>('.graph-node').forEach((element) => {
      const id = element.dataset.node;
      if (!id) return;
      next[id] = {
        x: element.offsetLeft,
        y: element.offsetTop,
        width: element.offsetWidth,
        height: element.offsetHeight,
      };
    });
    setBoxes(next);
    setSize({ width: node.offsetWidth, height: node.offsetHeight });
  }, []);

  useLayoutEffect(() => {
    measure();
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.querySelectorAll('.graph-node').forEach((element) => observer.observe(element));
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [measure, data]);

  const stepOf = new Map(data.nodes.map((node) => [node.id, node.step]));
  const columns = [...new Set(data.nodes.map((node) => node.column))].sort();

  const links = data.nodes.flatMap((node) =>
    (node.links ?? []).map((target) => ({
      from: node.id,
      to: target,
      // Länken dras när båda ändarna står på plats.
      at: Math.max(node.step, stepOf.get(target) ?? node.step),
    })),
  );

  return (
    <div className="graph" ref={root} data-columns={columns.length}>
      <svg
        className="graph-links"
        viewBox={`0 0 ${size.width || 1} ${size.height || 1}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {links.map(({ from, to, at }) => {
          const a = boxes[from];
          const b = boxes[to];
          if (!a || !b) return null;
          const start = edgePoint(a, { x: b.x + b.width / 2, y: b.y + b.height / 2 }, 5);
          const end = edgePoint(b, { x: a.x + a.width / 2, y: a.y + a.height / 2 }, 5);
          return (
            <path
              key={`${from}-${to}`}
              d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
              // pathLength normaliserar längden, så samma dash fungerar på alla linjer.
              pathLength={1}
              className="graph-link"
              data-drawn={step >= at}
            />
          );
        })}
      </svg>

      {columns.map((column) => (
        <div className="graph-column" key={column}>
          {data.nodes
            .filter((node) => node.column === column)
            .map((node) => (
              <article
                key={node.id}
                data-node={node.id}
                className="graph-node"
                data-state={
                  step < node.step ? 'hidden' : step === node.step ? 'active' : 'settled'
                }
                data-large={node.large ? 'true' : undefined}
              >
                {node.label && <span className="node-label">{node.label}</span>}
                <h3>{node.heading}</h3>
                {node.text && <p>{node.text}</p>}
                {node.points && (
                  <ul>
                    {node.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
        </div>
      ))}
    </div>
  );
}
