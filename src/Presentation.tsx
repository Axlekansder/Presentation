import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Anatomy from './Anatomy';
import Graph from './Graph';
import { backdrop, slides, type Slide } from './slides';

/**
 * Hur länge den utgående texten ligger kvar innan den plockas bort.
 * Måste vara minst lika lång som --fade-out i presentation.css.
 */
const EXIT_MS = 700;

/** Samma sak för introbildens inzoomning. Matchar --intro-zoom-ms i presentation.css. */
const INTRO_EXIT_MS = 3000;

/**
 * Uppspelningshastighet för bakgrundsvideon. 1 = originaltempo, 0.5 = halva farten.
 * Under ~0.25 struntar webbläsare i värdet, så håll dig över det.
 */
const BACKDROP_SPEED = 0.5;

/**
 * Layoutklasserna på <main> byts direkt vid navigering, så den utgående kopian
 * antar nästa bilds mått medan den tonar ut. Därför korsas bara bilder som delar
 * layout — och grafer och anatomier korsas aldrig: de ritas inte i kopian, som
 * då skulle kollapsa till en tom ram medan den bleknar.
 */
const layoutKey = (slide: Slide) =>
  [slide.variant ?? '', slide.cover, slide.intro, !!slide.cards, !!slide.shots].join('|');

const crossfades = (from: Slide, to: Slide) =>
  !from.graph && !from.anatomy && layoutKey(from) === layoutKey(to);

const icon = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ArrowLeft = () => <svg {...icon} aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
const ArrowRight = () => <svg {...icon} aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
const Restart = () => <svg {...icon} aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>;
const Expand = () => <svg {...icon} aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>;
const Collapse = () => <svg {...icon} aria-hidden="true"><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" /></svg>;

