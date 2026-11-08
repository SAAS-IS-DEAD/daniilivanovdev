# Результаты проверок

## Начальная настройка — 2026-11-04

- Среда: Node 24.22.2, npm 11.21.1, Docker Engine 28.4.0.
- T001–T004: workspace, ESM/metadata, web skeleton, lint/ignore настроены.
- npm ci --no-audit --no-fund: успешная чистая установка из lockfile.
- npm run typecheck, npm run lint, npm run build: успешно.
- npm run test:unit: backend metadata test — 1 passed; frontend тестов пока нет.
- Скомпилированный Nest запущен отдельно на порту 4317, HTTP отвечает 404 на /
  (ожидаемо для skeleton без маршрутов). Временный процесс остановлен после проверки.
- T005: scripts интеграции/контракта/генерации добавлены; их целевые тесты и конфигурация
  будут реализованы в следующих задачах. Эти scripts пока не проверены запуском;
  заглушки успешных тестов не добавлены. Минимальный запуск metadata test прошёл.
- npm audit: 11 moderate записей в development lint dependency tree (minimatch).
  Автоматические предложенные downgrade несовместимы с выбранным стеком и не применялись.
  Runtime npm audit --omit=dev ещё требует отдельной проверки при расширении зависимостей.
- Приложение ещё не реализует GraphQL, базу, авторизацию или CRUD. Деплой не выполнялся.


## Публичный API и seed — 2026-11-04

- T006–T019: PostgreSQL adapter, migrations, health, публичные queries и Codegen реализованы.
- npm run build: Prisma → TypeScript API → SDL export → SDK → Vite, успешно без DATABASE_URL.
- npm run typecheck и npm run lint: успешно.
- npm run test:unit: 14 backend checks passed; frontend tests ещё не реализованы.
- npm run test:contract: публичные типы совпадают с плановым SDL, 1 passed.
- npm run test:integration: 5 passed после добавления seed; тестовая БД card_test на 55437,
  миграции применяются автоматически. SQL-count подтверждён для 1 и 100 записей.
- E2E_BASE_URL=http://localhost:4317 npx playwright test e2e/sandbox.spec.ts: 1 passed,
  Chromium 156.0.8078.4. Настоящий embedded Sandbox загрузил схему и выполнил
  SandboxSmoke через редактор; результат совпал с контрольным HTTP-запросом.
- T020–T023: тест сначала упал из-за отсутствия seed/model, затем прошёл.
  Проверены пустая база, профиль без маркера, правки/удаление, два одновременных вызова,
  два повторных вызова и реальный rollback при сбое INSERT маркера через test trigger.
- npm audit --omit=dev: 0 vulnerabilities. Полный development audit ранее показывал
  предупреждения; итоговый аудит инструментов разработки ещё не завершён.
- Codegen documentMode=documentNode вместо string: string в установленной комбинации
  генерировал необъявленный TypedDocumentString. Сгенерированный SDK компилируется.
- Docker-сценарий написан сначала и ожидаемо упал до появления compose.yaml.
  Факт успешного прогона будет добавлен после сборки образов.


## Docker и публичный сайт — 2026-11-04

- Первая полная Docker-сборка прошла на Linux arm64 с Node24.22.2; setup и runtime
  работают от пользователя node. Argon2id hash/verify проверен внутри Linux build stage.
- node --test e2e/docker-startup.test.mjs: первый прогон 1 passed, 32 сек.
  Чистый volume, migration/seed, два setup, restart и сохранность правок/удаления;
  искусственная failed migration не позволяет стартовать app. Test volume удалён.
- Добавлен безопасный GraphQL exception filter и correlation requestId; malformed JSON
  не отражает введённые значения. Интеграционных проверок теперь 6, все прошли.
- Уточнены границы pure-introspection: 3 корневых поля, 20 уровней, 2000 occurrences;
  unit-проверки включают точные допустимые/запрещённые границы. Backend unit: 15 passed.
- Frontend использует единый SDK transport, актуальный CSRF header из памяти, credentials,
  безопасную нормализацию ошибок без сохранения ClientError/variables или автоматических retries.
- Frontend unit: 5 passed — loading/error/retry/empty, безопасный текст, внешние ссылки,
  смена CSRF, сетевые ошибки, реальный browser endpoint.
- Локальные E2E сайта: 360/1440px, текст совпадает с API, refresh и клавиатура — 2 passed.
  Sandbox после добавления static middleware — 1 passed. Скриншоты обеих ширин просмотрены.
- Исправления по браузерным тестам: raw adapter middleware сохраняет пути assets и
  исключает /graphql,/health; GraphQLClient получает абсолютный URL текущего origin.
- npm run typecheck, npm run lint и повторная сборка frontend — успешно.
- Codegen вручную проверен на временной операции с отсутствующим fieldNotInSchema:
  завершился ошибкой валидации поля; временная операция удалена.
- Данные демонстрационные. Авторизация, CRUD, CI и deploy ещё не реализованы.


## Итог текущего этапа и ограничение среды

- T001–T030 завершены. T031 оставлена открытой: повторная браузерная проверка именно
  финального Docker image заблокирована недоступностью Docker daemon.
- Финальные setup/runtime images собраны успешно, включая SDK, frontend и Argon2id.
- Локальный E2E SPA refresh/API exclusion: 1 passed; вместе с предыдущими прогонами
  проверены 4 browser cases (две ширины, маршруты, настоящий Sandbox).
