# Implementation Plan: Цифровая визитка с админкой

**Branch**: `001-digital-business-card` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-digital-business-card/spec.md`

## Summary

Создать backend на **TypeScript + NestJS**, предоставляющий GraphQL-профиль,
связанные данные и защищённый CRUD. Публичный React-сайт и админка используют этот API.
Один Nest-процесс раздаёт собранную SPA и API с одного origin; PostgreSQL хранит
контент, сессии и ограничения входа. Apollo Sandbox доступен проверяющему.
Архитектура — модульный монолит, без Redis, микросервисов и отдельного SSR-сервера.

Документ фиксирует проектирование. Файлов приложения и установленных зависимостей пока нет.

## Technical Context

**Language/Version**: TypeScript 6 strict; Node 24 LTS, актуальный patch >=24.15;
backend ESM, NodeNext, emitDecoratorMetadata и experimentalDecorators.

**Primary Dependencies**: NestJS 12/Express 5, @nestjs/graphql + @nestjs/apollo 14,
Apollo Server 5, GraphQL 16.10+, Prisma 7 + adapter-pg, React 19, Vite 8,
React Router, graphql-request, GraphQL Code Generator (@graphql-codegen/cli,
@graphql-codegen/typescript, @graphql-codegen/typescript-operations,
@graphql-codegen/typescript-graphql-request), class-validator/class-transformer, Argon2id.
Версии patch и npm фиксируются на старте реализации; согласованность проверяется
чистой установкой без подавления peer conflicts. Prisma CLI/client/adapter одной версии.

**Storage**: PostgreSQL 17 с миграциями, постоянным volume локально;
managed PostgreSQL на Render в production. Сессии и лимиты входа в той же БД.

**Testing**: backend node:test + Supertest на скомпилированном тестовом проекте
с decorator metadata, реальный отдельный PostgreSQL; Vitest/Testing Library для
значимого UI-поведения, Playwright для входа и CRUD. Без копирования реализации в тесты.

**Target Platform**: Linux Docker, современные браузеры; локальная разработка macOS/Linux
с Docker Compose. Локальный development proxy; один origin в production.

**Project Type**: web application, npm workspaces, два исходных приложения в одном репозитории.

**Performance Goals**: критерии SC-001–SC-006; техническая проверка — профиль с тремя
списками не требует более пяти SELECT контента, независимо от 1 или 100 элементов
в каждом списке. Отдельно учитывать SELECT сессии. SLA высокой нагрузки не заявляется.

**Constraints**: один профиль и администратор, сессия 24 часа, 5 ошибок входа/15 минут,
серверная валидация и защищённые mutations, SSR/регистрации/загрузки файлов нет.
Контентные queries/mutations: depth=6, expanded fields=50; pure introspection: 20/2000,
не более 3 корневых полей. Смешанные queries идут по 6/50. Документ/тело <=64 KiB,
batch off. Точные AST-правила и IP-политика — contracts/behavior.md.

**Scale/Scope**: персональная визитка, главная, вход и 4 раздела админки;
100 записей каждого типа — тестовый объём для проверки числа запросов, не продуктовый лимит.

## Constitution Check

Проверка выполнена до исследования и повторно после проектирования.

| Принцип | До | После: подтверждение |
|---|---|---|
| Проверяемый объём | PASS | FR-001–015 и SC-001–006 покрыты ниже; новых продуктовых функций нет |
| Разделение ответственности | PASS | resolver → service → repository → Prisma; типы хранения не экспортируются в web |
| Защита и данные | PASS | приватная сессия, CSRF/Origin, атомарные изменения, ограничения БД и валидация |
| Воспроизводимость | PASS | Docker, release/migrate/seed, no-op повторный seed, quickstart |
| Поведение и понятность | PASS | API/DB/browser проверки; README обосновывает решения и ограничения |

Необъяснённых отклонений нет; правила introspection и определения IP заданы в контракте.
Конкретный ingress allowlist является обязательной проверяемой конфигурацией выпуска.
Реальные данные владельца и доступ к хостингу нужны до финального выпуска.

## Project Structure

### Documentation (this feature)

```text
specs/001-digital-business-card/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── schema.graphql
    └── behavior.md