export default function Presentation() {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [goingBack, setGoingBack] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Bilden som tonar ut just nu, eller null när ingen övergång pågår.
  const [leaving, setLeaving] = useState<number | null>(null);
  // Sant medan vi är på väg ut ur introbilden, så innehållet kan komma ur djupet.
  const [fromIntro, setFromIntro] = useState(false);
  // Hur många byggsteg som klickats fram på den aktuella bilden.
  const [step, setStep] = useState(0);
  // Kommer ihåg var R trycktes, så nästa R hoppar tillbaka dit.
  const restartReturn = useRef<number | null>(null);
  const touch = useRef<{ x: number; y: number; id: number } | null>(null);
  const slide = slides[index];
  const last = slides.length - 1;

  // playbackRate går inte att sätta som attribut — den måste sättas på elementet.
  const setBackdropSpeed = useCallback((video: HTMLVideoElement | null) => {
    if (video) video.playbackRate = BACKDROP_SPEED;
  }, []);

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(last, n));
      window.history.replaceState(window.history.state, '', `#${next}`);
      if (next === index) return;
      const current = slides[index];
      // Låt det gamla ligga kvar och tona ut medan det nya tonar in. Introbilden
      // gör det alltid — den zoomar förbi kameran i stället för att bara tona bort.
      setLeaving(current.intro || crossfades(current, slides[next]) ? index : null);
      setFromIntro(!!current.intro && !slides[next].intro);
      setGoingBack(next < index);
      setHasNavigated(true);
      setStep(0);
      setIndex(next);
    },
    [index, last],
  );

  const builds = slide.builds ?? 0;

  // Bilden håller kvar klicket tills dess byggsteg är framme. Navigeringen ligger
  // utanför setState — en uppdaterare får inte ha sidoeffekter.
  const forward = useCallback(() => {
    if (step < builds) setStep(step + 1);
    else go(index + 1);
  }, [step, builds, go, index]);

  const backward = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else go(index - 1);
  }, [step, go, index]);

  useEffect(() => {
    if (leaving === null) return;
    // fromIntro nollställs inte här. Byts klassen medan texten tonar in byter
    // animation-name mitt i förloppet och animationen startar om från osynligt.
    // go() sätter den rätt vid nästa byte, då texten ändå monteras om.
    const timer = window.setTimeout(
      () => setLeaving(null),
      slides[leaving].intro ? INTRO_EXIT_MS : EXIT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [leaving]);

  // Läs hash före första målningen, annars blinkar introbilden förbi vid omladdning.
  useLayoutEffect(() => {
    const hash = Number(window.location.hash.slice(1));
    const restored = Number.isInteger(hash) && hash > 0 ? Math.min(hash, last) : 0;
    window.history.replaceState(window.history.state, '', `#${restored}`);
    setIndex(restored);
    setReady(true);
  }, [last]);

  // Djuplänkar och webbläsarens fram-/bakåtknappar.
  useEffect(() => {
    const readHash = () => {
      const hash = Number(window.location.hash.slice(1));
      if (Number.isInteger(hash) && hash >= 0) go(hash);
    };
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, [go]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      // Skriv i ett fält eller använd en genväg utan att bilden byts.
      if (target.closest('input, textarea, [contenteditable=true]') || event.altKey || event.ctrlKey || event.metaKey) return;
      // Om texten är högre än rutan ska piltangenterna scrolla den i stället.
      const readingArea = target.closest<HTMLElement>('.slide-copy');
      if (
        readingArea &&
        readingArea.scrollHeight > readingArea.clientHeight &&
        ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)
      )
        return;
      // Mellanslag på en fokuserad knapp ska trycka på knappen.
      if (event.key === ' ' && target.closest('button')) return;

      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(event.key)) {
        event.preventDefault();
        forward();
      }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        backward();
      }
      if (event.key === 'Home') {
        event.preventDefault();
        go(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        go(last);
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (event.repeat) return;
        if (restartReturn.current !== null) {
          const destination = restartReturn.current;
          restartReturn.current = null;
          go(destination);
        } else if (index !== 0) {
          restartReturn.current = index;
          go(0);
        }
      }
      if (event.key.toLowerCase() === 'f') void toggleFullscreen().catch(() => {});
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [index, last, go, forward, backward, toggleFullscreen]);

  // Montera direkt på rätt bild, aldrig på introbilden först.
  if (!ready) return <main className="presentation" aria-busy="true" aria-label="Laddar presentationen" />;

  return (
    <main
      data-revealed={step > 0}
      className={[
        'presentation',
        goingBack ? 'back-navigation' : '',
        hasNavigated ? '' : 'initial-slide',
        slide.intro ? 'intro-view' : '',
        slide.cover ? 'cover' : '',
        slide.variant ? `${slide.variant}-view` : '',
        slide.cards ? 'cards-view' : '',
        slide.anatomy ? 'anatomy-view' : '',
        slide.graph ? 'graph-view' : '',
        slide.shots ? 'shots-view' : '',
        slide.revealItems ? 'reveal-items' : '',
        fromIntro ? 'from-intro' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onTouchStart={(event) => {
        const point = event.touches[0];
        touch.current = event.touches.length === 1 ? { x: point.clientX, y: point.clientY, id: point.identifier } : null;
      }}
      onTouchCancel={() => {
        touch.current = null;
      }}
      onTouchEnd={(event) => {
        const start = touch.current;
        touch.current = null;
        if (!start || event.touches.length) return;
        const point = Array.from(event.changedTouches).find((p) => p.identifier === start.id);
        if (!point) return;
        const dx = point.clientX - start.x;
        const dy = point.clientY - start.y;
        // Vågrätt drag som är tydligt längre än det lodräta räknas som ett bläddrande.
        if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? forward : backward)();
      }}
    >
      {!slide.intro && (
        <header className="masthead">
          <span className="wordmark">
            <span className="live-dot" /> PRESENTATIONSSKELETT
          </span>
          <button
            className="icon-button fullscreen"
            aria-label={fullscreen ? 'Lämna helskärm' : 'Visa i helskärm'}
            title="Helskärm (F)"
            onClick={() => void toggleFullscreen().catch(() => {})}
          >
            {fullscreen ? <Collapse /> : <Expand />}
          </button>
        </header>
      )}

      {/* Bakgrunden. Ligger kvar på alla bilder och backar undan när man lämnar intron. */}
      {backdrop && (
        <div className="backdrop" aria-hidden="true">
          <video ref={setBackdropSpeed} autoPlay muted loop src={backdrop} />
        </div>
      )}

      {/* Scenen bakom texten. Här läggs illustrationer, canvas eller andra visuella lager in. */}
      <div className="stage" aria-hidden="true" />

      {/* Introbilden ligger kvar och dyker förbi kameran när man lämnar den. */}
      {leaving !== null && slides[leaving].intro && (
        <div className="intro-enter leaving" key={`intro-out-${index}`} aria-hidden="true">
          <IntroBody slide={slides[leaving]} />
        </div>
      )}

      {slide.intro ? (
        <button className="intro-enter" onClick={() => go(1)}>
          <IntroBody slide={slide} />
        </button>
      ) : (
        <>
          {leaving !== null && !slides[leaving].intro && (
            <section className="slide-copy leaving" key={`leaving-${leaving}-${index}`} aria-hidden="true">
              <SlideBody slide={slides[leaving]} leaving />
            </section>
          )}
          <section
            className="slide-copy"
            // key gör att copy-in-animationen spelas om vid varje bildbyte.
            key={index}
            tabIndex={0}
            aria-label="Bildinnehåll"
            aria-live="polite"
            aria-atomic="true"
          >
            <SlideBody slide={slide} step={step} />
          </section>
        </>
      )}

      {!slide.intro && (
        <footer>
          <div className="slide-count">
            <b>{String(index).padStart(2, '0')}</b>
            <span>/ {last}</span>
            <span className="keyboard-hint">PILTANGENTER FÖR ATT BLÄDDRA</span>
          </div>
          <nav aria-label="Presentationsbilder" className="timeline">
            {slides.slice(1).map((item, i) => (
              <button
                key={item.chapter}
                aria-label={`Bild ${i + 1}: ${item.title.replace('\n', ' ')}`}
                aria-current={index === i + 1 ? 'step' : undefined}
                title={`${i + 1}. ${item.title.replace('\n', ' ')}`}
                className={index === i + 1 ? 'active' : i + 1 < index ? 'visited' : ''}
                onClick={() => go(i + 1)}
              >
                <span />
              </button>
            ))}
          </nav>
          <div className="navigation">
            <button className="icon-button" disabled={index === 0 && step === 0} aria-label="Föregående" onClick={backward}>
              <ArrowLeft />
            </button>
            <button
              className="next-button"
              aria-label={index === last && step === builds ? 'Börja om' : 'Nästa'}
              onClick={() => (index === last && step === builds ? go(0) : forward())}
            >
              {index === last && step === builds ? <Restart /> : <ArrowRight />}
            </button>
          </div>
        </footer>
      )}
    </main>
  );
}

/** Skärmbilder som byts på klick. Bilderna ligger på varandra och korsas. */
function Shots({ shots, step }: { shots: NonNullable<Slide['shots']>; step: number }) {
  const current = Math.min(step, shots.length - 1);
  const shot = shots[current];
  return (
    <div className="shots">
      {shots.map((item, i) => (
        <figure
          key={item.src}
          className="shot"
          data-state={step < i ? 'hidden' : step === i ? 'active' : 'settled'}
        >
          {/* Alla laddas direkt, annars blinkar det till vid varje klick. */}
          <img src={item.src} alt={item.alt} loading="eager" />
        </figure>
      ))}
      <div className="shot-caption" key={current}>
        <span className="shot-count">
          {String(current + 1).padStart(2, '0')} / {String(shots.length).padStart(2, '0')}
        </span>
        {shot.heading && <h3>{shot.heading}</h3>}
        {shot.text && <p>{shot.text}</p>}
      </div>
    </div>
  );
}

/** Introbildens text. Renderas både för den aktiva och den utzoomande introbilden. */
function IntroBody({ slide }: { slide: Slide }) {
  return (
    <>
      {slide.title && <span className="intro-title">{slide.title}</span>}
      {slide.body && <span className="intro-hint">{slide.body}</span>}
    </>
  );
}

/** Textinnehållet på en bild. Renderas både för den inkommande och den utgående bilden. */
function SlideBody({
  slide,
  step = 0,
  leaving = false,
}: {
  slide: Slide;
  step?: number;
  leaving?: boolean;
}) {
  return (
    <>
      <p className="eyebrow">{slide.chapter}</p>
      <h1 className={slide.inlineTitle ? 'one-line' : undefined}>
        {slide.title.split('\n').map((line, i) => (
          <span key={line} className={i === 1 ? 'second-line' : ''}>
            {line}
          </span>
        ))}
      </h1>
      {slide.body && <p className="body-copy">{slide.body}</p>}
      {slide.cards && (
        <div
          className={`cards ${slide.linked ? 'linked' : ''}`}
          data-count={slide.cards.length}
          data-revealed={step > 0}
        >
          {slide.cards.map((card) => (
            <article key={card.heading}>
              {card.label && <span className="card-label">{card.label}</span>}
              <h2>{card.heading}</h2>
              {card.text && <p>{card.text}</p>}
              {card.items && (
                <ul>
                  {card.items.map((item) =>
                    typeof item === 'string' ? (
                      <li key={item}>{item}</li>
                    ) : (
                      <li key={item.name}>
                        <b>{item.name}</b>
                        <span>{item.text}</span>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
      {slide.anatomy && !leaving && (
        <Anatomy data={slide.anatomy} step={step} builds={slide.builds ?? 0} />
      )}
      {slide.graph && !leaving && <Graph data={slide.graph} step={step} />}
      {slide.shots && <Shots shots={slide.shots} step={step} />}
      {slide.detail && <p className="detail-copy">{slide.detail}</p>}
      {slide.steps && (
        <ol className="steps">
          {slide.steps.map((step, i) => (
            <li key={step}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {step}
            </li>
          ))}
        </ol>
      )}
      {slide.columns && (
        <div className="columns">
          {slide.columns.map((column) => (
            <article key={column.heading}>
              <h2>{column.heading}</h2>
              <p>{column.text}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
