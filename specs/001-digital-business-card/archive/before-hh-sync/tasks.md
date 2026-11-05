# Tasks: Цифровая визитка с админкой

**Input**: `specs/001-digital-business-card/`: spec.md, plan.md, research.md,
data-model.md, contracts/schema.graphql, contracts/behavior.md, quickstart.md.
**Prerequisites**: конституция 1.0.0; согласованный объём и технический план.
**Status**: реализация начата; флажки отражают выполненные проверки.
**Tests**: проверки требуются спецификацией (SC-006) и конституцией; тестовые задачи
проверяют поведение. Для каждого сценария сначала написать проверки, получить ожидаемые
падения из-за отсутствующей функции, затем реализовать и подтвердить прохождение.
**Organization**: номера US соответствуют spec.md; порядок фаз — P1 (US1, US5), затем P2.

## Format: `[ID] [P?] [Story] Description`

Все пути относительно корня репозитория. [P] означает возможность работы в отдельных
файлах после общих предпосылок, а не разрешение пропускать зависимости.
У каждой задачи есть проверяемый результат; закрывать её только после проверки.
Пути ниже обозначают целевые файлы реализации.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Воспроизводимая среда TypeScript/Nest и web без реализации функций.

- [x] T001 Создать npm workspaces в `package.json`, `apps/api/package.json`, `apps/web/package.json`, `.node-version`; закрепить Node24 поддерживаемого patch и npm, проверить выбранные линии Nest12/TS6/Apollo5/GraphQL14 integration/Prisma7/React19/Vite8 по peer dependencies и создать `package-lock.json` без force/legacy-peer-deps; результат — чистый npm ci.
- [x] T002 Настроить backend ESM/NodeNext, strict и decorator metadata в `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`; проверить компиляцию и запуск собранного Nest JS.
- [x] T003 [P] Создать React/Vite skeleton и proxy /graphql,/health в `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/index.html`, `apps/web/src/main.tsx`; проверить независимую сборку web после T001.
- [x] T004 [P] Настроить форматирование, линтер и исключения в `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.dockerignore`; исключить env, node_modules, dist, Prisma/codegen output, кэши и отчёты с чувствительными данными, сохранив миграции и lockfile; после T001.
- [x] T005 Добавить root scripts typecheck/lint/build/test:unit/test:integration/test:contract/test:e2e/db:generate/api:generate в `package.json` и scripts рабочих пакетов; настроить `apps/api/tsconfig.test.json`, `apps/web/vitest.config.ts`, `playwright.config.ts` для node:test после tsc, Vitest и Playwright; проверить минимальный тестовый запуск с metadata после T002–T004.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Общая конфигурация, соединение, ошибки и инфраструктура проверок.

- [x] T006 Реализовать fail-fast конфигурацию в `apps/api/src/config/environment.ts`, `.env.example`: DATABASE_URL, APP_ORIGIN, NODE_ENV, PORT, AUTH_RATE_KEY, CLIENT_IP_MODE, TRUSTED_PROXY_CIDRS; проверить enum direct/trusted-proxy и обязательный валидный не-всеобщий allowlist для trusted-proxy; пример без рабочих секретов, неверный URL/порт/обязательный пустой ключ останавливает старт.
- [x] T007 Настроить Prisma7 ESM generator с output `apps/api/src/generated/prisma`, adapter-pg и migrations в `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`; проверить generate и закрытие соединения при shutdown после T006.
- [x] T008 [P] Создать кодирование ошибок и безопасные логи в `apps/api/src/common/errors.ts`, `apps/api/src/common/request-logging.ts`; коды и fields/requestId по contracts/behavior.md, без паролей, variables, cookies, токенов и DB stack в ответах; после T006.
- [x] T009 [P] Создать общий набор правил контента и clock abstraction в `apps/api/src/common/validation.ts`, `apps/api/src/common/clock.ts`: «Строковые длины считаются по Unicode code points», «Пустая необязательная строка нормализуется в null. Пустая обязательная — ошибка», HTTP/HTTPS URL, UTC календарная дата; unit-проверки в `apps/api/test/unit/validation.test.ts`; после T006.
- [x] T010 Подключить Apollo code-first, Date/DateTime scalars, JSON body 64 KiB, HTTP batching off и schema export без БД в `apps/api/src/graphql/graphql.module.ts`, `apps/api/src/graphql/scalars.ts`, `apps/api/src/cli/export-schema.ts`; экспорт не запускает seed или соединение с БД; после T007–T009.
- [x] T011 Создать изолированную интеграционную test harness в `apps/api/test/helpers/application.ts`, `apps/api/test/helpers/database.ts`, `compose.test.yaml`; миграции тестовой БД, управляемые часы, запрет совпадения с рабочим подключением и teardown без удаления рабочего volume; после T010.
- [x] T012 Реализовать live/ready health, graceful shutdown и проверку конфигурации в `apps/api/src/health/health.controller.ts`, `apps/api/test/integration/health.test.ts`, `apps/api/src/main.ts`; ожидания 200/503 при доступной/недоступной БД и отсутствие утечки конфигурации; после T011.

