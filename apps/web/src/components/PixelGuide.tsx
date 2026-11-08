import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import gamingAnimation from '../assets/character-gaming.gif';

export type Pose = 'idle' | 'wave' | 'talk' | 'think';
// Foot anchors from the owner's animation demo keep each frame on the same ground plane.
const anchors = {
  idle: [
    [171.5, 304],
    [472, 304],
    [773.5, 304],
    [1074.5, 303],
  ],
  wave: [
    [172, 618],
    [472.5, 618],
    [774, 618],
    [1074.5, 618],
  ],
  talk: [
    [172.5, 934],
    [473, 934],
    [774, 934],
    [1075, 934],
  ],
  think: [
    [172, 1250],
    [472.5, 1250],
    [773.5, 1250],
    [1074.5, 1250],
  ],
} as const;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function PixelGuide({
  message,
  pose,
  paused,
  onWave,
  gaming = false,
}: {
  message: string;
  pose: Pose;
  paused: boolean;
  onWave: () => void;
  gaming?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const [letters, setLetters] = useState(0);
  useEffect(() => {
    setFrame(0);
    if (paused || gaming) return;
    const timer = window.setInterval(
      () => setFrame((f) => (f + 1) % 4),
      pose === 'idle' ? 420 : 240,
    );
    return () => window.clearInterval(timer);
  }, [pose, paused, gaming]);
  useEffect(() => {
    setLetters(0);
    if (paused) return;
    const timer = window.setInterval(
      () =>
        setLetters((n) => {
          if (n >= message.length) window.clearInterval(timer);
          return n + 3;
        }),
      24,
    );
    return () => window.clearInterval(timer);
  }, [message, paused]);
  const [x, y] = anchors[pose][paused ? 0 : frame]!;
  const style: CSSProperties = { backgroundPosition: `${140 - x * 0.9}px ${280 - y * 0.9}px` };
  return (
    <aside className="guide-card" aria-label="Пиксельный проводник">
      <div className="guide-top">
        <span>
          <i className="status-dot" /> ПЕРСОНАЖ В СЕТИ
        </span>
        <span className="guide-coordinate">01 / HUMAN</span>
      </div>
      <div className="pixel-scene">
        <div className="scene-orbit orbit-one" />
        <div className="scene-orbit orbit-two" />
        <span className="scene-star star-one">+</span>
        <span className="scene-star star-two">+</span>
        <span className="scene-star star-three">·</span>
        <div className="scene-code" aria-hidden="true">
          <span>&lt;hello /&gt;</span>
          <i />
          <i />
          <i />
        </div>
        <div className="scene-floor" />
        <div className="character-shadow" />
        <button
          className="character-button"
          onClick={onWave}
          aria-label="Помахать персонажу"
          title="Нажми, чтобы поздороваться"
        >
          {gaming ? (
            paused ? (
              <span
                className="character-gaming-still"
                role="img"
                aria-label="Пиксельный персонаж с геймпадом"
              />
            ) : (
              <img
                className="character-gaming"
                src={gamingAnimation}
                alt="Пиксельный персонаж с геймпадом"
                width="340"
                height="340"
              />
            )
          ) : (
            <span
              className="character-sprite"
              style={style}
              data-pose={pose}
              data-frame={paused ? 0 : frame}
              role="img"
              aria-label="Пиксельный персонаж в очках и чёрной куртке"
            />
          )}
        </button>
        <span className="scene-caption">НЕ NPC. ПРОСТО Я, В ПИКСЕЛЯХ.</span>
      </div>
      <div className="dialogue" role="status" aria-live="polite" aria-atomic="true">
        <div className="dialogue-label">
          <span>ДАНИИЛ.EXE</span>
          <span className="dialogue-signal" aria-hidden="true">
            ▂▄▆
          </span>
        </div>
        <span className="sr-only">{message}</span>
        <p aria-hidden="true">
          {paused ? message : message.slice(0, letters)}
          <span className="text-cursor">▌</span>
        </p>
      </div>
      <div className="guide-bottom">
        <span>Наведи · выбери · исследуй</span>
        <button onClick={onWave} className="wave-button">
          Помахать <span aria-hidden="true">↗</span>
        </button>
      </div>
    </aside>
  );
}
