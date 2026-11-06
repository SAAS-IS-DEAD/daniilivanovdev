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

- Источник владельца: https://hh.ru/resume/a08dab6aff11599fcd0039ed1f54436e6f5471
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
