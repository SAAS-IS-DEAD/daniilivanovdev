// Consolidated from the owner's front / lead / full-stack resumes, updated 2026-11-03.
// Source dates have month precision; the first day is a storage convention, not an exact date.
export const resumeData = {
  name: 'Даниил Иванов',
  specialization: 'Fullstack-разработчик / Frontend Team Lead — TypeScript, Node.js, Vue.js, React',
  description: `Разработчик с коммерческим опытом с 2020 года и опытом руководства командами с 2024 года. Основная экспертиза — TypeScript, Vue.js/Nuxt, React, Node.js/Bun и NestJS/Elysia. Около трёх лет занимался backend-разработкой.

Разрабатываю e-commerce-продукты, CRM и сервисы аналитики: пользовательские интерфейсы, API и BFF, авторизацию, каталоги, обработку заказов, платёжные интеграции и фоновые задачи. Есть опыт миграции legacy-систем, работы с PostgreSQL на больших объёмах данных, оптимизации SSR и кеширования.

Руководил frontend-командой из 5 разработчиков и кросс-функциональной командой до 13 специалистов. Отвечал за архитектуру, code review, релизы и качество. Проводил технические собеседования, онбординг и встречи 1:1. Участвую в полном цикле доставки приложений: тесты, CI/CD, динамические стенды и сопровождение production.

Москва. Русский — родной, английский — B1. Образование — среднее.
Контакты: dr.dany@yandex.ru · +7 (925) 229-70-05 · Telegram @hhhcggg.`,
  links: [
    { label: 'GitHub', url: 'https://github.com/OXXXRA' },
    { label: 'Telegram', url: 'https://t.me/hhhcggg' },
    { label: 'Пет-проект: маркет уценённых товаров', url: 'https://liquidationmarket.ru/' },
  ],
  skills: [
    'TypeScript',
    'JavaScript',
    'Vue.js',
    'Nuxt',
    'React',
    'Astro',
    'Next.js',
    'Node.js',
    'Bun',
    'NestJS',
    'Elysia',
    'PostgreSQL',
    'SQL',
    'Prisma',
    'Drizzle ORM',
    'Redis',
    'BullMQ',
    'REST API',
    'OpenAPI',
    'SSR',
    'HTML',
    'CSS',
    'SCSS',
    'Pinia',
    'Vite',
    'Webpack',
    'Storybook',
    'Vitest',
    'Vue Test Utils',
    'Jest',
    'Playwright',
    'Testcontainers',
    'Git',
    'GitHub Actions',
    'GitLab CI/CD',
    'Docker',
    'Linux',
    'Nginx',
    'Kubernetes',
    'Helm',
    'Argo CD',
    'Ansible',
    'Terraform',
    'Sentry',
    'Управление командой',
    'Code review',
    'Технические собеседования',
    'Онбординг',
    'Управление релизами',
  ],
  experience: [
    {
      company: 'Lofty',
      position:
        'Frontend-разработчик → Frontend Team Lead → руководитель кросс-функциональной команды',
      startDate: '2024-05-01',
      endDate: '2026-11-01',
      description: `Продукты: Kupikod и PressF.
Май — август 2024: frontend-разработчик. Сентябрь 2024 — август 2025: Frontend Team Lead, 5 разработчиков. Август 2025 — ноябрь 2026: руководитель кросс-функциональной команды, до 13 специалистов в прямом подчинении; после января 2026 — 7. Сохранял участие в разработке: около 60% времени разработки занимал backend.

• Руководил четырёхмесячной миграцией Kupikod с Nuxt/PHP на Astro, React 19 и TypeScript-backend на Bun/Elysia. Новая версия запущена в production. Принимал архитектурные решения, проводил code review, управлял релизами; лично реализовал большую часть авторизации и личного кабинета.
• Разрабатывал frontend и backend: BFF, каталог и обработку заказов. Использовал PostgreSQL, Drizzle ORM и Prisma. Реализовал очереди BullMQ, пакетную передачу заказов в WMS, повторные попытки, идемпотентность, фоновые возвраты для заказов старше 120 минут и вебхуки платёжных систем.
• Разработал административную панель с ролями и правами доступа, Better Auth и входом через Slack. Работал с JWT access/refresh-токенами и ограничением внутренних разделов корпоративным VPN.
• Спроектировал каталог со связями продуктов, игр, тегов и новостей, интеграции с парсерами Steam. Разработал сервис блога на NestJS со статьями, категориями, ролями и правами доступа.
• Работал с PostgreSQL на объёмах до 50 млн уникальных пользователей и 15 млн продуктов, индексами и партиционированием. Создал миграторы legacy-данных с догрузкой изменений и сверкой через отдельную таблицу.
• Устранил причины утечек памяти SSR через профилирование Node.js Inspector. Внедрил кеширование Redis/Nginx: время ответа сократилось примерно с 4 секунд до 150 мс; контейнеры перестали падать из-за выявленных утечек. Проверял результат нагрузочными тестами и мониторингом Blackbox Exporter/Grafana.
• Совместно с руководителем дизайна создал UI-библиотеки Vue/React с дизайн-токенами Figma, приватными npm-пакетами, Storybook и Vitest. Их использовали две продуктовые команды в приложениях более пяти бизнес-доменов.
• Организовал постепенную миграцию frontend на TypeScript, внедрил Vitest/Vue Test Utils с покрытием более 70% и E2E на Playwright. Обучал QA автоматизации. Внедрил обязательный code review и тесты перед выпуском.
• Настроил GitHub Actions с self-hosted runner, динамические GitLab CI pipelines, интеграционные тесты Testcontainers и автоматизированное ревью Claude. Выстроил процесс стенд → preproduction → production.
• Реализовал динамические PR-стенды: отдельные namespaces и адреса, обновление при коммитах, удаление после merge, публикация образов в GHCR, Helm/Argo CD с фиксацией digest и проверкой готовности.
• Автоматизировал legacy-инфраструктуру через Ansible: серверы, Nginx, Docker, iptables, стенды, воркеры и реплики БД. Использовал Terraform для DNS Cloudflare. Совместно с DevOps сопровождал Kubernetes, настраивал Istio, работал с Vault.
• Участвовал в устранении production-инцидентов, настройке WAF и доступа. Мигрировал Redis на Dragonfly, после чего сервис выдерживал нагрузку без достижения CPU 100%. Работал с Prometheus, VictoriaLogs, Grafana, Opsgenie, Sentry и трассировкой.
• Проводил технические собеседования frontend/fullstack-разработчиков, онбординг, сопровождение испытательного срока, встречи 1:1 и индивидуальную обратную связь.`,
    },
    {
      company: 'MPBoost',
      position: 'Frontend-разработчик',
      startDate: '2023-12-01',
      endDate: '2024-05-01',
      description: `Разработка сервиса аналитики маркетплейсов Ozon/Wildberries на Vue 2.7/3, TypeScript, Vite, Vitest и SCSS.

• Перевёл проект с Vue 2.7 на Vue 3.4 и с Webpack на Vite.
• Типизировал проект с TypeScript и добавил автоматическую генерацию типов из Swagger.
• Внедрил покер планирования.
• Писал CI/CD pipelines для unit-, E2E-тестов и typecheck.
• Отвязал проект от Nuxt, переписал SSR на кастомный Node.js-сервер с VitePress.`,
    },
    {
      company: 'Ростелеком',
      position: 'Frontend-разработчик',
      startDate: '2023-02-01',
      endDate: '2023-11-01',
      description: `Разработка CRM B2C на Vue 2.7, JavaScript, LESS и Jest в архитектуре микрофронтендов.

• Разработал с нуля EMP-систему «Конвейер продаж».
• Участвовал в разработке CRM РТК с более чем 250 микрофронтендами.
• Углубился в архитектуру микрофронтендов и веб-компоненты.
• Объединил два UI-kit на Vue 3 и React в один с помощью Lit.`,
    },
    {
      company: 'Like Центр',
      position: 'Frontend-разработчик',
      startDate: '2022-05-01',
      endDate: '2023-01-01',
      description: `Разработка и поддержка проектов на Vue 2/3, JavaScript ES6+, TypeScript и Webpack. Вёрстка лендингов на LESS/SCSS.

• Разработал с нуля международную CRM для стран Латинской Америки.
• Создал онлайн-чат на Socket.io/Pusher с интеграцией WhatsApp.
• Изучил PHP Laravel и разрабатывал CRUD.
• Обучал коллег типизированному коду на TypeScript и тестированию на Vitest.
• Проводил технические собеседования.`,
    },
    {
      company: 'Inventive Retail Group',
      position: 'Frontend-разработчик',
      startDate: '2021-01-01',
      endDate: '2022-05-01',
      description: `Разработка интерфейсов Montblanc и Van Cleef & Arpels, рефакторинг и поддержка проектов, техническая документация, unit-тесты, вёрстка на LESS/SCSS.

• Перевёл проекты на Vue 3.
• Внедрил workflow с unit-тестами и добился покрытия 80% всех проектов.
• Спроектировал и создал собственный UI-kit.
• Работал с архитектурой white label.`,
    },
    {
      company: 'Live Typing',
      position: 'Frontend-разработчик',
      startDate: '2020-02-01',
      endDate: '2021-01-01',
      description: `Разработка и поддержка пользовательских интерфейсов компании, рефакторинг и оптимизация проектов, валидная вёрстка и ведение технической документации.`,
    },
  ],
  projects: [
    {
      name: 'Kupikod',
      websiteUrl: 'https://kupikod.com/',
      description:
        'E-commerce-платформа. Руководил миграцией с Nuxt/PHP на Astro, React 19 и TypeScript-backend на Bun/Elysia. Разрабатывал авторизацию, личный кабинет, BFF, каталог, обработку заказов и платёжные интеграции. Оптимизировал SSR и кеширование: время ответа сократилось примерно с 4 секунд до 150 мс.',
    },
    {
      name: 'PressF',
      websiteUrl: 'https://pressf.com/',
      description:
        'Продукт Lofty. Работал в компании как frontend-разработчик, Frontend Team Lead и руководитель кросс-функциональной команды.',
    },
    {
      name: 'MPBoost',
      websiteUrl: 'https://mpboost.pro/',
      description:
        'Сервис аналитики маркетплейсов Ozon/Wildberries. Миграция Vue 2.7 → Vue 3.4 и Webpack → Vite, внедрение TypeScript и генерации типов из Swagger, настройка CI/CD и тестирования.',
    },
    {
      name: 'Liquidation Market',
      websiteUrl: 'https://liquidationmarket.ru/',
      description: 'Пет-проект: маркет уценённых товаров с аукционами. Стек — NestJS и Next.js.',
    },
  ],
};
