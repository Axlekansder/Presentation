import { useEffect, useRef } from 'react';
import type { AnatomyData } from './slides';

// Etiketterna tonar in en i taget, och ledarlinjen ritas i takt med sin etikett.
// Avslöjandet startar på ett klick, så fördröjningen behöver bara vara en andhämtning.
const REVEAL_DELAY = 80;
const REVEAL_STAGGER = 160;
const REVEAL_IN = 300;

/** Under den här bredden ligger noterna under koden, och linjerna vore obegripliga. */
const STACK_WIDTH = 900;

/** Hur långt ut ändarna av halvmånen buktar. */
const ARC_DEPTH = 32;

/**
 * Etiketterna fälls ut i en båge i stället för att ligga på en rak linje.
 * Mitten buktar ut, ändarna hålls kvar — bågen välver sig bort från koden.
 * Offseten läggs i transform, inte i marginalen, så noternas bredd är oförändrad.
 */
function arcOffset(index: number, count: number) {
  if (count < 3) return 0;
  return ARC_DEPTH * Math.sin((Math.PI * index) / (count - 1));
}

export default function Anatomy({
  data,
  revealed,
}: {
  data: AnatomyData;
  /** Falskt tills presentatören klickat fram noterna. */
  revealed: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const leaders = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = root.current;
    const canvas = leaders.current;
    const context = canvas?.getContext('2d');
    if (!node || !canvas || !context) return;

    const notes = node.querySelectorAll<HTMLElement>('.anatomy-note');

    const wide = node.getBoundingClientRect().width > STACK_WIDTH;
    const arc = (i: number) => (wide ? arcOffset(i, notes.length) : 0);

    // Före klicket ligger noterna gömda och duken tom.
    if (!revealed) {
      notes.forEach((note, i) => {
        note.style.opacity = '0';
        note.style.transform = `translateX(${arc(i) + 12}px)`;
      });
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const started = performance.now();
    let frame = 0;
    let disposed = false;

    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(draw);
    };

    function draw(now: number) {
      frame = 0;
      if (disposed) return;

      const bounds = node!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(bounds.width * dpr);
      const height = Math.round(bounds.height * dpr);
      if (canvas!.width !== width || canvas!.height !== height) {
        canvas!.width = width;
        canvas!.height = height;
      }
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      context!.clearRect(0, 0, bounds.width, bounds.height);

      const styles = getComputedStyle(node!);
      const accent = styles.getPropertyValue('--accent').trim() || '#79e5cf';
      const ground = styles.getPropertyValue('--bg').trim() || '#071316';
      const stacked = bounds.width <= STACK_WIDTH;
      let animating = false;

      notes.forEach((note, i) => {
          const progress = reduced.matches
            ? 1
            : Math.max(
                0,
                Math.min(
                  1,
                  (now - started - REVEAL_DELAY - i * REVEAL_STAGGER) / REVEAL_IN,
                ),
              );
          if (progress < 1) animating = true;
          note.style.opacity = String(progress);
          note.style.transform = `translateX(${arc(i) + (1 - progress) * 12}px)`;

          const anchor = node!.querySelector<HTMLElement>(
            `.anchor-point[data-anchor="${i}"]`,
          );
          if (!anchor || stacked || progress <= 0) return;

          // Allt mäts mot samma rot, så en animerad förälder påverkar inte linjen.
          const a = anchor.getBoundingClientRect();
          const label = note.getBoundingClientRect();
          const ax = a.x + a.width - bounds.x + 4;
          const ay = a.y + a.height / 2 - bounds.y;
          const lx = label.x - bounds.x;
          const ly = label.y - bounds.y + 13;
          if (![ax, ay, lx, ly].every(Number.isFinite)) return;

          context!.strokeStyle = accent;
          context!.lineWidth = 1;
          context!.globalAlpha = 0.5 * progress;
          context!.beginPath();
          context!.moveTo(ax, ay);
          context!.lineTo(lx - 26, ly);
          context!.lineTo(lx - 9, ly);
          context!.stroke();

          // Punkten sitter på raden den pekar ut.
          context!.beginPath();
          context!.arc(ax, ay, 2.5, 0, Math.PI * 2);
          context!.globalAlpha = 0.9 * progress;
          context!.fillStyle = ground;
          context!.fill();
          context!.stroke();
          context!.globalAlpha = 1;
        });

      if (animating) schedule();
    }

    const wake = () => schedule();
    const observer = new ResizeObserver(wake);
    observer.observe(node);
    window.addEventListener('resize', wake);
    // Linjerna sitter på textens kanter, så de måste ritas om när typsnittet bytts.
    document.fonts?.ready.then(wake).catch(() => {});
    schedule();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', wake);
    };
  }, [data, revealed]);

  const lines = data.code.split('\n');
  const anchored = new Map(data.notes.map((note, i) => [note.line, i]));

  return (
    <div className="anatomy" ref={root} data-revealed={revealed}>
      <canvas className="leaders" ref={leaders} aria-hidden="true" />
      <pre className="anatomy-code">
        {lines.map((line, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <span className="code-line" key={i}>
            {line || ' '}
            {anchored.has(i) && (
              <span className="anchor-point" data-anchor={anchored.get(i)} />
            )}
            {'\n'}
          </span>
        ))}
      </pre>
      <div className="anatomy-notes">
        {data.notes.map((note, i) => (
          <article className="anatomy-note" key={note.tag}>
            <span className="note-tag">
              {String(i + 1).padStart(2, '0')} / {note.tag}
            </span>
            <h3>{note.heading}</h3>
            {note.text && <p>{note.text}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