```

tasks.md создаётся следующим отдельным этапом.

### Source Code (repository root)

Планируемая структура, ещё не создана:

```text
apps/
├── api/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   ├── prisma/
│   │   ├── generated/prisma/       # сгенерировано, не коммитится
│   │   ├── profile/                # профиль, ссылки и связанные CRUD
│   │   ├── auth/                   # вход, сессии, guards, лимиты
│   │   ├── health/
│   │   └── cli/                    # create/reset администратора, seed
│   ├── prisma/schema.prisma
│   ├── prisma/migrations/
│   ├── prisma.config.ts
│   └── test/
└── web/
    ├── src/
    │   ├── api/                    # операции, graphql-request transport, generated/sdk.ts
    │   ├── pages/                  # публичная, login, admin
    │   └── components/             # формы и состояния
    └── test/
e2e/
Dockerfile
compose.yaml
.env.example
package.json
package-lock.json
README.md
.github/workflows/ci.yml
```

**Structure Decision**: ProfileModule группирует один небольшой контентный домен;
отдельные файлы services/repositories по сущностям допустимы без искусственного модуля
на каждую таблицу. AuthModule изолирован, общая PrismaModule предоставляет соединение.
Репозитории конкретные, без generic Repository<T> и отдельного DI-интерфейса для каждого класса.

## Запросы, формы и ошибки

[Контракт](contracts/schema.graphql) описывает операции, а [behavior.md](contracts/behavior.md) —
транспорт, авторизацию и UI. Query — чтение, mutation — изменение, resolver — обработчик
поля GraphQL, service — правила приложения, repository — обращения к хранилищу.
Сервисы возвращают явные объекты публичного контракта; auth не входит в Profile.
GraphQL code-first классы не являются Prisma-моделями.

DTO валидируются и в GraphQL pipeline, и при CLI-подготовке данных через общий набор
правил приложения. Проверка дат использует целиком итоговое состояние записи.
Порядок определяется sortOrder/createdAt/id. Дополнительные публичные queries дают
чтение одной записи для полной демонстрации CRUD. Вход через GraphQL login mutation.
UI отправляет один mutation за раз, не повторяет его автоматически при потере ответа.

### Генерируемый frontend SDK

Именованные операции хранятся в apps/web/src/api/*.graphql. Единственный generated
output — apps/web/src/api/generated/sdk.ts; он не редактируется вручную и не коммитится.
Schema source — локальный экспорт реально реализованной code-first схемы, а не сеть
и не проектная SDL с ещё не реализованными mutations. contracts/schema.graphql остаётся
целевым контрактом для сверки. Генерация должна завершаться ошибкой при невалидной операции.

Codegen использует plugins typescript, typescript-operations, typescript-graphql-request,
strictScalars=true, Date/DateTime как string, useTypeImports=true. getSdk(GraphQLClient)
даёт типизированные методы по именам GetProfile, Login, Me, Logout, CreateSkill и т. д.
Не генерировать универсальные запросы всех полей: selection sets задаются в operations.

apps/web/src/api/client.ts создаёт GraphQLClient('/graphql') с credentials=include
и единую обёртку SDK. X-App-Request: web и актуальный X-CSRF-Token устанавливаются
на каждый вызов из состояния памяти; после logout/expiry токен очищается, не захватывается
навсегда в closure первого входа. Ошибки HTTP, сети и GraphQL (в том числе HTTP200/errors)
приводятся к единому клиентскому формату; ClientError целиком в логи не выводится,
поскольку он может содержать variables с паролем. Mutations автоматически не повторяются.
Компоненты используют SDK через этот модуль, не дублируют fetch и DTO.

Root npm run api:generate выполняет compile/export server schema и генерацию SDK после
Prisma generate. Скрипт входит в build и CI до typecheck web. При изменении операции
или backend-контракта генерация повторяется; auth/CRUD documents появляются в T039/T050,
когда соответствующие поля уже реализованы на backend. Проверки клиента охватывают
типизацию переменных, обновление CSRF после повторного входа и безопасное отображение ошибок.

## Сборка, запуск и эксплуатация

- npm workspaces, один lockfile; generate Prisma → compile API → экспорт schema →
  codegen SDK/types из SDL и именованных operations → build web. В T019 до Docker T024
  создаются codegen config и первая операция GetProfile; SDK-плагин всегда получает
  хотя бы одну операцию. T028 подключает graphql-request transport и готовый SDK.
  Экспорт схемы работает без живой БД через отдельную
  schema factory, не запускает приложение и сидирование.
- Сборка Docker multi-stage на Debian slim Node24, non-root runtime; необходимая
  системная поддержка Argon2 проверяется в image. Выбранные image tags/digests фиксируются.
- Compose: db с healthcheck, одноразовый setup (migrate deploy + seed), app после
  успешного setup. База имеет named volume; app не хранит данные на своём диске.
- .env.example без секретов: DATABASE_URL, APP_ORIGIN, NODE_ENV, PORT, AUTH_RATE_KEY,
  CLIENT_IP_MODE, TRUSTED_PROXY_CIDRS. Локально direct, Render trusted-proxy с явным
  проверенным allowlist; числовое/безусловное trust proxy запрещено.
  Пароль администратора вводится через CLI, не добавляется в общий env приложения.
- Ошибочная конфигурация прекращает старт; ошибки БД отражаются в readiness.
  Graceful shutdown закрывает HTTP и Prisma connections.
- Render: Docker service + PostgreSQL, HTTPS/один origin, один экземпляр;
  release перед запуском. Тариф и аккаунт выбираются перед деплоем; IP/CIDR ingress
  и невозможность spoofing подтверждаются до выпуска входа по contracts/behavior.md.
  Неподтверждённая proxy-цепочка блокирует production-вход, а не ослабляет защиту.
- Логи: requestId, операция без variables, код результата; без паролей, cookies,
  session/CSRF tokens и сырых DB exceptions в ответе. Внутренний stack допустим в серверном
  журнале при отсутствии секретных параметров.
- CI: npm ci, generate, typecheck, lint, build, тесты с PostgreSQL, сверка схемы,
  Playwright smoke. Успешный CI не запускает публикацию автоматически.

## Проверки и покрытие требований

| Требования | Проверки |
|---|---|
| FR-001,002 | Реальный GraphQL query и introspection, браузерный Sandbox, nullable/пустые связи |
| FR-003,015 | Ширины 360/1440, клавиатура, loading/error/empty, безопасный текст и URL |
| FR-004–006 | Правильный/неправильный вход, me, logout, 24h expiry с управляемыми часами, Origin/CSRF, прямые mutations |
| FR-005 | Конкурирующие ошибки входа, два лимита, перезапуск, границы 15 минут, spoofed forwarding header |
| FR-007–010 | Реальный PostgreSQL, CRUD всех типов, уникальность, поля на границах, даты, порядок, NOT_FOUND |
| FR-011,012 | Playwright полный цикл, отмена удаления, двойной click, потерянный ответ, перезапуск и публичное чтение |
| FR-013,014 | Чистая БД, повторный seed после правок/удалений, два setup одновременно, CLI create/reset и README |

Тестовая БД отдельная; e2e не обращаются к production. Ожидания времени авторизации
проверяются с управляемыми часами, без ожидания суток. Проверка N+1 измеряет реальные SQL.
Контрактная проверка строит GraphQL schema и проверяет operations frontend;
результаты пока не заявляются: все эти проверки относятся к будущей реализации.

## Complexity Tracking

Отклонений от конституции нет. PostgreSQL-таблицы сессий, лимитов и seed-маркера
обоснованы отзывом доступа, сохранением ограничений после рестарта и защитой ручных правок.
Дополнительный HTTP health не является вторым бизнес-API.
