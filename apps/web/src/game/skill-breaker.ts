// Fixed logical coordinates keep physics independent of screen size.
export const WIDTH = 600;
export const HEIGHT = 460;
export const PADDLE_Y = 414;
export const PADDLE_WIDTH = 112;
const RADIUS = 7;
export type Brick = { id: string; name: string; x: number; y: number; alive: boolean };
export type Game = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  paddle: number;
  lives: number;
  score: number;
  wave: number;
  status: 'ready' | 'playing' | 'paused' | 'won' | 'lost';
  bricks: Brick[];
};
export function bricksFor(skills: { id: string; name: string }[], wave: number): Brick[] {
  return skills.slice(wave * 12, wave * 12 + 12).map((skill, i) => ({
    ...skill,
    x: 18 + (i % 3) * 190,
    y: 34 + Math.floor(i / 3) * 48,
    alive: true,
  }));
}
export function createGame(skills: { id: string; name: string }[]): Game {
  return {
    x: 300,
    y: 400,
    vx: 110,
    vy: -270,
    paddle: 300,
    lives: 3,
    score: 0,
    wave: 0,
    status: 'ready',
    bricks: bricksFor(skills, 0),
  };
}
export function movePaddle(game: Game, x: number) {
  game.paddle = Math.max(PADDLE_WIDTH / 2, Math.min(WIDTH - PADDLE_WIDTH / 2, x));
  if (game.status === 'ready') game.x = game.paddle;
}
// Small steps avoid tunnelling through bricks, even after a slow frame.
export function advance(game: Game, seconds: number, skills: { id: string; name: string }[]) {
  if (game.status !== 'playing') return;
  const steps = Math.ceil(Math.min(seconds, 0.05) / 0.004);
  if (!steps) return;
  const dt = Math.min(seconds, 0.05) / steps;
  for (let i = 0; i < steps && game.status === 'playing'; i++) {
    const oldX = game.x,
      oldY = game.y;
    game.x += game.vx * dt;
    game.y += game.vy * dt;
    if (game.x < RADIUS || game.x > WIDTH - RADIUS) {
      game.x = Math.max(RADIUS, Math.min(WIDTH - RADIUS, game.x));
      game.vx *= -1;
    }
    if (game.y < RADIUS) {
      game.y = RADIUS;
      game.vy = Math.abs(game.vy);
    }
    if (
      game.vy > 0 &&
      oldY + RADIUS <= PADDLE_Y &&
      game.y + RADIUS >= PADDLE_Y &&
      Math.abs(game.x - game.paddle) < PADDLE_WIDTH / 2 + RADIUS
    ) {
      const offset = Math.max(-1, Math.min(1, (game.x - game.paddle) / (PADDLE_WIDTH / 2)));
      const angle = offset * 1.05;
      game.vx = 310 * Math.sin(angle);
      game.vy = -310 * Math.cos(angle);
      game.y = PADDLE_Y - RADIUS;
    }
    for (const brick of game.bricks) {
      if (
        !brick.alive ||
        game.x + RADIUS < brick.x ||
        game.x - RADIUS > brick.x + 180 ||
        game.y + RADIUS < brick.y ||
        game.y - RADIUS > brick.y + 36
      )
        continue;
      brick.alive = false;
      game.score++;
      if (oldX + RADIUS <= brick.x || oldX - RADIUS >= brick.x + 180) game.vx *= -1;
      else game.vy *= -1;
      break;
    }
    if (game.bricks.every((b) => !b.alive)) {
      if ((game.wave + 1) * 12 >= skills.length) {
        game.status = 'won';
      } else {
        game.wave++;
        game.bricks = bricksFor(skills, game.wave);
        game.status = 'ready';
        game.x = game.paddle;
        game.y = 400;
        game.vx = 110;
        game.vy = -270;
      }
    }
    if (game.y > HEIGHT + RADIUS) {
      game.lives--;
      game.status = game.lives ? 'ready' : 'lost';
      game.x = game.paddle;
      game.y = 400;
      game.vx = 110;
      game.vy = -270;
    }
  }
}
