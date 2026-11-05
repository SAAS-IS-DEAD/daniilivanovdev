import { describe, expect, it } from 'vitest';
import { advance, createGame, movePaddle, PADDLE_Y } from '../src/game/skill-breaker';
const skills = Array.from({ length: 13 }, (_, i) => ({ id: String(i), name: `Skill ${i}` }));
describe('skill arcade physics', () => {
  it('removes a hit brick once without changing profile skills', () => {
    const game = createGame(skills);
    game.status = 'playing';
    game.x = 100;
    game.y = 222;
    game.vx = 0;
    game.vy = -270;
    advance(game, 0.02, skills);
    expect(game.score).toBe(1);
    expect(game.bricks[9]!.alive).toBe(false);
    expect(game.vy).toBeGreaterThan(0);
    advance(game, 0.02, skills);
    expect(game.score).toBe(1);
    expect(skills).toHaveLength(13);
  });
  it('bounces off paddle, clamps movement and freezes on pause', () => {
    const game = createGame(skills);
    movePaddle(game, -100);
    expect(game.paddle).toBe(56);
    movePaddle(game, 300);
    game.status = 'playing';
    game.x = 325;
    game.y = PADDLE_Y - 8;
    game.vy = 270;
    advance(game, 0.02, skills);
    expect(game.vy).toBeLessThan(0);
    game.status = 'paused';
    const before = structuredClone(game);
    advance(game, 0.05, skills);
    expect(game).toEqual(before);
  });
  it('loses attempts and ends after the third miss', () => {
    const game = createGame(skills);
    for (let i = 0; i < 3; i++) {
      game.status = 'playing';
      game.y = 470;
      advance(game, 0.01, skills);
      expect(game.lives).toBe(2 - i);
    }
    expect(game.status).toBe('lost');
  });
  it('advances waves then wins when all skills are broken', () => {
    const game = createGame(skills);
    game.bricks.forEach((b) => {
      b.alive = false;
    });
    game.status = 'playing';
    advance(game, 0.01, skills);
    expect(game.wave).toBe(1);
    expect(game.bricks).toHaveLength(1);
    expect(game.status).toBe('ready');
    game.bricks[0]!.alive = false;
    game.status = 'playing';
    advance(game, 0.01, skills);
    expect(game.status).toBe('won');
  });
});

it('walls reflect the ball and long frames cannot skip bricks', () => {
  const game = createGame(skills);
  game.status = 'playing';
  game.x = 8;
  game.y = 300;
  game.vx = -200;
  game.vy = 0;
  advance(game, 0.05, skills);
  expect(game.vx).toBeGreaterThan(0);
  game.x = 592;
  game.vx = 200;
  advance(game, 0.05, skills);
  expect(game.vx).toBeLessThan(0);
  game.x = 300;
  game.y = 8;
  game.vy = -200;
  game.vx = 0;
  advance(game, 0.05, skills);
  expect(game.vy).toBeGreaterThan(0);
  game.x = 100;
  game.y = 222;
  game.vy = -270;
  advance(game, 10, skills);
  expect(game.score).toBeGreaterThan(0);
});
it('ready ball follows clamped paddle and terminal states do not advance', () => {
  const game = createGame(skills);
  movePaddle(game, 999);
  expect(game.paddle).toBe(544);
  expect(game.x).toBe(544);
  for (const status of ['ready', 'paused', 'won', 'lost'] as const) {
    game.status = status;
    const before = structuredClone(game);
    advance(game, 1, skills);
    expect(game).toEqual(before);
  }
});