**Checkpoint**: Собирается Nest-приложение, доступна отдельная тестовая БД и управляемые часы.

## Phase 3: User Story 1 — Проверяющий получает профиль (Priority: P1, MVP)

**Goal**: Публичный GraphQL query профиля и Sandbox без сайта и админки.
**Independent Test**: На тестовых данных выполнить пример задания и name-only query;
проверить null/пустые списки, сортировку и отсутствие приватных полей. До появления
mutations попытка записи отвергается схемой; после US4 повторить отказ по авторизации.

### Tests for User Story 1

- [x] T013 [P] [US1] Написать интеграционные проверки публичного чтения, null/[], одного объекта, сортировки и выбранных полей в `apps/api/test/integration/profile-read.test.ts`; использовать fixture и реальный PostgreSQL, сверять публичную часть contracts/schema.graphql, не требовать будущие mutations.
- [x] T014 [P] [US1] Написать проверки схемы и ограничений в `apps/api/test/contract/public-schema.test.ts`, `apps/api/test/integration/graphql-limits.test.ts`: реальный Sandbox introspection в бюджете 20/2000 и <=3 корневых полей, mixed profile/me queries под 6/50, неизвестные поля, batch off, body/document 64 KiB, aliases/fragments с ранним прекращением обхода, циклы и отсутствие auth storage output полей.

### Implementation for User Story 1

- [x] T015 [US1] Добавить Profile/ProfileLink/Skill/Experience/Project и миграцию `apps/api/prisma/migrations/0001_content/migration.sql` в `apps/api/prisma/schema.prisma`: «PK + CHECK id=1», «UNIQUE(profileId, normalizedName)», «CHECK endDate >= startDate при наличии», UUID дочерних записей, FK RESTRICT, nullable-поля по data-model.md, date/timestamptz и индексы сортировки.
- [x] T016 [US1] Реализовать чтение в `apps/api/src/profile/profile.repository.ts`, `apps/api/src/profile/profile.service.ts`: «sortOrder ASC, createdAt ASC, id ASC», links по position, профиль с 4 связями не более 5 SELECT контента, отсутствующий объект null, списки []; проверка реального числа SQL на 1/100 записей в `apps/api/test/integration/profile-query-count.test.ts`.
- [x] T017 [US1] Реализовать явные GraphQL output types и публичные queries profile/skills/skill/experience/experienceItem/projects/project в `apps/api/src/profile/profile.types.ts`, `apps/api/src/profile/profile.resolver.ts`, `apps/api/src/profile/profile.module.ts`; не отдавать Prisma-модели напрямую; подключить к `apps/api/src/app.module.ts`.
- [x] T018 [US1] Включить embedded Sandbox и introspection в production и ограничения depth=6/expanded fields=50 в `apps/api/src/graphql/graphql.module.ts`, `apps/api/src/graphql/query-limits.ts`; реализовать отдельный pure-introspection бюджет 20/2000 и <=3 корневых полей строго по `specs/001-digital-business-card/contracts/behavior.md`, mixed queries под обычными 6/50; проверить реальные Sandbox requests, alias/fragment обходы и границы бюджетов без отключения защиты.
- [x] T019 [US1] Создать `apps/web/codegen.ts`, первую именованную операцию GetProfile в `apps/web/src/api/profile.graphql` и генерируемый `apps/web/src/api/generated/sdk.ts` через plugins typescript/typescript-operations/typescript-graphql-request; добавить graphql-request и Codegen dependencies, strictScalars с Date/DateTime=string, getSdk и gitignore output; связать Prisma→compile API→export schema→SDK codegen→web build и api:generate в `package.json`, проверить полный build раннего MVP без живой БД; добавить браузерный smoke Sandbox в `e2e/sandbox.spec.ts` и минимальный пример query в `README.md`; пройти T013–T014,T016 и подтвердить чтение через настоящий Sandbox, а не только HTTP-клиент.

