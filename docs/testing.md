# Проверки и обязательный gate

С 2026-11-05 фича без unit-тестов не считается готовой; backend-фича дополнительно
требует интеграционных тестов. Правило записано в AGENTS.md и конституции 2.1.0.
Регрессия сначала воспроизводится падающим тестом, затем исправляется.

## Локальный запуск

```sh
npm run verify
```

`verify` собирает Prisma/API/schema/SDK/web, проверяет Biome и TypeScript, выполняет
все unit-тесты, интеграционные тесты backend и контрактный тест с контролем покрытия.
Для интеграции нужен Docker. Testcontainers запускает PostgreSQL 17.6 с динамическим
портом и случайным именем `card_test_<run id>`/паролем, применяет миграции перед тестами.
Backend выполняется последовательно внутри одного прогона; разные запуски получают
свои контейнеры и не конфликтуют за порт. Постоянная тестовая Compose-база удалена.
Runner отклоняет внешний TEST_DATABASE_URL; assertTestDatabase проверяет координаты
созданного контейнера и отсутствие совпадения с рабочим подключением.
Контейнер удаляется в finally при успехе/ошибке, при SIGINT/SIGTERM дочерний процесс
останавливается перед очисткой; Ryuk остаётся включён на случай аварийного завершения.
Первый прогон может скачивать образы. Секреты БД не записываются в файлы и не выводятся.

Отдельные команды: `test:unit`, `test:integration`, `test:contract`, `test:coverage`.
Браузерные проверки: `npm run test:e2e` против работающего приложения, по умолчанию :3000.

## Матрица поведения

| Область                               | Unit / component                                                                                            | Backend integration / браузер                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Конфигурация, валидация, даты, ошибки | environment, validation, scalars-errors                                                                     | HTTP errors, input rejection                                             |
| Профиль, списки, детали               | profile-service: UUID и отсутствие записи                                                                   | profile-read, profile-relations: PostgreSQL, порядок, null, ограничения  |
| GraphQL                               | query-limits, schema-export, metadata                                                                       | introspection, лимиты, некорректный JSON, отсутствие mutations, contract |
| Seed                                  | seed-data: нормализация и независимость снимков                                                             | конкурентный запуск, rollback, сохранение локальных правок               |
| HTTP, readiness, раздача SPA          | web-routing                                                                                                 | health, http-boundary, web-routing: API/ассеты не подменяются HTML       |
| GraphQL SDK                           | api-client: заголовки, сеть, редактирование ошибок, prototype keys                                          | public-profile E2E                                                       |
| Публичный сайт                        | profile-page, router, story-explorer: загрузка, ошибка, retry, маршруты, контакты, поиск, безопасные ссылки | public-profile E2E 360/1440 и touch                                      |
| Персонаж                              | pixel-guide: кадры, речь, таймеры, GIF/still, reduced motion                                                | hover, pause и reduced motion E2E                                        |
| Арканоид                              | skill-breaker + component: физика, волны, попытки, клавиатура, пауза, cleanup                               | mouse collision и настоящий touch drag E2E                               |

## Покрытие

Web: Vitest V8 включает все src TS/TSX, кроме генерируемого SDK и main.tsx
(точка монтирования проверяется сборкой/браузером). Пороги: строки/выражения 95%,
функции 90%, ветви 85%. HTML-отчёт: apps/web/coverage/index.html.

Backend: встроенный Node coverage для **исполненных скомпилированных модулей**
`dist-test/src`, кроме generated. Пороги: строки 95%, функции 90%, ветви 75%.
Отчёт в stdout. Сгенерированные TypeScript-декораторы влияют на процент ветвей;
число нельзя напрямую сравнивать с frontend. Node не добавляет неимпортированные
файлы в отчёт: bootstrap main/CLI entrypoints и декларативный AppModule дополнительно
проверяются build и Docker/smoke, это не 100% измерение всего репозитория.

Проценты не заменяют тесты новой фичи. Порог нельзя снижать или обходить исключением
продуктовых файлов. Внешний hh.ru не вызывается тестами; его реализация на паузе.

