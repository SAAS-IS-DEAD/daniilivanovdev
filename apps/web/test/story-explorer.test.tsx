import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StoryExplorer, shortStory } from '../src/components/StoryExplorer';
import { ExternalLink } from '../src/components/ProfileSections';
import type { PublicProfile } from '../src/components/ProfileSections';
const profile: PublicProfile = {
  id: '1',
  name: 'Test',
  specialization: 'Developer',
  description: 'Биография\n\nКонтакты: hello@example.com',
  links: [{ id: 'l', label: 'GitHub', url: 'https://github.com/example' }],
  skills: [{ id: 's', name: 'TypeScript', sortOrder: 0 }],
  experience: [
    {
      id: 'e',
      company: 'Company',
      position: 'Developer',
      description: 'Пишу на TypeScript',
      startDate: '2024-01-01',
      endDate: null,
      sortOrder: 0,
    },
  ],
  projects: [
    {
      id: 'p',
      name: 'Project',
      description: 'Описание\n\nДетали',
      websiteUrl: 'https://example.com',
      repositoryUrl: null,
      imageUrl: null,
      sortOrder: 0,
    },
  ],
};
const props = () => ({
  profile,
  selection: null,
  onSection: vi.fn(),
  onSelect: vi.fn(),
  onPreview: vi.fn(),
  onNarrate: vi.fn(),
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
test('summary selects a result, falls back to intro and bounds long text', () => {
  expect(shortStory(null)).toContain('Выбери карточку');
  expect(shortStory('Intro\n\n• Result')).toBe('Result');
  expect(shortStory('Intro\n\nMore')).toBe('Intro');
  expect(shortStory('word '.repeat(100)).length).toBeLessThanOrEqual(260);
  expect(shortStory('word '.repeat(100))).toMatch(/…$/);
});
test('unsafe and missing external URLs are not rendered', () => {
  const { rerender } = render(<ExternalLink url="javascript:alert(1)">Unsafe</ExternalLink>);
  expect(screen.queryByRole('link')).toBeNull();
  rerender(<ExternalLink url={null}>Missing</ExternalLink>);
  expect(screen.queryByRole('link')).toBeNull();
  rerender(<ExternalLink url="https://example.com">Safe</ExternalLink>);
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
});
test('project selection, details and return expose only valid links', () => {
  const p = props();
  const { rerender } = render(<StoryExplorer {...p} section="projects" />);
  fireEvent.focus(screen.getByRole('button', { name: /Project/ }));
  expect(p.onPreview).toHaveBeenCalledWith('Project. Описание');
  fireEvent.click(screen.getByRole('button', { name: /Project/ }));
  expect(p.onSelect).toHaveBeenCalledWith({ kind: 'projects', id: 'p' });
  rerender(<StoryExplorer {...p} section="projects" selection={{ kind: 'projects', id: 'p' }} />);
  expect(screen.getByText('Детали')).toBeVisible();
  expect(screen.getByRole('link', { name: /Открыть проект/ })).toHaveAttribute(
    'href',
    'https://example.com',
  );
  expect(screen.queryByRole('link', { name: /Исходный код/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /К списку/ }));
  expect(p.onSelect).toHaveBeenCalledWith(null);
});
test('skill search ignores case and whitespace; selection narrates matching experience', () => {
  const p = props();
  render(<StoryExplorer {...p} section="skills" />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  TYPESCRIPT  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'TypeScript' }));
  expect(p.onNarrate).toHaveBeenCalledWith(expect.stringContaining('Company'));
  expect(screen.getByRole('button', { name: 'TypeScript' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('contacts copy the parsed email and explain clipboard failures', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const p = props();
  const { rerender } = render(<StoryExplorer {...p} section="contact" />);
  expect(screen.getByRole('link', { name: 'hello@example.com' })).toHaveAttribute(
    'href',
    'mailto:hello@example.com',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Скопировать адрес' }));
  await screen.findByText('Скопировано ✓');
  expect(writeText).toHaveBeenCalledWith('hello@example.com');
  rerender(<StoryExplorer {...p} section="about" />);
  rerender(<StoryExplorer {...p} section="contact" />);
  writeText.mockRejectedValue(new Error('denied'));
  fireEvent.click(screen.getByRole('button', { name: 'Скопировать адрес' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось скопировать'),
  );
});
for (const section of ['experience', 'projects', 'contact'] as const) {
  test(`empty ${section} has an explicit placeholder`, () => {
    render(
      <StoryExplorer
        {...props()}
        profile={{ ...profile, description: '', experience: [], projects: [], links: [] }}
        section={section}
      />,
    );
    expect(screen.getByText(/скоро появятся|пока не добавлены/)).toBeVisible();
  });
}