- На диске обнаружено 328 MiB свободного места. Удалён только скачанный в этой сессии
  полный Chromium1248 (366 MiB); используемый headless shell сохранён. Свободно 696 MiB,
  Docker daemon всё ещё не отвечал на команды в течение 15 секунд.
- Финальный node --test e2e/docker-startup.test.mjs прерван после зависания Docker.
  Его нельзя считать прошедшим. Ранее тот же startup/seed/restart/failure сценарий без
  встроенного browser-run прошёл. Проверки API/SDK/сайта локально прошли отдельно.
- Возможно остался изолированный test project card-smoke-1793809384124: cleanup тоже
  заблокирован daemon. После восстановления Docker удалить только этот project командой:
  `docker compose -p card-smoke-1793809384124 -f compose.yaml down -v --remove-orphans`
  (с заполненным .env), затем повторить `node --test e2e/docker-startup.test.mjs`.
- Автокоммит after_implement выключен в конфигурации Spec Kit; изменения не коммитились.
- Следующий функциональный этап — T032–T041: сессии, вход/выход и CLI администратора.
  Перед ним закрыть Docker-проверку T031. Публикация не выполнялась.


## Восстановление Docker и запуск — 2026-11-04

- По просьбе владельца очищены npm download cache, npx cache старше 30 дней,
  неиспользуемый Docker build cache (10.08 GB по отчёту Docker) и dangling images
  (1.474 GB). Рабочие volumes и исходные файлы сохранены.
- Зависший Docker Desktop восстановлен перезапуском процессов; штатный restart
  первоначально завершился по timeout. После запуска daemon отвечает нормально.
- Остатки test project card-smoke-1793809384124 удалены вместе с его тестовым volume.
- Создан локальный .env с случайными секретами, правами 0600; файл исключён из Git.
- docker compose up -d --wait --wait-timeout 120: успешно. App/db healthy,
  сайт http://localhost:3000, Sandbox http://localhost:3000/graphql. Проект оставлен запущенным.
- HTTP /, /graphql, /health/ready: 200. Публичный GraphQL query вернул профиль.
- node --test e2e/docker-startup.test.mjs: 1 passed, 44 сек; включённый browser-run:
  4 passed (360/1440, SPA/API exclusion, настоящий Sandbox). Повторные setup/restart
  сохраняют правки/удаление; ошибка миграции блокирует app; тестовый project удалён.
- Ограничение предыдущего этапа снято, T031 закрыта. На диске после очистки и запуска
  доступно около 9 GiB. Авторизация/CRUD остаются следующими задачами.


## Данные владельца из резюме — 2026-11-04

- По прямому поручению владельца использованы три версии front/lead/full-stack из Downloads.
  Сопоставление и правила объединения: docs/resume-content.md.
- T053 выполнена: реальный профиль, 49 навыков, 6 мест работы, 4 проекта, 3 ссылки,
  email/телефон и сведения о языках/образовании. Дата рождения/метро не опубликованы.
- resume-data.ts хранит исходные данные для seed; seed-data.ts применяет общую валидацию.
  Даты с точностью до месяца хранятся первым числом; UI показывает месяц/год.
- Существующая локальная демозапись заменена атомарной транзакцией после сохранения
  artifacts/profile-before-resume-import.json (0600, игнорируется Git). Обычный seed
  по-прежнему не перезаписывает заполненную базу.
- npm run build, typecheck, lint: успешно; frontend unit: 5 passed.
- Docker images пересобраны, compose app/db healthy; текущая визитка остаётся на :3000.
- node --test e2e/docker-startup.test.mjs: 1 passed (40 сек), browser: 4 passed.
  Чистая БД наполняется реальным профилем; повторный setup/restart сохраняет правки.
- Отдельно проверена текущая рабочая визитка: GraphQL возвращает реальные данные,
  даты на странице отображаются до месяца; screenshots 1440/360 просмотрены,
  горизонтальной прокрутки нет. Внешние ссылки не проверялись на доступность.


## Интерактивный дизайн с персонажем — 2026-11-04

- T058 выполнена по новому запросу владельца. Оригинальный спрайт скопирован без изменения,
  анимация использует foot anchors из character-demo.html. Новых runtime dependencies нет.
- Публичная страница заменена тёмной сценой и навигацией по историям. Данные профиля
  по-прежнему читаются через SDK; изменений существующей базы не выполнялось.
- Добавлены greeting/idle/talk/think, речь при hover/focus, подробности по click/tap,
  поиск навыков, контакты и копирование email, ручная пауза и prefers-reduced-motion.
- TypeScript и ESLint: успешно. Frontend unit: 6 passed. Docker images собраны,
  app/db healthy; обновлённое приложение оставлено на http://localhost:3000.
- npm run test:e2e против Docker app: 7 passed (6.5 сек), включая Sandbox.
  Проверены 360/1440px, клавиатура, наведение, смена кадров, пауза, reduced motion,
  touch-навигация, карточка проекта, контакты и исключения SPA/API.
- Исправлены найденные при проверке нюансы: эффект начального фокуса в StrictMode
  и перекрытие заголовка длинной репликой на мобильном. Touch-тест проверяет координаты
  кнопки возврата относительно проводника. Финальные screenshots desktop/mobile просмотрены.


## Неоново-розовая палитра Mogny — 2026-11-04

- Палитра сверена с локальным проектом mog: rose-токены и почти чёрные поверхности;
  акцент усилен до #ff5ba7. Перекрашены фон, карточки, реплики, кнопки и эффекты.
- Сборки frontend и Docker успешны; обновлённый app healthy на localhost:3000.
- Desktop/mobile screenshots просмотрены; существующие 7 E2E прошли (17.8 сек).


