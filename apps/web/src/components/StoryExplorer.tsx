import { useEffect, useRef, useState } from 'react';
import { SkillBreaker } from './SkillBreaker';
import { ExternalLink } from './ProfileSections';
import type { PublicProfile } from './ProfileSections';

export type Section = 'start' | 'experience' | 'projects' | 'skills' | 'about' | 'contact';
export type Selection = { kind: 'experience' | 'projects'; id: string } | null;
const month = (date: string) =>
  new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(date),
  );
const period = (start: string, end: string | null) =>
  `${month(start)} — ${end ? month(end) : 'сейчас'}`;
const countLabel = (n: number) => String(n).padStart(2, '0');
export function shortStory(description: string | null) {
  if (!description) return 'Выбери карточку — посмотрим подробнее.';
  const firstResult =
    description.split(/\n[•-]\s/)[1] ?? description.split('\n\n')[0] ?? description;
  return firstResult.length > 260
    ? firstResult.slice(0, 257).replace(/\s+\S*$/, '') + '…'
    : firstResult;
}
export const sectionMessages: Record<Section, string> = {
  start:
    'Привет! Это моя маленькая цифровая вселенная. Выбирай, что интересно: где я работал, что создавал или с чем умею работать.',
  experience:
    'За каждой компанией — своя история. Наведи на место работы, и я расскажу главное. Нажми, чтобы узнать подробности.',
  projects:
    'От больших продуктов до собственного пет-проекта. Выбирай карточку — расскажу, что делал, и покажу ссылку.',
  skills:
    'Сыграем? Отбивай шарик ракеткой и разбивай блоки с навыками. Двигай мышью или веди пальцем по полю. А ниже можно спокойно изучить весь стек.',
  about:
    'Давай познакомимся поближе. Здесь — мой путь, подход к работе и немного контекста за строчками резюме.',
  contact:
    'Продолжим знакомство? Напиши мне удобным способом. Буду рад обсудить интересную задачу.',
};

