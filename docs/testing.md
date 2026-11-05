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
integration, contract, coverage, deployment-tests и E2E на push/PR с отдельной
PostgreSQL, которую создаёт Testcontainers (без Compose setup/teardown в CI). Ошибка тестов или падение покрытия завершает job
неуспешно. Workflow подготовлен и его команды проверены локально; удалённый GitHub
прогон в этой работе не запускался. Для запрета merge владелец репозитория может
сделать job `verify` обязательным в branch protection; эти настройки не менялись.
