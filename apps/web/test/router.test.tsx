import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Router } from '../src/router';
vi.mock('../src/pages/ProfilePage', () => ({ ProfilePage: () => <h1>Профиль</h1> }));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
test('root routes to public profile', () => {
  window.history.replaceState(null, '', '/');
  render(<Router />);
  expect(screen.getByRole('heading', { name: 'Профиль' })).toBeVisible();
});
test('unknown routes show a way back home', () => {
  window.history.replaceState(null, '', '/missing');
  render(<Router />);
  expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
});