**Checkpoint**: Публичный backend проверяем на fixtures; это первый технический MVP.

## Phase 4: User Story 5 — Проверяющий воспроизводит запуск (Priority: P1)

**Goal**: Docker-запуск с начальным контентом и повторная подготовка без потери правок.
**Independent Test**: Чистый volume → setup → профиль; изменить и удалить fixture напрямую
в test harness, дважды повторить setup, перезапустить app; данные неизменны.
UI-проверка сохранности после CRUD повторяется в US4, не блокирует этот этап.

### Tests for User Story 5

- [x] T020 [P] [US5] Написать seed-проверки в `apps/api/test/integration/seed.test.ts`: пустая БД, существующий профиль без маркера, повторный вызов после правок/удаления, rollback и два конкурентных запуска; ничего не восстанавливается и не дублируется.
- [x] T021 [P] [US5] Создать smoke-сценарий чистого Compose project в `e2e/docker-startup.test.mjs`: ожидание setup/health, миграции и profile query, отказ запуска app при неудачном setup, сохранность volume после рестарта.

### Implementation for User Story 5

- [x] T022 [US5] Добавить SeedState «version=1, appliedAt», «PK version» в `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/0002_seed_state/migration.sql`; реализовать транзакционный advisory-lock seed в `apps/api/src/cli/seed.ts` с правилами data-model.md.
- [x] T023 [US5] Подготовить явно обозначенный демонстрационный контент в `apps/api/src/cli/seed-data.ts`, применять общие правила валидации из T009; повторный seed не меняет администратора или контент, отсутствие реальных данных не маскировать.
- [x] T024 [US5] Создать multi-stage non-root image в `Dockerfile`, закрепить Node Debian slim image, Prisma generation/ESM compile/schema export/codegen/web build из T019 и runtime Argon2; добавить setup/release scripts в `apps/api/package.json`; проверить сборку и наличие необходимых runtime файлов после T019 и T022–T023.
- [x] T025 [US5] Создать db/setup/app в `compose.yaml`, named volume и health/dependency ordering; добавить env-настройки локальной БД в `.env.example`, запуск согласно quickstart.md; проверить T020–T021, два повторных setup и restart.
- [x] T026 [US5] Документировать запуск, миграции, seed, сборку, env, ошибки setup и безопасное сохранение volume в `README.md`; реально пройти текущие применимые шаги `specs/001-digital-business-card/quickstart.md`, фиксируя результаты в `specs/001-digital-business-card/validation.md`, без отметки ещё не реализованной авторизации.

**Checkpoint**: Воспроизводимый backend MVP с Sandbox и данными без ручной подготовки таблиц.

## Phase 5: User Story 2 — Публичный сайт (Priority: P2)

**Goal**: Посетитель читает визитку без GraphQL-знаний.
**Independent Test**: Открыть сайт с подготовленными данными на 360/1440 px;
проверить тексты, ссылки, loading/error/empty и клавиатуру без админки.

### Tests for User Story 2

- [x] T027 [P] [US2] Написать проверки состояния страницы и безопасного текста в `apps/web/test/profile-page.test.tsx` и браузерную проверку 360/1440, клавиатуры и ссылок в `e2e/public-profile.spec.ts`; данные через fixture, ошибки и задержки через контролируемый transport.

### Implementation for User Story 2

- [x] T028 [US2] Подключить getSdk из T019 к единому GraphQLClient в `apps/web/src/api/client.ts`, credentials=include и X-App-Request: web, динамический CSRF из памяти, нормализацию HTTP/GraphQL/сетевых ошибок; тесты в `apps/web/test/api-client.test.ts` для HTTP200/errors, отсутствия автоповтора mutations и утечки variables в логи; использовать sdk.GetProfile(), без ручных DTO/fetch в компонентах и без секретов в localStorage.
- [x] T029 [US2] Создать страницу и компоненты в `apps/web/src/pages/ProfilePage.tsx`, `apps/web/src/components/ProfileSections.tsx`, `apps/web/src/styles.css`: реальные значения, пустые списки/null profile, retry, отсутствие пустых ссылок, безопасный текст, noopener/noreferrer, адаптивность и видимый focus.
- [x] T030 [US2] Подключить маршрутизацию и production static serving в `apps/web/src/router.tsx`, `apps/api/src/web/web.module.ts`, `apps/api/src/app.module.ts`; исключить /graphql и /health из SPA fallback и проверить прямой переход/refresh маршрута.
- [x] T031 [US2] Выполнить T027 на собранном Docker app и зафиксировать результаты в `specs/001-digital-business-card/validation.md`; проверить, что публичный сайт и Sandbox читают одни данные.

