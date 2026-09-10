import { useEffect, useRef } from 'react';
import type { AnatomyData } from './slides';

/** Hur snabbt en etikett tonar mellan sina lägen. Lägre = tröghet. */
const EASE_MS = 140;

/** Opacitet för en etikett som redan presenterats och lagt sig bakom. */
const SETTLED = 0.34;

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
  step,
  builds,
}: {
  data: AnatomyData;
  /** Hur många klick som tagits på bilden. 0 = inget avslöjat än. */
  step: number;
  /**
   * Är `builds` minst lika stort som antalet etiketter tas de fram en i taget,
   * och den föregående lägger sig bakom. Annars kommer alla på första klicket.
   */
  builds: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const leaders = useRef<HTMLCanvasElement>(null);
  // Bevaras mellan klicken, så en etikett tonar från där den var.
  const alpha = useRef<number[]>([]);
  const slide = useRef<number[]>([]);

  useEffect(() => {
    const node = root.current;
    const canvas = leaders.current;
    const context = canvas?.getContext('2d');
    if (!node || !canvas || !context) return;

    const notes = node.querySelectorAll<HTMLElement>('.anatomy-note');
    const count = notes.length;
    const stepped = builds >= count;

    // Vilket läge varje etikett är på väg mot.
    const targets = Array.from({ length: count }, (_, i) => {
      if (!stepped) return step > 0 ? 1 : 0;
      if (step < i + 1) return 0;
      return step === i + 1 ? 1 : SETTLED;
    });

    if (alpha.current.length !== count) {
      alpha.current = new Array(count).fill(0);
      slide.current = new Array(count).fill(1);
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = node.getBoundingClientRect().width > STACK_WIDTH;
    const arc = (i: number) => (wide ? arcOffset(i, count) : 0);

    let frame = 0;
    let previous = 0;
    let disposed = false;

    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(draw);
    };

    function draw(now: number) {
      frame = 0;
      if (disposed) return;
      const delta = previous ? Math.min(now - previous, 64) : 16;
      previous = now;
      // Bildfrekvensoberoende utjämning — samma tempo på 60 och 120 Hz.
      const factor = reduced.matches ? 1 : 1 - Math.exp(-delta / EASE_MS);

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
      let moving = false;

      notes.forEach((note, i) => {
        const target = targets[i];
        const wants = target > 0 ? 0 : 1;
        alpha.current[i] += (target - alpha.current[i]) * factor;
        slide.current[i] += (wants - slide.current[i]) * factor;
        if (Math.abs(target - alpha.current[i]) > 0.004) moving = true;
        else alpha.current[i] = target;

        const shown = alpha.current[i];
        note.style.opacity = String(shown);
        note.style.transform = `translateX(${arc(i) + slide.current[i] * 12}px)`;

        const anchor = node!.querySelector<HTMLElement>(
          `.anchor-point[data-anchor="${i}"]`,
        );
        if (!anchor || stacked || shown <= 0.01) return;

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
        context!.globalAlpha = 0.55 * shown;
        context!.beginPath();
        context!.moveTo(ax, ay);
        context!.lineTo(lx - 26, ly);
        context!.lineTo(lx - 9, ly);
        context!.stroke();

        // Punkten sitter på raden den pekar ut.
        context!.beginPath();
        context!.arc(ax, ay, 2.5, 0, Math.PI * 2);
        context!.globalAlpha = 0.95 * shown;
        context!.fillStyle = ground;
        context!.fill();
        context!.stroke();
        context!.globalAlpha = 1;
      });

      if (moving) schedule();
    }

    const wake = () => {
      previous = 0;
      schedule();
    };
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
  }, [data, step, builds]);

  const lines = data.code.split('\n');
  const anchored = new Map(data.notes.map((note, i) => [note.line, i]));

  return (
    <div className="anatomy" ref={root} data-revealed={step > 0}>
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