## Возврат исходных цветов — 2026-11-04

- По просьбе владельца неоново-розовая тема отменена. Восстановлен точный styles.css
  из предыдущего setup image 6f27626453e9; runtime 59b1a754455f снова запущен на :3000.
- Зелёно-графитовая палитра и бежевое окно речи возвращены; интерактивность сохранена.
- Web build успешен, compose app healthy. Проверка computed styles в браузере:
  accent #e8c18c, dialogue rgb(238,229,212). Данные базы не менялись.

## Арканоид навыков — 2026-11-04

- Реализованы волны блоков из GraphQL skills, столкновения, три попытки и повторная партия.
- Финальное управление по уточнению владельца: клик по полю запускает/продолжает,
  уход мыши ставит на паузу; touch удерживается для игры, отпускание ставит на паузу.
  Отдельные кнопки управления и переключатели убраны, список с поиском всегда снизу.
- Web unit: 10/10; build/TypeScript и ESLint успешны.
- Playwright: 9/9 на работающей Docker-сборке, включая столкновение с исчезновением
  блока, паузу при уходе мыши, возобновление кликом, клавиатуру и настоящий touch drag.
- Docker Compose app/db healthy, сайт на http://localhost:3000. Данные профиля не менялись.

## Изменение объёма: hh.ru вместо админки — 2026-11-04

- Источник владельца: приватная ссылка hh.ru (удалена из текущей документации)
- Один HTTP GET без авторизации вернул 403 text/html (title HeadHunter), а не данные
  резюме. Web open также не смог открыть ссылку. Браузерный host недоступен.
  Нельзя заключить, что ссылка недоступна владельцу или всем посетителям.
- Официальная документация https://api.hh.ru/openapi/redoc описывает OAuth для
  GET /resumes/{resume_id}; API отмечен альтернативой, доступ не подключён.
- Spec/plan/tasks и README обновлены; T032–T051 отменены, T060–T067 добавлены.
  Прежнее проектирование архивировано, контракт GraphQL ограничен публичным чтением.
- Worker и live-парсер не реализованы; текущая база и сайт не изменялись.
- После обновления контракта `npm run test:contract` прошёл: публичные типы и queries
  соответствуют контракту без админки (1/1).

## Biome вместо Prettier и ESLint — 2026-11-04

- Установлен и закреплён @biomejs/biome 2.6.5. Удалены прямые зависимости prettier,
  eslint, @eslint/js, typescript-eslint, globals и три старых конфигурационных файла.
- Настройки перенесены официальными migrate prettier / migrate eslint --include-inspired.
  Сохранены 2 пробела, одинарные JS-кавычки, trailing commas и lineWidth=100.
  Включён parser параметрических декораторов Nest; import assists выключены.
- Мигратор не поддерживает точные аналоги no-invalid-regexp, no-unexpected-multiline,
  @typescript-eslint/no-unused-expressions и @typescript-eslint/triple-slash-reference.
  Сохранён TypeScript typecheck; полной эквивалентности наборов правил не заявляем.
- Единственное новое замечание useErrorCause в health/readiness подавлено локально
  с объяснением: исходная ошибка БД намеренно не переносится в публичную диагностику.
- Обновлены lint, lint:fix, format, format:check, check и README. Biome переформатировал
  8 файлов; функциональные изменения не вносились.
- Успешны check, lint, format:check, полный build (Prisma/schema/SDK/web), typecheck,
  unit 25/25 и contract 1/1. npm ls и lockfile согласованы; версия Biome закреплена.
- Задачи hh.ru остаются на паузе по указанию владельца; работа по ним не продолжалась.

## Обязательное тестирование — 2026-11-05

- Добавлены unit-тесты дат GraphQL, публичных ошибок, UUID сервисов, seed mapping;
  компонентные тесты персонажа, reduced motion, игрового управления/cleanup,
  навигации, проектов, контактов/clipboard, поиска, безопасных ссылок и API ошибок.
- Добавлены backend integration с настоящей card_test PostgreSQL: все списки/detail,
  стабильный порядок, null/date, невалидные IDs, ограничения БД и rollback,
  HTTP/CORS/correlation, отсутствие mutations, раздача SPA и исключения API/ассетов.
- Regression first: api-client отвергал неизвестные коды, но ошибочно принимал
  toString/__proto__/constructor через `in`. Новый тест упал; Object.hasOwn исправил
  проблему, тест затем прошёл. Другие изменения продуктового кода: injectable WEB_ROOT
  для проверки раздачи настоящих файлов в изолированной временной директории.
- `npm run verify` успешен: полный build, Biome, typecheck, 37 backend unit,
  10 backend integration, 1 contract и 37 frontend unit/component — всего 85.
- V8 frontend: lines 98.29%, statements 97.01%, functions 95.14%, branches 89.54%.
  Node backend (исполненный compiled JS, включая decorator helpers): lines 96.79%,
  functions 95.17%, branches 75.62%. Границы измерения описаны в docs/testing.md.
- Добавлены пороги покрытия, общий verify и GitHub workflow. Удалённый CI не запускался;
  его команды выполнены локально, branch protection не менялся.
- Docker пересобран, app/db healthy; все 9 Playwright E2E прошли на :3000.
- Правило «фичи без unit, а backend без integration не делаем» закреплено в AGENTS.md,
  конституции 2.1.0 и текущей спецификации. hh.ru остаётся на паузе.

## Testcontainers — 2026-11-05