**Checkpoint**: Публичный сайт завершён, авторизация не нужна для его проверки.

## Phase 6: User Story 3 — Вход и выход администратора (Priority: P2)

**Goal**: Отзываемый доступ на 24 часа с защитой входа и будущих изменений.
**Independent Test**: CLI create → login → me → refresh → logout/expiry; проверить
прямой защищённый тестовый resolver в harness, не добавляя тестовую операцию в production.

### Tests for User Story 3

- [ ] T032 [P] [US3] Написать интеграционные проверки login/me/logout/cookies/expiry/reset в `apps/api/test/integration/auth.test.ts`: одинаковый отказ для неверного email/пароля, абсолютные 24 часа, отзыв после выхода, отсутствие token/hash в ответах и no-store; часы управляемые.
- [ ] T033 [P] [US3] Написать Origin/CSRF/CORS и конкурентные rate-limit проверки в `apps/api/test/integration/auth-security.test.ts`: 5 ошибок/15 минут отдельно по IP/email, перезапуск, dummy hash, direct с игнорированием forwarded headers, trusted-proxy allowlist и обход справа налево, IPv4-mapped IPv6, недоверенный peer, malformed chain, spoofed X-Forwarded-For, неизвестный Origin, пропущенные заголовки, GET mutation и доступ без сессии.

### Implementation for User Story 3

- [ ] T034 [US3] Добавить Admin/Session/LoginAttemptWindow в `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/0003_auth/migration.sql`: Admin «CHECK id=1; UNIQUE normalizedEmail», Session «UNIQUE tokenHash; FK Admin; индекс expiresAt», nullable revokedAt, keyHash PK и windowStartedAt/failureCount; FK RESTRICT и серверные UUID.
- [ ] T035 [US3] Реализовать Argon2id и CLI create/reset в `apps/api/src/auth/password.service.ts`, `apps/api/src/cli/admin-create.ts`, `apps/api/src/cli/admin-reset-password.ts`: email до 254, нормализация «trim + Unicode NFC + lowercase», пароль «12–128 символов» без trim/normalize, скрытый ввод, повторный create отказывает, reset атомарно отзывает все сеансы; добавить scripts в `apps/api/package.json`.
- [ ] T036 [US3] Реализовать сессии и cookies в `apps/api/src/auth/session.repository.ts`, `apps/api/src/auth/session.service.ts`: token и csrfToken «32 случайных байта», хранение SHA-256(token), ACTIVE «revokedAt=null и now < expiresAt», срок 24 часа без продления, production __Host-session/local session-dev и очистка cookie после logout.
- [ ] T037 [US3] Реализовать транзакционные два HMAC-ключа IP/email и advisory locks в стабильном порядке в `apps/api/src/auth/login-limiter.repository.ts`, `apps/api/src/auth/login-limiter.service.ts`; 5 ошибок/15 минут, успех не сбрасывает окно, retryAfterSeconds и timeout для Argon2 под lock; добавить cleanup ограниченными batch для истёкших окон/сеансов в `apps/api/src/auth/auth-cleanup.service.ts`.
- [ ] T038 [US3] Реализовать login/me/logout, guard и Origin/CSRF/CORS в `apps/api/src/auth/auth.resolver.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/session.guard.ts`, `apps/api/src/auth/csrf.guard.ts`, `apps/api/src/auth/auth.module.ts`, `apps/api/src/main.ts`; X-App-Request: web для mutations, X-CSRF-Token для защищённых, точный APP_ORIGIN, no-store и извлечение IP в `apps/api/src/auth/client-ip.ts` по CLIENT_IP_MODE/TRUSTED_PROXY_CIDRS из contracts/behavior.md (без trust proxy=true или hop count); проверить T032–T033.
- [ ] T039 [US3] Создать login форму, состояние me, выход и защиту admin-маршрутов в `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/pages/AdminLayout.tsx`, `apps/web/src/api/auth.graphql`, `apps/web/src/auth/AuthProvider.tsx`, `apps/web/src/router.tsx`; регенерировать SDK для Login/Me/Logout после T038; cookie credentials, CSRF только в памяти с обновлением заголовка на каждый вызов и очисткой после logout/expiry, проверить смену токена при повторном входе; ошибки/ожидание, сохранение входа после refresh, без автоматической отправки отложенной mutation после нового входа.
- [ ] T040 [US3] Добавить и пройти браузерный сценарий вход/refresh/logout/ограничение в `e2e/auth.spec.ts`; пройти expiry/reset и direct guard проверки T032–T033; показать, что неавторизованный доступ не зависит от скрытия кнопок.
- [ ] T041 [US3] Дополнить `README.md` рабочими командами create/reset, cookie jar без пароля в shell arguments и локальной проверкой защищённых сценариев; записать результаты в `specs/001-digital-business-card/validation.md`.