export function StoryExplorer({
  profile,
  section,
  selection,
  onSection,
  onSelect,
  onPreview,
  onNarrate,
}: {
  profile: PublicProfile;
  section: Section;
  selection: Selection;
  onSection: (section: Section) => void;
  onSelect: (selection: Selection) => void;
  onPreview: (message: string | null) => void;
  onNarrate: (message: string | null) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const previousLocation = useRef(`${section}-${selection?.id ?? ''}`);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    const location = `${section}-${selection?.id ?? ''}`;
    if (previousLocation.current === location) return;
    previousLocation.current = location;
    heading.current?.focus({ preventScroll: true });
    if (window.innerWidth <= 700) panel.current?.scrollIntoView?.({ block: 'start' });
  }, [section, selection?.id]);
  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [section]);
  const preview = (message: string) => ({
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType !== 'touch') onPreview(message);
    },
    onPointerLeave: () => onPreview(null),
    onFocus: () => onPreview(message),
    onBlur: () => onPreview(null),
  });
  const routes: { key: Section; title: string; subtitle: string; icon: string; meta: string }[] = [
    {
      key: 'experience',
      title: 'Места работы',
      subtitle: 'Команды, задачи и мой вклад',
      icon: '↗',
      meta: `${countLabel(profile.experience.length)} КОМПАНИЙ`,
    },
    {
      key: 'projects',
      title: 'Проекты',
      subtitle: 'От идеи до работающего продукта',
      icon: '◇',
      meta: `${countLabel(profile.projects.length)} ПРОЕКТА`,
    },
    {
      key: 'skills',
      title: 'Навыки',
      subtitle: 'Технологии, с которыми я работаю',
      icon: '⌘',
      meta: `${countLabel(profile.skills.length)} В АРСЕНАЛЕ`,
    },
    {
      key: 'about',
      title: 'Обо мне',
      subtitle: 'Человек по ту сторону кода',
      icon: '☺',
      meta: 'ДАВАЙ ЗНАКОМИТЬСЯ',
    },
  ];
  const item =
    selection?.kind === 'experience'
      ? profile.experience.find((e) => e.id === selection.id)
      : selection?.kind === 'projects'
        ? profile.projects.find((p) => p.id === selection.id)
        : undefined;
  const titles: Record<Section, string> = {
    start: 'Куда отправимся?',
    experience: 'Места работы',
    projects: 'Проекты',
    skills: 'Навыки',
    about: 'По ту сторону кода',
    contact: 'Начнём разговор',
  };
  const email = profile.description.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  const contacts = profile.description.split('Контакты:')[1];
  return (
    <section ref={panel} className="explorer" aria-label="Исследовать профиль">
      <div className="explorer-toolbar">
        {section === 'start' ? (
          <span className="eyebrow">ВЫБЕРИ СВОЙ МАРШРУТ</span>
        ) : (
          <button
            className="back-button"
            onClick={() => (selection ? onSelect(null) : onSection('start'))}
          >
            ← {selection ? 'К списку' : 'Все разделы'}
          </button>
        )}
        <span className="toolbar-step">
          {section === 'start' ? 'START HERE' : 'EXPLORE / ' + section.toUpperCase()}
        </span>
      </div>
      <div className="explorer-content" key={`${section}-${selection?.id ?? ''}`}>
        <h2 ref={heading} tabIndex={-1}>
          {item ? ('company' in item ? item.company : item.name) : titles[section]}
        </h2>
        {section === 'start' && (
          <>
            <p className="panel-intro">
              Небольшое путешествие по моему опыту.
              <br />Я рядом — всё покажу.
            </p>
            <div className="route-grid">
              {routes.map((route, i) => (
                <button
                  key={route.key}
                  className={`route-card route-${route.key}`}
                  onClick={() => onSection(route.key)}
                  {...preview(sectionMessages[route.key])}
                >
                  <span className="route-top">
                    <span className="route-icon" aria-hidden="true">
                      {route.icon}
                    </span>
                    <span className="route-number">0{i + 1}</span>
                  </span>
                  <strong>{route.title}</strong>
                  <span className="route-subtitle">{route.subtitle}</span>
                  <span className="route-meta">
                    {route.meta}
                    <span aria-hidden="true">↗</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="explorer-hint">
              <span aria-hidden="true">✦</span> Начни с любого раздела. Правильного порядка нет.
            </p>
          </>
        )}
        {!selection && section === 'experience' && (
          <>
            <p className="panel-intro">
              Мой путь в разработке. Наведи на компанию — расскажу главное.
            </p>
            <div className="career-list">
              {profile.experience.map((e, i) => (
                <button
                  key={e.id}
                  className="career-stop"
                  onClick={() => onSelect({ kind: 'experience', id: e.id })}
                  {...preview(`${e.company}. ${shortStory(e.description)}`)}
                >
                  <span className="company-tile" aria-hidden="true">
                    {e.company.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="career-label">
                    <strong>{e.company}</strong>
                    <span>{e.position}</span>
                    <small>{period(e.startDate, e.endDate)}</small>
                  </span>
                  <span className="stop-index" aria-hidden="true">
                    {countLabel(i + 1)} ↗
                  </span>
                </button>
              ))}
            </div>
            {profile.experience.length === 0 && (
              <p className="empty-note">Истории о местах работы скоро появятся.</p>
            )}
          </>
        )}
        {!selection && section === 'projects' && (
          <>
            <p className="panel-intro">Продукты, к которым я приложил руку.</p>
            <div className="project-grid">
              {profile.projects.map((p, i) => (
                <button
                  className="project-card"
                  key={p.id}
                  onClick={() => onSelect({ kind: 'projects', id: p.id })}
                  {...preview(`${p.name}. ${shortStory(p.description)}`)}
                >
                  <span className={`project-art art-${i % 4}`} aria-hidden="true">
                    <span className="project-glyph">{['⌁', '✳', '▥', '◇'][i % 4]}</span>
                    <small>PROJECT / {countLabel(i + 1)}</small>
                  </span>
                  <span className="project-name">
                    <strong>{p.name}</strong>
                    <span aria-hidden="true">↗</span>
                  </span>
                  <span className="project-excerpt">{shortStory(p.description)}</span>
                </button>
              ))}
            </div>
            {profile.projects.length === 0 && <p className="empty-note">Проекты скоро появятся.</p>}
          </>
        )}
        {item && (
          <article className="story-detail">
            {'company' in item && (
              <>
                <p className="story-period">{period(item.startDate, item.endDate)}</p>
                <h3>{item.position}</h3>
              </>
            )}
            <div className="story-prose">
              {(item.description ?? '').split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {'websiteUrl' in item && (
              <div className="links">
                <ExternalLink url={item.websiteUrl}>Открыть проект ↗</ExternalLink>
                <ExternalLink url={item.repositoryUrl}>Исходный код ↗</ExternalLink>
                <ExternalLink url={item.imageUrl}>Изображение ↗</ExternalLink>
              </div>
            )}
          </article>
        )}
        {section === 'skills' && (
          <>
            <p className="panel-intro">Мой стек — твой арканоид. Сколько навыков соберёшь?</p>
            <SkillBreaker skills={profile.skills} />
            <h3>Весь стек, без игры</h3>
            <label className="skill-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Например, TypeScript"
                aria-label="Найти навык"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Очистить поиск">
                  ×
                </button>
              )}
            </label>
            <div className="skill-cloud">
              {profile.skills
                .filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim()))
                .map((s) => {
                  const companies = profile.experience
                    .filter((e) => e.description?.toLowerCase().includes(s.name.toLowerCase()))
                    .map((e) => e.company);
                  const message = companies.length
                    ? `${s.name}. Этот навык встречается в моём опыте в ${companies.join(', ')}. Подробности — в разделе «Места работы».`
                    : `${s.name} — часть моего рабочего набора. Больше о задачах и применении — в историях о работе и проектах.`;
                  return (
                    <button
                      key={s.id}
                      className={`skill-chip ${selectedSkill === s.id ? 'is-selected' : ''}`}
                      aria-pressed={selectedSkill === s.id}
                      onClick={() => {
                        setSelectedSkill(s.id);
                        onNarrate(message);
                      }}
                      {...preview(message)}
                    >
                      {s.name}
                      <span aria-hidden="true">↗</span>
                    </button>
                  );
                })}
            </div>
            {profile.skills.filter((s) =>
              s.name.toLowerCase().includes(search.toLowerCase().trim()),
            ).length === 0 && (
              <p className="empty-note">Ничего не нашлось. Попробуй другое название.</p>
            )}
          </>
        )}
        {section === 'about' && (
          <>
            <p className="panel-intro">{profile.specialization}</p>
            <p className="about-copy">{profile.description}</p>
            <button className="primary-button" onClick={() => onSection('contact')}>
              Давай пообщаемся <span aria-hidden="true">↗</span>
            </button>
          </>
        )}
        {section === 'contact' && (
          <>
            <p className="panel-intro">Есть интересная задача или просто хочешь поздороваться?</p>
            <div className="contact-links">
              {profile.links.map((l) => (
                <ExternalLink key={l.id} url={l.url}>
                  {l.label}
                  <span aria-hidden="true">↗</span>
                </ExternalLink>
              ))}
            </div>
            {email && (
              <div className="email-card">
                <span className="eyebrow">ИЛИ НАПИШИ НА ПОЧТУ</span>
                <a href={`mailto:${email}`}>{email}</a>
                <button
                  className="back-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(email);
                      setCopied(true);
                      setCopyError(false);
                    } catch {
                      setCopyError(true);
                    }
                  }}
                >
                  {copied ? 'Скопировано ✓' : 'Скопировать адрес'}
                </button>
                {copyError && <p role="alert">Не удалось скопировать. Выдели адрес вручную.</p>}
              </div>
            )}
            {contacts && <p className="contact-note">{contacts.trim()}</p>}
            {!profile.links.length && !email && (
              <p className="empty-note">Контакты пока не добавлены.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