## CI

`.github/workflows/ci.yml` запускает отдельные jobs для lint, format, types, build, unit,
integration, contract, coverage, ci-tests и E2E на push/PR с отдельной
PostgreSQL, которую создаёт Testcontainers (без Compose setup/teardown в CI). Ошибка тестов или падение покрытия завершает job
неуспешно. Workflow подготовлен и его команды проверены локально; удалённый GitHub
прогон в этой работе не запускался. Для запрета merge владелец репозитория может
сделать job `verify` обязательным в branch protection; эти настройки не менялись.

Deployment configuration tests now live in infra/tests/test_card_gitops.py.
Application workflow behaviour is checked with npm run test:ci.

## Redis response cache

Публичные GraphQL query кешируются после парсинга/валидации и до выполнения
резолверов. Cache hit возвращает готовые data, минуя service/repository/SQL и обработку
полей GraphQL. Прежний кеш DTO удалён, поэтому TTL двух слоёв не складывается.

`REDIS_URL` необязателен для отдельного API; Compose и Kubernetes задают внутренний
адрес. `CACHE_TTL_SECONDS` — 1..3600, по умолчанию 60. Redis недоступен/завис — запрос
выполняется обычным путём через PostgreSQL; ожидание каждой Redis-операции ≤100 мс.
Readiness по-прежнему проверяет PostgreSQL. Нагрузочный сценарий — `load/profile.ts`.

Ключ включает версию кеша, SHA-256 схемы, TTL, SHA-256 нормализованного документа,
выбранную операцию и каноническое представление приведённых GraphQL-переменных.
Документ нормализуется через print/stripIgnoredCharacters: пробелы, комментарии и
необязательные запятые не меняют ключ. Порядок полей/aliases и значения строк остаются
значимыми. Семантическое переупорядочивание полей/фрагментов не выполняется. Hash
документа мемоизируется в WeakMap по AST, не удерживая вытесненные Apollo документы.

В объектах переменных сортируются ключи, в массивах сохраняется порядок. Используются
приведённые значения, включая defaults и ID coercion. Невалидные переменные проходят
обычный путь ошибок GraphQL. Смена схемы/TTL изолирует записи. При несовместимой смене
семантики без изменения схемы нужно повышать версию response:v1.

Redis keys: card:public:v1:response:v1:... . Кешируются только успешные single-response
query над семью явно публичными корневыми полями. Errors/частичные ошибки, отсутствующие
корневые записи, интроспекция и ответы >256KiB не сохраняются; вложенные null и пустые
списки допустимы. Заголовки, X-Request-Id и ошибки с requestId не кешируются.

TTL фиксируется до выполнения операции, записывается через PXAT и проверяется также
в payload. Hits его не продлевают. Прямые правки PostgreSQL видны в пределах TTL;
новая операция на cache miss читает SQL напрямую. Отложенная запись после зависания
Redis не продлевает жизнь старого снимка. Старые DTO keys истекают самостоятельно.

Одновременные промахи одного нормализованного ключа объединяются в процессе; каждый
ответ получает собственный JSON-объект. Ожидание владельца ограничено 5 секундами,
затем запрос выполняется самостоятельно. Ошибки выполняются отдельно для каждого
запроса и не передают чужой requestId. Распределённой блокировки между pod нет.

Unit tests через Apollo executeOperation проверяют normalizer, defaults/variables,
cache hits с обходом резолверов, expiry, schema isolation, concurrent misses, ошибки,
размер payload и отсутствующий operationName. Integration поднимает настоящую отдельную
PostgreSQL и временный Redis через Testcontainers: cold/warm HTTP/GraphQL, варианты
форматирования, cross-app sharing, TTL без продления, отсутствие двойного кеширования,
variables/aliases/operations, validation/complexity, реальные SQL failures с разными
requestId, corrupt Redis, CLIENT PAUSE и Redis outage. Рабочая БД не используется.
