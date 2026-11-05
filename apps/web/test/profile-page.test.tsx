import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProfilePage } from '../src/pages/ProfilePage';
import { sdk } from '../src/api/client';
vi.mock('../src/api/client', () => ({ sdk: { GetProfile: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
test('loading, retry after error, then empty profile', async () => {
  vi.mocked(sdk.GetProfile)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ profile: null });
  render(<ProfilePage />);
  expect(screen.getByRole('status')).toHaveTextContent('Загружаем');
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  await screen.findByText('Профиль пока не заполнен.');
});
test('renders API values as text and does not render empty sections', async () => {
  vi.mocked(sdk.GetProfile).mockResolvedValue({
    profile: {
      id: '1',
      name: '<script>alert(1)</script>',
      description: 'Описание',
      specialization: null,
      links: [{ id: 'l', label: 'GitHub', url: 'https://github.com/' }],
      skills: [],
      projects: [],
      experience: [],
    },
  });
  const { container } = render(<ProfilePage />);
  await screen.findByRole('heading', { name: '<script>alert(1)</script>' });
  expect(container.querySelector('script')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Опыт' })).toBeNull();
  expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
});

test('guide previews work on focus and opens the full story on selection', async () => {
  vi.mocked(sdk.GetProfile).mockResolvedValue({
    profile: {
      id: '1',
      name: 'Даниил Иванов',
      description: 'О себе',
      specialization: 'Разработчик',
      links: [],
      skills: [{ id: 's', name: 'TypeScript', sortOrder: 0 }],
      projects: [],
      experience: [
        {
          id: 'e',
          company: 'Lofty',
          position: 'Team Lead',
          description: 'История команды.\n\n• Ускорил SSR.',
          startDate: '2024-05-01',
          endDate: '2026-11-01',
          sortOrder: 0,
        },
      ],
    },
  });
  render(<ProfilePage />);
  fireEvent.click(await screen.findByRole('button', { name: /Места работы/ }));
  const company = screen.getByRole('button', { name: /Lofty/ });
  fireEvent.focus(company);
  expect(screen.getByRole('status')).toHaveTextContent('Lofty. Ускорил SSR.');
  fireEvent.click(company);
  expect(screen.getByRole('heading', { name: 'Lofty' })).toBeInTheDocument();
  expect(screen.getByText('История команды.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /К списку/ }));
  expect(screen.getByRole('button', { name: /Lofty/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Навыки' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Найти навык' }), {
    target: { value: 'python' },
  });
  expect(screen.getByText(/Ничего не нашлось/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }));
  expect(screen.getByRole('button', { name: 'TypeScript' })).toBeInTheDocument();
});

test('navigation, animation toggle, greeting and contact route work together', async () => {
  vi.mocked(sdk.GetProfile).mockResolvedValue({
    profile: {
      id: '1',
      name: 'Test',
      description: 'Biography',
      specialization: 'Developer',
      links: [],
      skills: [],
      projects: [],
      experience: [],
    },
  });
  render(<ProfilePage />);
  await screen.findByRole('heading', { name: 'Test' });
  fireEvent.click(screen.getByRole('button', { name: 'Опыт' }));
  expect(screen.getByText('Истории о местах работы скоро появятся.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Проекты' }));
  expect(screen.getByText('Проекты скоро появятся.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Начало' }));
  fireEvent.click(screen.getByRole('button', { name: /Обо мне/ }));
  expect(screen.getByText('Biography')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Давай пообщаемся/ }));
  expect(screen.getByRole('heading', { name: 'Начнём разговор' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Выключить анимацию/ }));
  expect(screen.getByRole('button', { name: /Анимация выключена/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Помахать персонажу' }));
  expect(screen.getByRole('status')).toHaveTextContent('Привет-привет!');
  fireEvent.click(screen.getByRole('button', { name: /Связаться/ }));
  expect(screen.getByRole('heading', { name: 'Начнём разговор' })).toBeVisible();
});
