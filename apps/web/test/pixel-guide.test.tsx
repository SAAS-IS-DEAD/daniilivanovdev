import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PixelGuide } from '../src/components/PixelGuide';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
test('animation and typewriter advance, pause and release timers on unmount', () => {
  vi.useFakeTimers();
  const props = {
    message: 'Привет, это полный текст.',
    pose: 'idle' as const,
    paused: false,
    onWave: vi.fn(),
  };
  const { container, rerender, unmount } = render(<PixelGuide {...props} />);
  const sprite = screen.getByRole('img');
  expect(sprite).toHaveAttribute('data-frame', '0');
  expect(screen.getByRole('status')).toHaveTextContent(props.message);
  act(() => vi.advanceTimersByTime(420));
  expect(sprite).toHaveAttribute('data-frame', '1');
  fireEvent.click(screen.getByRole('button', { name: 'Помахать персонажу' }));
  expect(props.onWave).toHaveBeenCalledOnce();
  rerender(<PixelGuide {...props} paused />);
  expect(sprite).toHaveAttribute('data-frame', '0');
  expect(container.querySelector('.dialogue p')).toHaveTextContent(props.message);
  act(() => vi.advanceTimersByTime(2000));
  expect(sprite).toHaveAttribute('data-frame', '0');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
test('gaming GIF is replaced with a still image while paused', () => {
  const props = {
    message: 'Играем',
    pose: 'think' as const,
    paused: false,
    onWave: vi.fn(),
    gaming: true,
  };
  const { rerender, container } = render(<PixelGuide {...props} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/character-gaming.gif');
  rerender(<PixelGuide {...props} paused />);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByRole('img')).toHaveClass('character-gaming-still');
  rerender(<PixelGuide {...props} gaming={false} />);
  expect(screen.getByRole('img')).toHaveClass('character-sprite');
});

test('reduced-motion preference reacts to changes and removes its listener', async () => {
  const { renderHook } = await import('@testing-library/react');
  const { useReducedMotion } = await import('../src/components/PixelGuide');
  const media = new EventTarget() as EventTarget & { matches: boolean };
  media.matches = false;
  const remove = vi.spyOn(media, 'removeEventListener');
  vi.stubGlobal('matchMedia', () => media);
  const { result, unmount } = renderHook(useReducedMotion);
  expect(result.current).toBe(false);
  act(() => {
    media.matches = true;
    media.dispatchEvent(new Event('change'));
  });
  expect(result.current).toBe(true);
  unmount();
  expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  vi.unstubAllGlobals();
});