- Добавлен @testcontainers/postgresql 12.2.1 (exact version/lockfile).
- Node runner создаёт PostgreSQL 17.6 со случайными портом/именем базы/паролем,
  передаёт координаты миграциям и тестам, удаляет собственный контейнер в finally.
  Есть обработка SIGINT/SIGTERM, ограничение времени дочерних процессов, Ryuk включён.
- Нет fallback на постоянную БД. Внешний TEST_DATABASE_URL отклоняется ещё до запуска;
  guard проверяет container metadata и запрещает совпадение с рабочим подключением.
- Red/green: новый тест прямого запуска без metadata упал на прежнем fallback,
  после изменения guard прошёл. Unit lifecycle проверяют success/nonzero/error/startup
  failure и запрет внешнего подключения. Интеграционный cleanup-тест делает настоящий
  SQL-запрос, намеренно бросает ошибку и проверяет недоступность остановленной БД.
- `npm run test:integration` успешно прошёл при первом включении (10 существующих тестов).
  Финальный `npm run verify` прошёл: 44 backend unit + 11 integration + 1 contract,
  37 frontend unit/component = 93 теста; build/Biome/types/coverage thresholds успешны.
- После обоих прогонов docker inspect подтвердил отсутствие созданных runner контейнеров;
  контейнеров с testcontainers label не осталось. Рабочая база не менялась.
- Удалены compose.test.yaml и старый отдельный daniil-card-test контейнер/сеть.
  CI, README, AGENTS и docs/testing.md переведены на автоматический lifecycle.
  Remote GitHub CI не запускался; его команда verify проверена локально.

## Подготовка Image Updater — 2026-11-06

- Закреплён upstream v1.4.0, manifest vendored с SHA256; Kustomize overlay ограничивает
  ресурсы controller. Подготовлены Application/AppProject и ImageUpdater только для визитки.
- CI больше не делает SSH deploy: job publish после всех checks публикует единый
  release image в GHCR. Digest меняется одновременно у app и migration Job.
- Git write-back настроен на deploy/k3s-02 и отдельный Secret card-image-updater-git;
  read-only Argo key не переиспользуется для записи. GHCR credentials отдельные.
- Конфигурация CR проверена по vendored upstream CRD, Kustomize rendering успешен.
  Server-side dry-run установки на k3s-02 успешен без изменения кластера.
- npm run verify прошёл; 9 Node deployment/config тестов + 2 Python теста зелёные.
  Release Docker target собран; app/schema/Prisma CLI доступны, пользователь UID 1000.
- Контроллер/Application/CR не активированы: ожидаются write key, GHCR credentials,
  bootstrap БД, начальный digest и ingress. Реального обновления registry → Git → Argo
  пока не было. Детали: deploy/image-updater/README.md.

## Shared DB and live GitOps — 2026-11-06

- New shared PostgreSQL initialised on k3s-02 according to infra network/namespace model.
  Old image digest returned not found; pinned available PostgreSQL 17.6 and kept same PVC.
- Dedicated daniil_card role/database, no admin privileges, PUBLIC CONNECT revoked;
  app credentials never printed/committed. Shared PV set Retain.
- Unit regression for shared-DB manifests first failed, then passed after removing
  app-owned StatefulSet/service/network policy and adding required namespace/Pod labels.
- Full verify passed, migration hook and seed succeeded against real shared PostgreSQL.
- Argo auto-sync enabled and Synced/Healthy. Image Updater Git write-back observed,
  error condition False after a transient GHCR TLS timeout on the first pass.
- Public HTTPS readiness and all 9 Playwright E2E passed, including real Sandbox.
- Initial role inspection: daniil_card|f|f|f; database owner daniil_card; counts 1|49|6|4.
- Shared infra overlay saved locally under ../infra/environments/card-shared-db;
  unrelated infra dirty work not committed/pushed. No off-host DB backup configured.

- Actual automatic update confirmed: updater commit b221c8e5 changed Kustomize digest
  from 3e94703d to 0361d8d9. Argo synced that revision, repeated migrations successfully
  and completed deployment/app rollout. Initial pod remained ready during cold pull.

## Custom domain — 2026-11-06

- DNS for daniil-ivanov.dev and www.daniil-ivanov.dev resolves to 62.84.118.213.
  Original HTTPS failed hostname verification because nginx served the temporary certificate.
- Issued Let's Encrypt certificate covering both names; configured dedicated nginx vhost,
  HTTP and www redirects to https://daniil-ivanov.dev, existing renewal/reload automation.
  Private TLS key remains on server and was never printed or committed.
- Regression test for APP_ORIGIN first failed on the old sslip origin, then passed.
  Added nginx certificate/canonical-routing config checks; deployment tests all pass.
- Full verify passed; new nginx config passed nginx -t and was reloaded successfully.
- GitOps commit 3fea716 updated origin without overwriting the updater's current image
  digest. Argo Synced/Healthy at this revision; readiness returns canonical CORS origin.
- HTTPS certificate validation succeeds for root and www; HTTP and www return 301.
  All 9 Playwright E2E passed against https://daniil-ivanov.dev, including Sandbox.

## Deployment moved to infra — 2026-11-06

- Moved card Kubernetes/Kustomize manifests to infra/apps/daniilivanovdev,
  controller/CR to infra/platform/image-updater, Application/Project to infra/gitops,
  nginx template to infra/nginx and shared DB overlay to infra/environments/card-shared-db.
- Used isolated infra worktrees from remote main/deploy/k3s-02. Existing dirty Mogg,
  monitoring, inventory and site changes were not staged or pushed.
