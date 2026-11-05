# Цифровая визитка

Backend на **TypeScript + NestJS**, PostgreSQL/Prisma и GraphQL с Apollo Sandbox.
Frontend: React/Vite, **GraphQL Code Generator + graphql-request + генерируемый SDK**.
Реализованы публичный сайт, чтение API и начальное заполнение;
админка, авторизация сайта и CRUD отменены. Следующий этап — отдельный воркер
синхронизации резюме hh.ru ([план](specs/001-digital-business-card/plan.md)).
Воркер ещё не реализован: ссылка владельца при анонимной проверке вернула HTTP 403,
поэтому доступ к источнику требует уточнения. Сайт использует существующие данные.
Профиль заполнен по трём резюме владельца (frontend, team lead, fullstack), обновлённым 3 ноября 2026 года.

## Локальный запуск

Нужен Docker с Compose v2. Скопируйте `.env.example` в `.env`, задайте
`POSTGRES_PASSWORD` (например, случайные hex-символы) и `AUTH_RATE_KEY`.
Значения можно получить командой `openssl rand -hex 32`.
Не используйте `REPLACE_ME`. Для Compose адрес базы вычисляется внутри сети контейнеров;
`DATABASE_URL` из `.env` нужен только при запуске Node отдельно.

```sh
cp .env.example .env
# Отредактируйте .env перед следующей командой.
docker compose up --build -d --wait
```

Сайт: <http://localhost:3000>.
Откройте <http://localhost:3000/graphql> — Apollo Sandbox. Вставьте запрос и нажмите
кнопку выполнения. Редактор и документация Sandbox загружаются с серверов Apollo,
поэтому для них нужен интернет; само API работает локально.

```graphql
query GetBusinessCard {
  profile {
    name
    description
    skills {
      name
    }
    experience {
      company
      position
    }
    projects {
      name
    }
  }
}
```

`/health/live` проверяет процесс; `/health/ready` — соединение с базой.
Сервис `setup` применяет миграции и один раз добавляет данные резюме. Приложение
стартует только после успешного setup. При ошибке смотрите `docker compose logs setup`.
Повторная подготовка: `docker compose run --rm setup`. Она не меняет существующий
профиль, не восстанавливает удалённые записи и не дублирует контент.
`docker compose down` сохраняет данные в named volume. Флаг `-v` удаляет их.

## Разработка и проверки

Node.js из `.node-version`, npm из `packageManager` в `package.json`.

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:contract
```

Форматирование и линтинг выполняет **Biome 2.6.5**, настройки в `biome.json`.
`npm run format` форматирует файлы, `npm run lint:fix` применяет безопасные исправления,
`npm run check` проверяет форматирование и правила вместе. Исключены сборки,
генерируемый код, lock-файл, артефакты и служебные каталоги Spec Kit.

`npm run build` генерирует Prisma Client, компилирует API, экспортирует его схему
без подключения к БД, генерирует SDK и собирает frontend.
Для отдельного обновления SDK: `npm run api:generate`.
Операции находятся в `apps/web/src/api/*.graphql`, конфигурация — `apps/web/codegen.ts`.
Генерируемые файлы не коммитятся. SDK содержит типизированные методы, например
`getSdk(client).GetProfile()`; поля ответа зависят от написанной операции.
Документы генерируются в режиме `documentNode`: строковый режим текущих версий
плагинов выдавал ссылку на необъявленный `TypedDocumentString`.

Новая фича обязательно сопровождается unit-тестами; backend — также интеграционными.
Полный gate: при запущенном Docker выполнить `npm run verify`.
Он включает сборку, Biome, типы, unit/integration/contract и пороги покрытия.
Матрица сценариев, ограничения покрытия и CI: [docs/testing.md](docs/testing.md).

Интеграционные тесты через Testcontainers (нужен работающий Docker):

```sh
npm run test:integration
# либо все проверки с покрытием:
npm run verify
```

Testcontainers автоматически создаёт PostgreSQL 17.6 со случайным портом, отдельными
именем базы и паролем, применяет Prisma migrations, запускает тесты и удаляет контейнер.
`TEST_DATABASE_URL` вручную задавать не нужно: runner отклоняет внешний адрес базы.
Для первого запуска нужен доступ к registry для PostgreSQL и служебного контейнера Ryuk.
Unit-тесты и контрактные тесты отдельно запускаются без Docker.

Для браузерной проверки нужен запущенный Compose app с seed:

```sh
npx playwright install chromium
npm run test:e2e
node --test e2e/docker-startup.test.mjs
```

Последний тест создаёт отдельный Compose project, проверяет чистый запуск,
сохранность правок и отказ старта при ошибке setup, затем удаляет только свой volume.
Для frontend dev server: `npm run dev --workspace apps/web` (proxy к API на 3000).
Для отдельного API задайте `.env` с доступной БД и выполните
`npm run setup --workspace apps/api`, затем `npm run start --workspace apps/api`.
Compose не публикует порт рабочей БД наружу.

## Инженерные решения

- Resolver описывает GraphQL API; service содержит правила; repository работает с Prisma.
  Явные output types не привязывают публичный контракт к внутренним таблицам.
- Один профиль, связанные списки с устойчивым порядком. Чтение профиля с четырьмя
  связями выполняет не более пяти SELECT независимо от количества элементов.
- Code-first схема Nest — источник для SDK; плановый SDL отдельно проверяется тестами.
- JSON body и документ ограничены 64 KiB, batching отключён. Обычные запросы:
  глубина 6, до 50 полей с раскрытием fragments; чистая introspection для Sandbox:
  глубина 20, до 2000 полей, максимум 3 корневых поля. Alias не меняет классификацию.
- Seed защищён транзакцией, PostgreSQL advisory lock и маркером версии.
- В образе приложения нет dev dependencies; setup вынесен в отдельный образ со
  средствами миграции. Оба процесса работают без root.

Полный проектный контракт: [plan.md](specs/001-digital-business-card/plan.md).
Фактические проверки: [validation.md](specs/001-digital-business-card/validation.md).
Публичный деплой пока не выполнен.

Исходные данные профиля находятся в `apps/api/src/cli/resume-data.ts`. Периоды работы
в резюме указаны до месяца: в БД используется первое число месяца, на сайте показываются
месяц и год. День не следует считать фактической датой приёма или увольнения.
Три версии объединены без повторения компаний; достижения frontend, backend и руководства
сохранены в общей истории. Дата рождения, гражданство и станция метро в публичный профиль
не перенесены. Ссылки взяты из резюме; доступность внешних сайтов отдельно не проверялась.
Обычный seed по-прежнему не перезаписывает уже существующие данные.

## Интерактивная визитка

Персонаж встречает посетителя и предлагает исследовать опыт, проекты и навыки.
Наведение или фокус на карточке меняют рассказ; нажатие открывает подробности.
На телефоне доступны те же действия касанием. Есть поиск навыков, контакты,
ручная пауза анимации и поддержка prefers-reduced-motion.
Оригинальные спрайты и принцип анимации предоставлены владельцем.
Подробности: [интерактивный интерфейс](docs/interactive-portfolio.md).

Текущий статус публикации и CI/CD: [docs/deployment.md](docs/deployment.md).
