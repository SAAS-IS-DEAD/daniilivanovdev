# Исследование и решения

Дата: 2026-11-04. Это проектные решения, не отчёт о работающем приложении.

## Backend и контракт

**Decision:** TypeScript strict, NestJS с Express, Apollo Server, GraphQL code-first.
**Rationale:** Обязательный backend остаётся на TypeScript + NestJS; декораторы дают
явные входные и выходные типы. SDL в contracts — целевой контракт; при реализации
сгенерированная схема проверяется на соответствие ему.
**Alternatives:** Schema-first потребовал бы отдельно поддерживать SDL и классы;
REST не удовлетворяет исходному заданию. Fastify не даёт необходимого здесь преимущества.
Официальная [инструкция NestJS](https://docs.nestjs.com/graphql/quick-start)
показывает настройку Apollo и замену GraphiQL на Sandbox. Для размещённого тестового
Sandbox и introspection включаются явно; mutations остаются защищёнными.

## Хранилище и Prisma

**Decision:** PostgreSQL 17, Prisma 7, pg adapter, явная ESM-генерация клиента для Nest 12.
**Rationale:** Реляционные связи, уникальность и транзакции нужны и контенту, и авторизации.
Отдельный PrismaService управляет соединением; репозитории локализуют запросы.
**Alternatives:** SQLite проще локально, но усложняет перенос на выбранный хостинг;
Redis не нужен для одного администратора, сессии и счётчики можно хранить в PostgreSQL.
[Prisma v7 Nest guide](https://www.prisma.io/docs/guides/v7/frameworks/nestjs)
используется для генератора prisma-client с output внутри apps/api/src/generated/prisma
и moduleFormat=esm. Backend: type=module, TypeScript NodeNext, runtime imports с .js.
Версии prisma, @prisma/client и @prisma/adapter-pg фиксируются согласованно;
генерация выполняется до компиляции. Настройки CLI — prisma.config.ts,
миграции — отдельный шаг выпуска, не db push в production.

## Frontend и упаковка

**Decision:** React + Vite + TypeScript, React Router, graphql-request и генерируемый
SDK через GraphQL Code Generator. Выбор SDK подтверждён пользователем 2026-11-04.
npm workspaces: apps/api и apps/web.
**Rationale:** Для одной визитки и админки не нужны SSR и второй сервер рендеринга.
В production Nest раздаёт собранную SPA; /graphql и /health исключены из fallback.
В разработке Vite proxy направляет /graphql и /health на Nest.
**Alternatives:** Next.js добавляет второй серверный слой; Apollo Client с нормализованным
кэшем избыточен для формы одного администратора. После mutations выполняется повторное чтение.
Отдельного общего пакета моделей нет: frontend использует контракт, не Prisma-типы.
Codegen plugins: typescript, typescript-operations, typescript-graphql-request;
из backend SDL и именованных .graphql операций генерируется getSdk(client).
Предпочтение SDK вместо client-preset/ручного fetch связано с желанием вызывать
готовые методы sdk.GetProfile(), sdk.CreateSkill().
[Официальная документация SDK-плагина](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-graphql-request).

## Авторизация

**Decision:** Непрозрачная случайная сессия в HttpOnly cookie; в базе только SHA-256
идентификатора, срок 24 часа без продления. Пароль — Argon2id. Выход отзывает сессию;
локальная смена пароля отзывает все сессии. Session cookie Secure в production,
SameSite=Lax, Path=/, без Domain. В локальном HTTP Secure отключается отдельным режимом.
**Rationale:** Немедленный отзыв и проверяемое истечение проще долгоживущих JWT.
**Alternatives:** JWT с refresh и списком отзыва не сокращает число сущностей;
localStorage увеличивает доступность токена для клиентского кода.
[OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
используется как основание для управления сроком, отзывом и cookie.

**Decision:** Все mutations требуют POST application/json и X-App-Request: web;
Origin должен точно совпадать с APP_ORIGIN. Для CLI без Origin заголовок обязателен.
Аутентифицированные mutations дополнительно требуют X-CSRF-Token, связанный с сессией.
Login защищён проверкой Origin и нестандартного заголовка до создания сессии.
me возвращает CSRF-токен только при действующей сессии и доверенном Origin
(или без Origin для CLI). CORS разрешает только APP_ORIGIN с credentials.
**Rationale:** SameSite не является единственной защитой; чтение чужим origin запрещено.
[Apollo CSRF](https://www.apollographql.com/docs/apollo-server/security/cors)
остаётся включённым; [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
обосновывает привязку токена к сессии. Не ослаблять политику ради стороннего Explorer.
Sandbox предназначен для публичных запросов; защищённые сценарии проверяются локально
в админке или CLI с cookie jar. Поведение embedded Sandbox проверяется отдельно в браузере.

## Публичные данные и ограничения сложности

**Decision:** Для одного profile репозиторий загружает профиль и связанные списки
фиксированным набором запросов (не более пяти SELECT для контента), без запросов на каждый
элемент. Запрос отдельной сущности — один SELECT. Публичные payload не содержат auth-полей.
**Rationale:** Это устраняет N+1 без DataLoader. Количество строк всё ещё влияет на объём ответа.
**Alternatives:** Lazy-resolvers и DataLoader понадобятся при нескольких профилях, не сейчас.
Контент ограничен глубиной 6 и 50 развёрнутыми полями; pure introspection — 20/2000
и не более 3 корневых полей. Смешанные операции не получают исключения. Документ/тело
<=64 KiB, HTTP batching отключён. Точные правила aliases/fragments и раннего прекращения
обхода закреплены в contracts/behavior.md; реальный Sandbox входит в обязательную проверку.

## Начальные данные

**Decision:** Транзакция под advisory lock проверяет SeedState(version=1). Если маркер есть —
ничего не меняет. Если его нет и профиль отсутствует — создаёт профиль со связями и маркер.
Если профиль уже существует — оставляет его нетронутым и записывает маркер.
**Rationale:** Повторный seed не восстанавливает удалённые проекты и не стирает правки.
**Alternatives:** upsert каждого элемента восстановил бы удалённые данные.
Admin создаётся отдельной локальной командой без предустановленного пароля.

## Деплой

**Decision:** Один Docker web service и managed PostgreSQL на Render, один экземпляр приложения.
Сначала миграции и seed отдельной release-командой, затем старт приложения.
Если тариф не предоставляет pre-deploy, выполнять release вручную из того же image
через разрешённое соединение с БД до публикации версии. Автоматический запуск приложения
не заменяет release-шаг и не создаёт администратора.
**Rationale:** Один origin и одна сборка упрощают эксплуатацию.
**Alternatives:** VPS с Compose допустим, но требует самостоятельной настройки TLS и резервирования.
[Render Docker](https://render.com/docs/docker), [порядок deploy](https://render.com/docs/deploys).
Pre-deploy зависит от тарифа; стоимость и аккаунт не согласованы. План не означает заказ услуг.
Исходники можно проверять локально до выбора тарифа. Перед сдачей нужны реальные данные
владельца и доступ к хостингу; это входные данные исполнения, не неизвестная архитектура.

## Проверенные семейства версий

**Decision:** Node 24 LTS (patch >=24.15), TypeScript 6, NestJS 12,
@nestjs/graphql и @nestjs/apollo 14, Apollo Server 5, Express 5 integration,
GraphQL 16.10+ последнего совместимого patch, Prisma 7, PostgreSQL 17,
React 19 и Vite 8. Точные версии записать в lockfile на этапе реализации после
проверки peer dependencies, чистой установки и сборки. Версии не объявляются уже проверенными сборкой.
**Rationale:** Выбраны поддерживаемые линии без Prisma 8 RC; Node 24 — Maintenance LTS.
**Alternatives:** Старые Nest11/Apollo4 нельзя механически смешивать с интеграцией14;
Node26 не обязателен. Nest12 требует ESM и актуального TypeScript.
Источники: [Node support](https://github.com/nodejs/Release),
[Nest migration](https://docs.nestjs.com/migration-guide),
[Apollo integration peer dependencies](https://raw.githubusercontent.com/nestjs/graphql/master/packages/apollo/package.json),
[PostgreSQL support](https://www.postgresql.org/support/versioning/),
[React versions](https://react.dev/versions), [Vite](https://vite.dev/guide/).
Backend тестируется после компиляции TypeScript, чтобы не терять decorator metadata
в стандартном frontend-transform; frontend использует Vitest, браузерные сценарии — Playwright.

## Уточнения после анализа

**Decision:** Настройка codegen, первая операция GetProfile и генерация SDK входят
в US1/T019, до Docker. US2/T028 подключает транспорт и использует уже созданный SDK.
Auth/CRUD operations добавляются по мере появления соответствующих серверных функций.
**Rationale:** Сборка раннего этапа не зависит от ещё не созданных задач позднего этапа.

**Decision:** direct локально; trusted-proxy с явным проверенным IP/CIDR allowlist на Render.
**Rationale:** Нельзя доверять первому адресу из произвольного X-Forwarded-For.
[Официальное руководство Express](https://expressjs.com/en/guide/behind-proxies/)
описывает доверие по адресам и определение источника справа налево.
**Alternatives:** trust proxy=true и фиксированное число hops отвергнуты, поскольку
не описывают доверие к каждому реальному пути. Универсальный allowlist Render здесь
не утверждается: реальные адреса и поведение ingress подтверждаются при подготовке
окружения T055/T056; отсутствие доказательств блокирует production-вход.