- Separate read-only Argo and write-capable updater keys installed for infra repository.
  Git read/write dry-run passed. Argo source and updater write-back now use infra.
  Old app-repository keys and unused cluster Secrets removed after successful switch.
- Infra ownership tests first failed with old application URL, then passed after migration.
  Five Python tests cover source/path/scope/shared DB/atomic image/CRD/TLS/migration order.
  Kustomize rendered; live Argo Synced/Healthy, updater generation 2 has no errors,
  public readiness returns ready. Infra GitHub CI succeeded.
- Removed deployment manifests and obsolete SSH receiver/renderers from application.
  Config tests moved to infra; app retains four CI tests and image publication only.
- Full application verify passed; final changed CI tests/Biome and infra tests passed.

## k6 TypeScript load scenarios — 2026-11-07

- Added a read-only public-profile scenario using the exact frontend GetProfile query.
  Modes: smoke (5 iterations), load (3 minutes, default 20 iterations/s), stress
  (5 minutes, default 20/40/80 iterations/s). Each iteration is one API request.
- Configuration/response unit checks were introduced first and failed because the
  support module did not exist; all five tests now pass. Cases include empty and
  populated relations, nullable fields, malformed JSON/data, GraphQL errors despite
  HTTP 200, invalid modes/origins/rates and VU allocation boundaries.
- Real k6 v1.7.1 smoke against Nest/HTTP/GraphQL and a fresh Testcontainers PostgreSQL
  passed. The same test first confirms a nonzero k6 exit for an absent profile,
  then creates a profile with all four relations and confirms successful checks.
  Testcontainers applies migrations and removes the isolated database afterwards.
- All three configurations passed `k6 inspect`. Full `npm run verify` passed,
  including build, Biome, type checking, backend unit/integration/contract coverage,
  frontend coverage, CI workflow checks and load-support unit tests.
- Load/stress were not run against the deployed website: no capacity or latency
  claim is made. The initial p95/p99 budgets are configurable, not measured SLOs.
  This scenario covers the main public API read, not browser rendering/assets or
  every standalone GraphQL list/detail query. No browser interaction was changed.
- The real-k6 integration command is separate from verify and requires installed
  k6 plus Docker; long performance runs are deliberately separate from coverage.

## Production capacity search — 2026-11-07

- Owner explicitly authorized load against https://daniil-ivanov.dev. Added a bounded
  maximum.ts entrypoint and test:load:maximum command; production GetProfile is read-only.
  k6 inspect and npm run verify passed. No browser interaction changed.
- Initial step test stopped automatically at 100 RPS when cumulative p95 crossed 2s.
  A follow-up with 300 preallocated VU held 60 RPS for 45s (request-cohort p95 383ms,
  no errors/drops), then degraded at 75 RPS (cohort p95 ~6s, 17 timeouts, 165 drops).
  Follow-up was manually interrupted; the 90-RPS hold did not run.
- Final readiness/homepage returned 200 and strict GraphQL smoke passed. No k6 process
  remains. Working database was neither seeded nor modified.
- Raw samples, summaries, PNG/SVG/PDF charts, CSV and a methodology/limitations report
  are saved locally under artifacts/k6-max-20261107 (git-ignored performance artifacts).
  Request-start cohorts attribute late timeouts to their originating hold stage; timeline
  charts use completion-time windows and omit setup. Production resource telemetry was
  unavailable: observed instability cannot identify the limiting component or establish
  a universal maximum. 45s holds do not establish long-term capacity.

### 2026-11-08 — Grafana и мониторинг в соседнем infra

- Изменения приложения не требовались. Конфигурация и реализация коллектора:
  `../infra/environments/k3s-02/monitoring/`, `../infra/scripts/card-metrics.py`.
- Node 24.22.2, `npm run verify` — PASS, включая coverage, integration/contract
  с отдельной PostgreSQL Testcontainers. TEST_DATABASE_URL не задавался.
- Infra: 9 unit/конфигурационных тестов — PASS; kustomize и promtool — PASS.
  Сначала зафиксирован красный тест отсутствующего коллектора, затем зелёные
  проверки классификации запросов, границ, ошибочных строк, partial line,
  рестарта, ротации, повторного чтения и повреждённого состояния.
- HTTPS smoke Grafana — PASS: health, login redirect, JS bundle, оба дашборда,
  каждый PromQL запрос вернул живые данные. Проверены scrape/probe success,
  свежесть коллектора. Живой nginx smoke подтвердил +1 за один просмотр,
  исключение Grafana/probe и отсутствие повторного счёта.
- Ограничения: просмотры включают ботов, это не уникальные посетители;
  история начинается с установки. HTTPS probe идёт с той же ноды, независимый
  внешний монитор не настроен. Визуальный браузерный smoke недоступен:
  computer-use browser host не подключён, HTTP smoke выполнен.
- При rollout k3s один раз перезапустился после задержек etcd и потери
  leader lease. Восстановился, сайт HTTP 200; добавлена панель PSI I/O.

## Redis public-read cache — 2026-11-08

- Unit tests were added first and failed on the missing cache module. Implemented
  read-through Redis cache for all seven public profile/list/detail service reads.
  Unit cases cover hits/misses, dates/null, independent concurrent results, shared
  misses, corrupt entries, loader/read/write errors and uncached missing records.
- A real Redis CLIENT PAUSE regression exposed that AbortSignal alone does not bound
  already-sent commands. Added a separate 100ms deadline per cache operation and
  absolute Redis expiry so delayed SET cannot extend stale snapshots after recovery.