**Checkpoint**: Авторизация защищает реальные серверные операции; публичный просмотр работает как прежде.

## Phase 7: User Story 4 — Редактирование и CRUD (Priority: P2)

**Goal**: Владелец меняет контент из админки, результат доступен публично.
**Independent Test**: С готовым администратором изменить профиль и выполнить CRUD
каждого типа; проверить ошибки, порядок, удаление и сохранность после restart/setup.

### Tests for User Story 4

- [ ] T042 [P] [US4] Написать contract/integration CRUD проверки в `apps/api/test/integration/content-write.test.ts`: все mutations из SDL, отказ без входа/после выхода, атомарная замена links, null/полная форма update, NOT_FOUND/CONFLICT, стабильный порядок, Unicode/даты/URL и rollback ошибочного сохранения.
- [ ] T043 [P] [US4] Написать UI-проверки в `apps/web/test/admin-forms.test.tsx` и `e2e/content-management.spec.ts`: CRUD трёх типов, профиль, подтверждение/отмена удаления, ошибки полей с сохранением ввода, двойной click, потерянный ответ без автоповтора, истечение сеанса и публичное чтение в отдельном контексте.

### Implementation for User Story 4

- [ ] T044 [US4] Создать full-form inputs в `apps/api/src/profile/content.inputs.ts` и бизнес-правила в `apps/api/src/profile/content-validation.ts`: имя 1–120, описание профиля 1–5000, специализация до 160; skill 1–80; company/position 1–160, описание опыта до 5000; проект name 1–160, description 1–5000; label 1–80, HTTP/HTTPS URL до 2048; sortOrder «Целое число 0–9999; совпадения разрешены»; начало обязательно, конец nullable/не раньше начала, обе даты не в будущем; quote-policy «пропущенное nullable-поле очищается в null».
- [ ] T045 [US4] Реализовать updateProfile в `apps/api/src/profile/profile.repository.ts`, `apps/api/src/profile/profile.service.ts`, `apps/api/src/profile/profile.resolver.ts`: профиль не создаётся неявно, links заменяются целиком атомарно в порядке массива, NOT_FOUND при отсутствии, только авторизованный вызов.
- [ ] T046 [US4] Реализовать skills CRUD в `apps/api/src/profile/skills.repository.ts`, `apps/api/src/profile/skills.service.ts`, `apps/api/src/profile/skills.resolver.ts`: UNIQUE(profileId, normalizedName), нормализация имени без учёта регистра, CONFLICT при гонке, физическое удаление, принадлежность профилю и guard; после T044–T045.
- [ ] T047 [P] [US4] Реализовать experience CRUD в `apps/api/src/profile/experience.repository.ts`, `apps/api/src/profile/experience.service.ts`, `apps/api/src/profile/experience.resolver.ts`: date без времени, текущая работа при null endDate, полная форма, проверка итоговых дат, NOT_FOUND и guard; после T044–T045, параллельно T046.
- [ ] T048 [P] [US4] Реализовать projects CRUD в `apps/api/src/profile/projects.repository.ts`, `apps/api/src/profile/projects.service.ts`, `apps/api/src/profile/projects.resolver.ts`: nullable URL очищаются, сервер не загружает URL, NOT_FOUND, last successful write wins и guard; после T044–T045, параллельно T046–T047.
- [ ] T049 [US4] Зарегистрировать все providers/resolvers в `apps/api/src/profile/profile.module.ts`, добавить полный schema comparison и проверку operations в `apps/api/test/contract/schema.test.ts`; после T046–T048 пройти T042 и убедиться, что ни одна mutation не обходится без сессии/CSRF.
- [ ] T050 [US4] Создать формы профиля/links/skill/experience/project, списки и typed mutations в `apps/web/src/pages/admin/ProfileEditor.tsx`, `SkillsPage.tsx`, `ExperiencePage.tsx`, `ProjectsPage.tsx` в той же директории, `apps/web/src/components/ConfirmDelete.tsx`, `apps/web/src/api/content.graphql`; дать операциям имена CreateSkill/UpdateSkill/DeleteSkill и аналогичные для остальных сущностей, регенерировать SDK после T049, обращаться через единый client.ts; UI constraints из T044, readonly id, сортировка, pending/errors, keyboard/focus, перечитывание после успеха; связать с `apps/web/src/router.tsx`.
- [ ] T051 [US4] Пройти T043 и публичное чтение после изменений, затем два setup и restart без восстановления удалённого контента; проверить прямое обновление /admin/projects и существование null-полей после очистки; результаты записать в `specs/001-digital-business-card/validation.md`.

