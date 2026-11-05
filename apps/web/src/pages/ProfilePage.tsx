import { useEffect, useState } from 'react';
import { sdk } from '../api/client';
import { ExternalLink } from '../components/ProfileSections';
import type { PublicProfile } from '../components/ProfileSections';
import { PixelGuide, useReducedMotion } from '../components/PixelGuide';
import { StoryExplorer, sectionMessages, shortStory } from '../components/StoryExplorer';
import type { Section, Selection } from '../components/StoryExplorer';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; profile: PublicProfile | null };
function Portfolio({ profile }: { profile: PublicProfile }) {
  const [section, setSection] = useState<Section>('start');
  const [selection, setSelection] = useState<Selection>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const [waveCount, setWaveCount] = useState(0);
  const [waving, setWaving] = useState(true);
  useEffect(() => {
    setWaving(true);
    const timer = window.setTimeout(() => setWaving(false), 2800);
    return () => window.clearTimeout(timer);
  }, [waveCount]);
  function changeSection(next: Section) {
    setPreview(null);
    setNarrative(null);
    setSelection(null);
    setSection(next);
    setWaving(false);
  }
  function select(next: Selection) {
    setSelection(next);
    setPreview(null);
    setNarrative(null);
    setWaving(false);
  }
  const item =
    selection?.kind === 'experience'
      ? profile.experience.find((e) => e.id === selection.id)
      : selection?.kind === 'projects'
        ? profile.projects.find((p) => p.id === selection.id)
        : undefined;
  const message =
    waving && waveCount > 0
      ? 'Привет-привет! Рад знакомству. Выбирай маршрут, а я буду твоим проводником.'
      : (preview ?? narrative ?? (item ? shortStory(item.description) : sectionMessages[section]));
  const pose = waving
    ? 'wave'
    : preview || narrative || item
      ? 'talk'
      : section === 'skills'
        ? 'think'
        : 'idle';
  return (
    <div className={`portfolio ${paused || reduced ? 'motion-paused' : ''}`}>
      <a className="skip-link" href="#content">
        Перейти к содержимому
      </a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="На главную">
          <span className="brand-pixel" aria-hidden="true">
            d<span>.</span>
          </span>
          <span>
            {profile.name}
            <small>PERSONAL SPACE</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Разделы визитки">
          {(
            [
              ['start', 'Начало'],
              ['experience', 'Опыт'],
              ['projects', 'Проекты'],
              ['skills', 'Навыки'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              aria-current={section === key ? 'page' : undefined}
              onClick={() => changeSection(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="contact-button" onClick={() => changeSection('contact')}>
          Связаться <span aria-hidden="true">↗</span>
        </button>
      </header>
      <main id="content" tabIndex={-1}>
        <section className="hero" aria-labelledby="profile-name">
          <div>
            <p className="eyebrow hero-eyebrow">
              <span className="tiny-cross" aria-hidden="true">
                ✳
              </span>{' '}
              РАЗРАБОТЧИК. ТИМЛИД. ЧЕЛОВЕК.
            </p>
            <h1 id="profile-name">
              {profile.name}
              <span className="name-period" aria-hidden="true">
                .
              </span>
            </h1>
            <p className="specialization">
              {profile.specialization ?? 'Добро пожаловать в моё цифровое пространство'}
            </p>
          </div>
          <div className="hero-side">
            <span className="little-spark" aria-hidden="true">
              ✳
            </span>
            <p>
              За каждой строчкой кода —<br />
              своя история. Расскажу?
            </p>
            <span className="hero-arrow" aria-hidden="true">
              ↙
            </span>
          </div>
        </section>
        <div className="workspace">
          <PixelGuide
            message={message}
            pose={pose}
            gaming={section === 'skills'}
            paused={paused || reduced}
            onWave={() => {
              setPreview(null);
              setWaveCount((n) => n + 1);
            }}
          />
          <StoryExplorer
            profile={profile}
            section={section}
            selection={selection}
            onSection={changeSection}
            onSelect={select}
            onNarrate={setNarrative}
            onPreview={(value) => {
              setPreview(value);
              if (value) setWaving(false);
            }}
          />
        </div>
        <div className="workspace-footnote">
          <span>
            <i className="status-dot" /> ВСЁ НАЧИНАЕТСЯ СО ЗНАКОМСТВА
          </span>
          <button
            className="motion-toggle"
            disabled={reduced}
            onClick={() => setPaused((v) => !v)}
            aria-pressed={paused || reduced}
          >
            {paused || reduced ? '▶ Анимация выключена' : 'Ⅱ Выключить анимацию'}
          </button>
        </div>
      </main>
      <footer>
        <span>
          © {new Date().getFullYear()} {profile.name}
          <span className="footer-dot"> / </span>Сделано с характером.
        </span>
        <div className="footer-links">
          {profile.links.slice(0, 2).map((l) => (
            <ExternalLink key={l.id} url={l.url}>
              {l.label} <span aria-hidden="true">↗</span>
            </ExternalLink>
          ))}
        </div>
      </footer>
    </div>
  );
}
export function ProfilePage() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    sdk.GetProfile().then(
      ({ profile }) => {
        if (active) setState({ kind: 'ready', profile });
      },
      () => {
        if (active) setState({ kind: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  if (state.kind === 'ready' && state.profile) return <Portfolio profile={state.profile} />;
  return (
    <main className="state-screen">
      <span className="brand-pixel" aria-hidden="true">
        d<span>.</span>
      </span>
      {state.kind === 'loading' && <p role="status">Загружаем профиль…</p>}
      {state.kind === 'error' && (
        <div role="alert">
          <h1>Профиль временно недоступен</h1>
          <p>Не удалось загрузить данные. Попробуйте ещё раз.</p>
          <button className="primary-button" onClick={() => setAttempt((v) => v + 1)}>
            Повторить
          </button>
        </div>
      )}
      {state.kind === 'ready' && !state.profile && (
        <>
          <h1>Цифровая визитка</h1>
          <p>Профиль пока не заполнен.</p>
        </>
      )}
    </main>
  );
}