- Real Nest/HTTP/GraphQL + isolated PostgreSQL/Redis tests pass, including cross-app
  sharing, true TTL expiry, ordered list/detail responses, corruption, invalid IDs,
  missing records, slow/offline Redis and startup with unreachable Redis.
- Redis is optional and failures use PostgreSQL; no L1 cache, mutation/admin routes
  or HH synchronization. Cache prefix card:public:v1; TTL default 60s (1..3600).
  Direct SQL/seed updates have bounded TTL staleness. Single-flight is per process;
  there is no distributed lock across replicas. Schema-incompatible changes require
  a cache namespace version bump. Redis data is ephemeral, not authoritative.
- Redis manifests in isolated infra worktree /tmp/card-infra-redis include one pod,
  ClusterIP only, same-namespace application-only ingress, no Redis egress, 64MB LRU
  cache and 128Mi pod memory limit. Infra tests first failed without the Redis
  resource, then passed (10 tests); Kustomize and live server dry-run passed.
- Full npm run verify passed in both the working repository and isolated release
  worktree. Redis pod is Ready via GitOps revision 7504441; an actual application-pod
  TCP PING returned PONG through the restricted Service/NetworkPolicy.
- Deployment completed: application commit c05e597, infra cache commit 7504441,
  automatic digest update d3a8f93; image sha256:ed13dfbbd2fb892b2821b44042183729076cb3fa0eb3d1c4bdd2812b5a371797.
  App and Redis pods Ready; Argo Synced/Healthy. App and infra GitHub CI succeeded.
- Local production Docker startup smoke and all nine Playwright E2E passed, including
  repeat setup and persisted SQL edits with a short isolated cache TTL.
- Production full-GetProfile smoke passed all checks. Redis counters moved from
  0 hits/0 misses to 5 hits/1 miss: one cold read followed by five cache hits.
  Profile key exists with TTL 56 seconds at inspection. These six requests prove
  wiring/cache reuse, not an improvement in maximum load capacity; stress was not rerun.
  Proof logs are in artifacts/redis-cache-20261108 (local, git-ignored).

### 2026-11-08 — Самые долгие HTTP-запросы в Grafana

- Убрана карточка «Сайт доступен сейчас» с boolean true/false. Сохранены
  процент аптайма и график истории. Добавлена таблица top-10 запросов за 24h:
  время UTC, метод, путь без query string, статус и полная длительность nginx.
- Сначала новые тесты падали из-за отсутствия timing-поведения, затем 6 тестов
  коллектора — PASS: top-20/порядок, сохранение/повторное чтение, истечение,
  старый лог без timing, NaN/ошибки/отрицательные значения/ноль, POST и 5xx,
  исключения probe/Grafana, экранирование кавычек, слэшей и control characters.
- `npm run verify` — PASS на Node 24.22.2; отдельная PostgreSQL Testcontainers,
  TEST_DATABASE_URL не задавался. Kustomize render и promtool check metrics — PASS.
- Сбор длительностей начат после обновления nginx; время включает отправку
  ответа клиенту. Таблица показывает текущее окно 24h независимо от выбранного
  диапазона графиков. Максимум 20 записей в состоянии коллектора.
- Browser host по-прежнему недоступен; проверка через API Grafana выполняет
  panel queries и проверяет реальные duration values и labels для преобразований
  labelsToFields/merge. Визуальный браузерный smoke не выполнен.
- Итоговый HTTP smoke после rollout — PASS: удалённая карточка отсутствует,
  Grafana возвращает значения длительностей и все labels для таблицы; запросы
  всех панелей обоих дашбордов возвращают живые данные. Все monitoring Pods Ready.

## Repeated capacity search with Redis — 2026-11-08

- Original deployment/image and full frontend GetProfile query retained. Workstation
  external-HTTPS run hit p95 2.14s at only 25 RPS while API used ~35m CPU. Server probes
  were ~14ms HTTPS / ~4ms Service, so this path could not establish backend capacity.
- Ran temporary k6 1.7.1 Jobs in the app namespace against the same public HTTPS domain,
  with resource limits and simultaneous cgroup/pod telemetry. Main stages 25/50/75/100
  completed; 150 RPS stopped at the 2s guard (hold cohort p95 2.80s, ~131 completed RPS,
  169 dropped iterations). API quota remained 500m; k6 was raised from 500m to 1 CPU.
- Refinement used 1 CPU for k6 from start. Full 45s holds: 115 RPS p95 371ms, 125 RPS
  p95 1255ms, 135 RPS p95 1051ms. At 145 RPS the run stopped after ~14s of hold, p95
  2219ms, ~136 completed RPS, 30 drops. No HTTP/GraphQL/response-check errors in either
  server-origin run. A completed hold is not proof of long-term queue stability.
- Observed throughput ceiling ~130–135 RPS with this workload and 500m API quota;
  115 RPS is the highest tested target meeting the initial p95<500ms budget. Refinement
  API peaked around 494m with throttling, k6 ~466m against its 1-CPU limit. Redis used
  ~20m, no evictions; between snapshots its hit/miss increments were 29799/10.
- Do not interpret these as a controlled before/after Redis speedup: the generator
  location changed to eliminate the noisy workstation network. Co-location and 45s
  holds limit capacity/SLO conclusions. Graphs include actual vs offered RPS and CPU.
- Both temporary Jobs/ConfigMaps and their pods were removed. App/Redis remain Ready
  with zero restarts; public readiness/homepage return 200 and server-origin GraphQL
  probes return valid profiles. No application code or permanent infra settings changed.