**Checkpoint**: Все пользовательские функции работают вместе и покрыты сценариями приёмки.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Полная проверка, реальные данные и подготовка сдачи.

- [ ] T052 Добавить CI без автоматического deploy в `.github/workflows/ci.yml`: npm ci, Prisma generate, api:generate (экспорт актуальной SDL + SDK), typecheck/lint/build, unit/integration/contract/e2e с отдельной PostgreSQL, browser dependencies и сборка Docker; проверить успешный прогон и отсутствие секретов в artifacts.
- [x] T053 Заменить демонстрационный контент в `apps/api/src/cli/seed-data.ts` на предоставленные владельцем сведения, проверить URL/даты/тексты и новый чистый запуск; не выдумывать данные и не перезаписывать существующую визитку seed, для уже заполненной базы использовать админку; результат в `specs/001-digital-business-card/validation.md`.
- [ ] T054 Оформить финальный `README.md`: архитектура и альтернативы, TS/Nest стек, scripts, зависимости, ограничения API, auth, seed, локальный запуск, проверки и способ оценки админки; удалить временный Sync Impact Report из `.specify/memory/constitution.md` перед её коммитом, не менять принципы.
- [ ] T055 Подготовить инструкции Render Docker + managed PostgreSQL и release в `docs/deployment.md`, параметры image/env/health, CLIENT_IP_MODE=trusted-proxy и явный ingress IP/CIDR allowlist с источником подтверждения, миграции до старта и вариант без pre-deploy; проверить production image локально, включая Secure cookie через HTTPS и Sandbox, подготовить проверки двух известных источников, spoofed X-Forwarded-For и отсутствия обходного пути по contracts/behavior.md; при неподтверждённом ingress production-вход блокируется; не заказывать тариф и не публиковать автоматически.
- [ ] T056 После предоставления аккаунта/домена и разрешения на публикацию развернуть подготовленный image, выполнить release, подтвердить на сервисе ingress allowlist и IP-проверки из T055 до включения входа, создать администратора, проверить публичный URL/Sandbox/защиту, добавить фактические ссылки сайта, Sandbox и доступного проверяющему Git-репозитория в `README.md`; результаты в `specs/001-digital-business-card/validation.md`.
- [ ] T057 Выполнить полный `specs/001-digital-business-card/quickstart.md` на чистом checkout и все SC-001–SC-006, сопоставить результаты с spec.md и контрактами; в `specs/001-digital-business-card/validation.md` указать фактические команды, результаты, ограничения и оставшиеся задачи, закрывать флажки только по доказанному выполнению.

## Дополнение владельца — интерактивная визитка

