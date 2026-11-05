import { useEffect, useRef, useState } from 'react';
import { advance, createGame, movePaddle, PADDLE_WIDTH, PADDLE_Y } from '../game/skill-breaker';

export function SkillBreaker({ skills }: { skills: { id: string; name: string }[] }) {
  const game = useRef(createGame(skills));
  const field = useRef<SVGSVGElement>(null);
  const keys = useRef(new Set<string>());
  const [, render] = useState(0);
  const refresh = () => render((n) => n + 1);
  const state = game.current;
  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const pause = () => {
      keys.current.clear();
      if (game.current.status === 'playing') {
        game.current.status = 'paused';
        refresh();
      }
    };
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      const current = game.current;
      if (current.status === 'playing') {
        const direction =
          Number(keys.current.has('ArrowRight')) - Number(keys.current.has('ArrowLeft'));
        if (direction) movePaddle(current, current.paddle + direction * 440 * dt);
        advance(current, dt, skills);
        refresh();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', pause);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', pause);
    };
  }, [skills]);
  if (!skills.length) return null;
  const pause = () => {
    keys.current.clear();
    if (game.current.status === 'playing') {
      game.current.status = 'paused';
      refresh();
    }
  };
  const start = () => {
    if (state.status === 'won' || state.status === 'lost') game.current = createGame(skills);
    game.current.status = game.current.status === 'playing' ? 'paused' : 'playing';
    field.current?.focus({ preventScroll: true });
    refresh();
  };
  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== 'mouse' && !event.currentTarget.hasPointerCapture(event.pointerId))
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    movePaddle(state, ((event.clientX - rect.left) / rect.width) * 600);
    refresh();
  };
  return (
    <div className="skill-breaker">
      <div className="breaker-score" aria-live="polite">
        <span>
          РАЗБИТО{' '}
          <strong>
            {state.score} / {skills.length}
          </strong>
        </span>
        <span>
          ПОПЫТКИ <strong>{state.lives}</strong>
        </span>
        <span>
          ВОЛНА{' '}
          <strong>
            {state.wave + 1} / {Math.ceil(skills.length / 12)}
          </strong>
        </span>
      </div>
      <div className="breaker-board">
        <svg
          ref={field}
          viewBox="0 0 600 460"
          tabIndex={0}
          role="group"
          aria-label="Арканоид навыков"
          aria-describedby="breaker-help"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            if (event.pointerType !== 'mouse')
              event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.focus({ preventScroll: true });
            move(event);
            if (state.status !== 'playing') start();
          }}
          onPointerMove={move}
          onPointerLeave={pause}
          onPointerUp={(event) => {
            if (event.pointerType !== 'mouse') pause();
          }}
          onPointerCancel={() => {
            if (state.status === 'playing') {
              state.status = 'paused';
              refresh();
            }
          }}
          onKeyDown={(event) => {
            if (['ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape'].includes(event.key))
              event.preventDefault();
            if (event.key.startsWith('Arrow')) keys.current.add(event.key);
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) start();
            if (event.key === 'Escape' && state.status === 'playing') {
              state.status = 'paused';
              refresh();
            }
          }}
          onKeyUp={(event) => keys.current.delete(event.key)}
          onBlur={(event) => {
            keys.current.clear();
            if (!event.relatedTarget?.closest('.skill-breaker') && state.status === 'playing') {
              state.status = 'paused';
              refresh();
            }
          }}
        >
          <defs>
            <pattern id="breaker-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#29322c" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="600" height="460" fill="url(#breaker-grid)" />
          {state.bricks
            .filter((b) => b.alive)
            .map((brick, i) => (
              <g key={brick.id} className={`breaker-brick brick-tone-${i % 3}`}>
                <title>{brick.name}</title>
                <rect x={brick.x} y={brick.y} width="180" height="36" rx="5" />
                <text
                  x={brick.x + 90}
                  y={brick.y + 23}
                  textAnchor="middle"
                  fontSize="20"
                  textLength={brick.name.length > 13 ? 160 : undefined}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {brick.name.length > 28 ? brick.name.slice(0, 27) + '…' : brick.name}
                </text>
              </g>
            ))}
          <rect
            data-testid="skill-paddle"
            x={state.paddle - PADDLE_WIDTH / 2}
            y={PADDLE_Y}
            width={PADDLE_WIDTH}
            height="10"
            rx="5"
            fill="#e8c18c"
          />
          <circle data-testid="skill-ball" cx={state.x} cy={state.y} r="7" fill="#f5ead7" />
        </svg>
        {state.status !== 'playing' && (
          <div className="breaker-overlay" aria-live="polite">
            <strong>
              {state.status === 'won'
                ? 'Все навыки собраны!'
                : state.status === 'lost'
                  ? 'Ещё одну партию?'
                  : state.status === 'paused'
                    ? 'Пауза'
                    : state.score
                      ? 'Продолжаем?'
                      : 'Разбей мой стек'}
            </strong>
            <span>
              {state.status === 'won'
                ? 'Нажми на поле, чтобы сыграть снова.'
                : 'Нажми на поле, чтобы играть.'}
            </span>
          </div>
        )}
      </div>
      <p id="breaker-help" className="breaker-help">
        Двигай мышью или веди зажатым пальцем по полю. С клавиатуры: ← →, пробел — запуск / пауза.
        Клик — играть, мышь за пределами поля — пауза. На телефоне удерживай палец.
      </p>
    </div>
  );
}