- Raw metrics, k6 summaries, exact manifests/scripts, telemetry, CSV and PNG/SVG/PDF
  graphs plus methodology report: artifacts/k6-cache-max-20261108 (git-ignored).

## Normalized GraphQL response cache — 2026-11-08

- Added normalization/key tests first; the initial run failed on the missing response
  key module. Implemented a query response cache via Apollo responseForOperation,
  reached only after ordinary document parsing/validation/complexity checks.
- Canonical identity: print + stripIgnoredCharacters AST hash, actual selected operation,
  coerced/defaulted variables with sorted object keys (array order preserved), schema
  fingerprint, cache version and TTL. Memoized document hashes use WeakMap. Selection
  order, aliases and literal contents remain significant. No field reordering is used.
- Removed old DTO CacheService: misses now execute SQL directly and hits return the
  ready GraphQL data. This prevents compounded TTL/staleness. Freshness deadline is
  fixed before execution and used for Redis PXAT; hits never renew it. Payload limit
  256KiB; errors, partial errors, absent roots and introspection are not cached.
- Concurrent misses share encoded successful data, decoded independently per response.
  Waiters are released on errors/shutdown or after 5s. Redis failure remains fail-open.
- A regression test exposed Apollo invoking the hook with an unresolved operationName;
  it first failed with Internal server error. The guard now preserves normal operation
  resolution errors without hitting/reusing the response cache.
- Unit and real PostgreSQL/Redis/Nest HTTP integration cover normalized warm hits that
  skip resolver/service execution, variables/operations/aliases, schema isolation, TTL,
  no double caching, partial errors, payload limit, real SQL failures with independent
  request IDs, corruption, unavailable/stalled Redis and cross-app cache sharing.
- Numeric-key regressions were first reproduced in the isolated release worktree:
  -0 collided with 0, and non-finite custom scalar values collided with JSON null.
  Canonicalization now preserves -0 and bypasses caching for non-JSON scalar values.
- Full npm run verify passed in the working repository and isolated release worktree;
  thresholds were not reduced. Local production Docker startup smoke and nine browser
  E2E passed for the response-cache wiring. Final revision will also pass CI before
  the publication job can release its image.
- Production deployment succeeded: app b1bac1a, image d38eb3a6..., automatic infra
  update e20de2f, Argo Synced/Healthy. GitHub CI and final-head browser E2E passed.
  Argo retried the hook after a k3s restart/image-pull delay; old API remained Ready.
- Live HTTPS probes confirmed one normalized cache key for two formatting variants,
  equal data, distinct request IDs and TTL decreasing 59856→59732ms without rewrites.
- A bounded cluster-origin HTTPS/GetProfile sanity test (15s ramp + 45s at 150 RPS)
  passed: full-run p95 173.47ms, p99 290.32ms, no errors/drops, API limit still 500m;
  sampled API peak ~378m, generator ~531m of 1 CPU. Not a new maximum/SLO capacity claim.
  Raw cohort boundaries have a small first-arrival offset; executor exit 0 and full-run
  summary/logs are authoritative. p99 is available in threshold console output, not the
  default summary exporter. Exact speedup ratios across different windows are not claimed.
- Temporary benchmark resources removed; app/Redis Ready, public readiness 200.
  Proof, scripts, raw metrics, charts and limitations: artifacts/response-cache-20261108.

## 2026-11-08 — компактные и кешируемые спрайты

Запись nginx `GET /images/character-sprites.png` с 15.198 с относится к
2026-11-08 17:20:37.938 UTC, во время поиска максимума RPS. `$request_time`
включает передачу клиенту; сама запись не позволяет отделить ожидание upstream
от медленной загрузки клиентом. Контрольное скачивание с сервера вне нагрузки:
TTFB 50.6 мс, полное время 64.4 мс, 1 221 871 байт. Поэтому фикс не обещает
устранение любой сетевой задержки.

Основной спрайт перекодирован WebP quality=90, alpha_quality=100, method=6:
1 221 871 → 368 414 байт (-69.8%). Игровой: 1 657 932 → 511 808 (-69.1%).
Это сжатие RGB с потерями; размеры и alpha-канал проверены попиксельно и сохранены.
Размеры кадров, координаты и таймеры анимации не менялись. Исходные PNG и GIF
в public сохранены для старых клиентов. Для повторной генерации:
`cwebp -q 90 -alpha_q 100 -m 6 input.png -o output.webp`.

Новые CSS-спрайты и GIF импортируются Vite и получают hash в URL. Основной
спрайт preload-ится тем же URL. Только fingerprinted файлы внутри assets
получают `public, max-age=31536000, immutable`; HTML и неверсионированные файлы
получают `no-cache`. Новый hash при изменении содержимого обновляет кеш.

TDD: новый browser regression упал на старом PNG URL. HTTP-интеграция через
Nest с настоящей отдельной Testcontainers PostgreSQL упала на старом
`public, max-age=0` вместо immutable. После реализации `npm run verify` прошёл:
74 backend unit/integration/contract теста, backend coverage 97.35% lines,
80.21% branches, 95.79% functions; frontend coverage и CI checks зелёные.
Проверены политика кеша и её границы, HTML, missing assets/API 404, HEAD,
ETag/304, Range/206, WebP MIME. Ручная проверка декодирования и alpha использует
Pillow/NumPy вне продуктовой сборки; CI проверяет реальное декодирование WebP,
размер, fingerprint/preload URL и заголовки через браузерный E2E.

