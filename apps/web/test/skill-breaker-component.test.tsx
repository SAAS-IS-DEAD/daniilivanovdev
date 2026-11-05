import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SkillBreaker } from '../src/components/SkillBreaker';
const skills = [{ id: 'one', name: 'TypeScript' }];
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test('click starts, pointer leave pauses, keyboard resumes, and unmount cancels animation', () => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', MouseEvent);
  const { unmount } = render(<SkillBreaker skills={skills} />);
  const field = screen.getByRole('group', { name: 'Арканоид навыков' });
  // Pointer capture is implemented by real browsers and separately covered in Playwright.
  Object.defineProperty(field, 'setPointerCapture', { value: vi.fn() });
  Object.defineProperty(field, 'hasPointerCapture', { value: () => true });
  vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 600,
    bottom: 460,
    width: 600,
    height: 460,
    toJSON: () => ({}),
  });
  expect(screen.getByText('Разбей мой стек')).toBeVisible();
  fireEvent.pointerDown(field, { button: 0, clientX: 300 });
  expect(screen.queryByText('Разбей мой стек')).toBeNull();
  act(() => vi.advanceTimersByTime(100));
  const ball = screen.getByTestId('skill-ball');
  expect(Number(ball.getAttribute('cy'))).toBeLessThan(400);
  fireEvent.pointerLeave(field);
  expect(screen.getByText('Пауза')).toBeVisible();
  const y = ball.getAttribute('cy');
  act(() => vi.advanceTimersByTime(300));
  expect(ball).toHaveAttribute('cy', y!);
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(screen.queryByText('Пауза')).toBeNull();
  fireEvent.keyDown(field, { key: 'ArrowRight' });
  act(() => vi.advanceTimersByTime(100));
  fireEvent.keyUp(field, { key: 'ArrowRight' });
  expect(Number(screen.getByTestId('skill-paddle').getAttribute('x'))).toBeGreaterThan(244);
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(screen.getByText('Пауза')).toBeVisible();
  fireEvent.keyDown(field, { key: ' ' });
  fireEvent(window, new Event('blur'));
  expect(screen.getByText('Пауза')).toBeVisible();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
test('empty skills do not show an unplayable board', () => {
  const { container } = render(<SkillBreaker skills={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('touch release/cancel and losing focus pause the game; clicks ignore secondary buttons', () => {
  vi.useFakeTimers();
  class TouchPointerEvent extends MouseEvent {
    pointerType = 'touch';
    pointerId = 1;
  }
  vi.stubGlobal('PointerEvent', TouchPointerEvent);
  render(<SkillBreaker skills={skills} />);
  const field = screen.getByRole('group');
  Object.defineProperty(field, 'setPointerCapture', { value: vi.fn() });
  Object.defineProperty(field, 'hasPointerCapture', { value: () => true });
  vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 600,
    bottom: 460,
    width: 600,
    height: 460,
    toJSON: () => ({}),
  });
  fireEvent.pointerDown(field, { button: 2, clientX: 100 });
  expect(screen.getByText('Разбей мой стек')).toBeVisible();
  fireEvent.pointerDown(field, { button: 0, clientX: 100 });
  fireEvent.pointerMove(field, { clientX: 400 });
  expect(Number(screen.getByTestId('skill-paddle').getAttribute('x'))).toBe(344);
  fireEvent.pointerUp(field);
  expect(screen.getByText('Пауза')).toBeVisible();
  fireEvent.pointerDown(field, { button: 0, clientX: 100 });
  fireEvent.pointerCancel(field);
  expect(screen.getByText('Пауза')).toBeVisible();
  fireEvent.keyDown(field, { key: 'Enter' });
  fireEvent.blur(field);
  expect(screen.getByText('Пауза')).toBeVisible();
  fireEvent.keyDown(field, { key: 'Enter' });
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByText('Пауза')).toBeVisible();
});