- [x] T058 [US2] Заменить линейную публичную страницу тёмным интерактивным интерфейсом с оригинальным спрайтом владельца: приветствие, idle/wave/talk/think, выбор маршрута, рассказы при hover/focus, подробности по click/tap, поиск навыков, контакты, keyboard navigation, reduced motion и ручная пауза. Проверить 360/1440px и настоящий touch, исключить перекрытие контента закреплённым проводником; собрать и запустить Docker. Описание: `docs/interactive-portfolio.md`.
- [x] T059 [US2] Добавить арканоид навыков: мышь, pointer capture для пальца, клавиатура, столкновения, исчезновение блоков, волны, три попытки, пауза и сброс; сохранить поиск и данные профиля. Проверить физику, mouse/touch E2E, responsive UI и Docker. Описание: `docs/interactive-portfolio.md`.

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup T001–T005 → Foundation T006–T012 → US1 T013–T019 → US5 T020–T026
                                                        ↓
                                          US2 T027–T031 → US3 T032–T041
                                                               ↓
                                                        US4 T042–T051
                                                               ↓
                                                     Polish T052–T057
```

Это безопасный последовательный путь. API авторизации можно разрабатывать после US1,
не дожидаясь UI US2; T039 требует routing/client из T028–T030. US4 зависит от US1 моделей
и US3 guards, а его UI — от US2/US3. US5 не требует CRUD: правки для seed-теста создаёт fixture.
US1 не требует US5: тестовая БД наполняется fixture, после US5 получает штатный seed.
T019 создаёт codegen/build pipeline и первую операцию GetProfile до T024;
T028 подключает graphql-request transport к готовому SDK. Ранний Docker image
собирает web skeleton и SDK с GetProfile, не зависит от будущего UI US2.

### Within Each User Story

Тесты → модели/миграции → репозитории и сервисы → интерфейсы → интеграционная проверка.
Если используются общие файлы (Prisma schema, app.module, package.json, router), изменения
в них выполняются последовательно. Тестовая задача в начале фазы считается завершённой,
когда тесты корректно описывают поведение и ожидаемо падают; checkpoint требует их прохождения.
Контрактная проверка US1 ограничена публичной частью; полное сравнение SDL включается в T049.

### External Dependencies

T053 требует реальных сведений владельца. T056 требует готового развёртывания T055,
доступа к хостингу/Git и разрешения публикации. До этого локальные задачи продолжаются;
отсутствие внешних данных не подменяется выдуманными значениями или отметкой «выполнено».

## Parallel Examples

- Setup: после T001 — T003 и T004; T005 ждёт обоих и T002.
- Foundation: после T006 — T008 и T009, одновременно с T007; T010 ждёт всех трёх.
- US1: T013 и T014 — разные тестовые файлы после Foundation.
- US5: T020 и T021 — разные проверки после US1; последовательная правка Compose в T025.
- US2: T027 можно писать одновременно с T028, обе задачи опираются на готовый публичный контракт.
- US3: T032 и T033 — разные тестовые файлы; интеграция security в main.ts только в T038.
- US4: T042 и T043 — независимые проверки; после T044–T045 — T046, T047 и T048
  в отдельных файлах, регистрация всех providers выполняется затем одной задачей T049.

## Requirement Coverage

| Требования | Задачи |
|---|---|
| FR-001, FR-002 | T013–T019, T056 |
| FR-003 | T027–T031 |
| FR-004 | T032, T034–T036, T038–T041 |
| FR-005 | T033, T037–T038 |
| FR-006 | T014, T032–T033, T038, T042, T049 |
| FR-007 | T042, T044–T045, T050–T051 |
| FR-008, FR-009 | T015–T017, T042, T044, T046–T051 |
| FR-010 | T008–T009, T042, T044–T049 |
| FR-011 | T043, T050–T051 |
| FR-012 | T020–T026, T043, T051 |
| FR-013 | T020–T026 |
| FR-014 | T026, T035, T041, T054–T057 |
| FR-015 | T027, T029, T039–T040, T043, T050–T051 |
| SC-001–SC-006 | Story checkpoints, T052, T057 |

## Implementation Strategy

1. Сначала T001–T019: технический MVP — чтение реальных связей через GraphQL/Sandbox.
2. T020–T026: воспроизводимый backend MVP, который проверяющий запускает по README.
3. Добавить публичный сайт, затем вход, затем защищённое управление контентом.
4. После каждого checkpoint проверить результат и сделать небольшой осмысленный коммит,
   если фиксация изменений включена в текущую работу; не объединять всё в один большой коммит.
5. Завершить CI, контент, документацию и развёртывание; готовность определяют результаты,
   а не наличие всех файлов или число закрытых задач.
6. Перед реализацией провести speckit-analyze по spec.md/plan.md/tasks.md.
   Создание этого списка не запускает реализацию.