Все 11 браузерных E2E прошли на production Docker-сборке с отдельным Compose
проектом, PostgreSQL и Redis. Дополнительно проверены main preload без двойной
загрузки, hash URL, WebP decode/размер, игровой GIF и WebP при паузе; размеры
1246×1263 и 1774×887 сохранены. Тестовые контейнеры и volume удалены в finally.

### 2026-11-08 — Удаление dead code и остатков отменённой авторизации

- Поиск ссылок в production, тестах, Docker/Compose/CI подтвердил отсутствие
  потребителей Clock, domainError и CSRF token setter. Удалены Clock и пустое
  override его provider в helper, domainError и его единственный test-only вызов,
  CSRF state/setter и служебный X-App-Request. Клиент публичного API не отправляет
  cookies; CORS больше не включает credentials и старые auth-заголовки.
- AUTH_RATE_KEY, CLIENT_IP_MODE, TRUSTED_PROXY_CIDRS больше не участвуют в
  запуске; удалены из Compose, .env.example, helper, CI и Docker smoke fixtures.
  Старые переменные в окружении игнорируются. Проверка HTTPS в production сохранена.
- Убраны прямые зависимости argon2, proxy-addr, class-transformer, class-validator,
  @types/proxy-addr и проверка неиспользуемого argon2 в Dockerfile. Транзитивные
  зависимости других библиотек не удалялись принудительно. Lockfile обновлён npm.
- Удалены одинаковый повтор overrides Biome и демонстрационный metadata.test.ts,
  проверявший только собственные fixture-классы. Настоящий Nest wiring проверен
  интеграцией и чистым Docker startup. Coverage thresholds не менялись.
- Сначала unit-регрессии упали на обязательном AUTH_RATE_KEY и credentials=include;
  после изменений npm run verify — PASS: build/Biome/types, backend unit/integration/
  contract, frontend component tests, coverage, CI-script tests и load unit.
- Docker app/setup пересобраны; изолированный e2e/docker-startup.test.mjs — PASS,
  включая все 11 браузерных E2E, чистый startup без auth secret, повторный setup,
  сохранность изменений при restart и отказ старта при ошибке setup. PostgreSQL
  для интеграции — отдельная Testcontainers; Compose smoke использовал собственный
  project/volume и удалил его в finally. Рабочая БД не использовалась.
- Изменения Redis/WebP из исходного рабочего дерева сохранены. Валидация seed,
  Prisma/SDK generation, Nest modules и исходные изображения не считались dead code.

## 2026-11-08 — гигиена репозитория и аудит публикации

Добавлены исключения Git/Docker для локальных PDF/отчётов, временных файлов и
распространённых файлов доступа. Пользовательские PDF/результаты прогонов сохранены
в ignored-директориях; найденный OS/Python cache удалён. Secret scan всей Git-истории
добавлен в обязательные CI gates; checksum скачанного Gitleaks проверяется.

TDD: новые проверки ignore и secret-scan job сначала упали; после изменений
прошли полный npm run verify и 11 Docker E2E с отдельными PostgreSQL/Redis.
Gitleaks и дополнительный анализ blob objects не нашли рабочих секретов.
Прямые HH URL убраны из текущих документов, но остаются в истории. Данные
портфолио и авторские email не обезличены; ограничения и область проверки
описаны в docs/publication-audit.md. Публичность GitHub не менялась.

## 2026-11-08 — README для тестового и выборка запрошенных полей

README начинается с назначения backend, ссылок на Sandbox/сайт/исходники и
реализованных требований. Пример запроса показывает профессиональные ссылки,
даты, достижения и URL проектов. Убраны вводные замечания об отменённых функциях
и приостановленном HH-воркере; ограничения доступа к приватному Git описаны явно.

TDD: новый HTTP/GraphQL тест с настоящей отдельной PostgreSQL и SQL-событиями
Prisma сначала упал: scalar-only профиль выполнял 5 SELECT вместо 1. После
изменения resolver передаёт публичные имена запрошенных полей через service в
repository. Repository формирует Prisma select по разрешённым полям и сохраняет
порядок списков. Транспортные aliases не становятся именами колонок/связей.

Unit-проверки покрывают aliases (в том числе __proto__), объединение fieldNodes,
именованные/inline fragments, повторные fragments, @include/@skip, значения
переменных по умолчанию, __typename и полностью пропущенные поля. Сборщик
ориентирован на текущие конкретные object types Profile и связанных моделей:
совместимость fragment type conditions проверяется GraphQL до вызова resolver.

HTTP-интеграция на реальной PostgreSQL проверяет 1 и 100 записей в каждой связи:
скаляры — 1 SELECT; только skills — 2 без чтения других таблиц и лишних скалярных
колонок; четыре связи — 5 SELECT. Также проверены сортировка, directives/fragments,
root aliases, merged fields, метаполя, пустая выборка, отсутствие профиля и отказ
валидации без SQL. Полный пример из README выполняется тем же HTTP-тестом.
Служебные PK/FK могут читаться для связи строк и проверки существования объекта.

После реализации прошли npm run verify (77 backend unit/integration/contract,
backend coverage: 97.58% lines, 81.47% branches, 96.32% functions; сборщик полей
100% по всем метрикам), frontend coverage, типы, Biome и CI checks. 11 Playwright
E2E прошли на изолированной Docker-сборке с отдельными PostgreSQL/Redis, включая
Sandbox и полный frontend GetProfile. Реальная Redis-интеграция кеша также прошла;
инструментирование service сохраняет переданные аргументы выборки. SQL counters
проверяются с отключённым Redis, поэтому cache hits не маскируют лишние запросы.
Схема GraphQL и поведение ответов не менялись. Production/рабочая БД не изменялись.
