# Quickstart и приёмочная проверка

Статус: проектный сценарий. Команды ниже — контракт будущих npm scripts и Compose,
сейчас ещё не исполняются: приложение, Dockerfile и package.json не созданы.
Реализация должна сделать их рабочими и перенести инструкцию в README.

## Предпосылки

Git, Docker с Compose v2; для разработки вне контейнера — Node24 поддерживаемого patch
и npm закреплённой версии. Порты 3000 (app) и 5432 (локальная БД) свободны.
Реальный контент предоставляется владельцем; до этого seed явно демонстрационный.

## Первый запуск

```sh
cp .env.example .env
```

Заполнить локальную конфигурацию по подсказкам .env.example, включая случайный AUTH_RATE_KEY
и пароль локальной БД, до запуска compose. APP_ORIGIN=http://localhost:3000,
CLIENT_IP_MODE=direct; TRUSTED_PROXY_CIDRS оставить пустым.

После заполнения .env выполнить:

```sh
docker compose up --build -d
```

Compose ждёт готовности db и успешного setup (миграции + seed) перед app.
При ошибке setup приложение не считается успешно запущенным.

```sh
docker compose ps
docker compose logs setup
curl --fail http://localhost:3000/health/ready
```

Ожидается: ready HTTP200, сайт http://localhost:3000 и Sandbox
http://localhost:3000/graphql доступны. GET /admin/projects после обновления страницы
возвращает SPA, а /graphql и /health не перехватываются SPA fallback.

Создание администратора: команда спрашивает email и скрытый пароль, не принимает
пароль аргументом shell и не печатает его в логах.

```sh
docker compose exec app npm run admin:create --workspace apps/api
```

Повторное создание отказывает. Восстановление доступа:

```sh
docker compose exec app npm run admin:reset-password --workspace apps/api
```

Ожидается смена пароля и отзыв всех старых сеансов.

## Публичный запрос

Открыть Sandbox и выполнить:

```graphql
query BusinessCard {
  profile {
    name
    description
    skills { name }
    experience { company position }
    projects { name }
  }
}
```

Ожидается заполненный профиль без входа; name-only query возвращает только name.
Значения паролей, их хеши и session tokens не возвращаются в ответах. Поле
LoginInput.password видно в introspection как часть входного контракта; это описание
поля, а не сохранённый пароль. CSRF-токен доступен только владельцу активной сессии.

Эквивалентная проверка транспортом:

```sh
curl --fail-with-body http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { profile { name skills { name } } }"}'
```

Проверять и HTTP-код, и массив errors: HTTP200 сам по себе не означает успешную операцию.

## Вход и управление

1. Открыть /admin/login, войти созданной учётной записью; обновить страницу.
2. Изменить профиль и ссылки; в отдельном окне без входа перечитать публичную страницу.
3. Для навыка, опыта и проекта выполнить create → read → update → delete.
4. Проверить изменение порядка, совпадающие sortOrder, пустые списки, отмену удаления.
5. Ввести пробельное имя, дублирующий навык с другим регистром, неверный URL,
   будущую дату и конец раньше начала. Сохранение отклоняется без изменения БД.
6. Выйти; повторить старую mutation с прежней cookie и CSRF-токеном — отказ.
7. Проверить ширины 360/1440, управление клавиатурой и видимый фокус.

Для CLI login передавать JSON через stdin/файл с ограниченным доступом,
X-App-Request: web и cookie jar. Пароль не включать в командную строку.
Для mutations после login использовать cookie jar и csrfToken из Viewer в X-CSRF-Token.
Логи и скриншоты с cookie/token не публиковать. Полный транспортный контракт —
[contracts/behavior.md](contracts/behavior.md).

## Повторный запуск и данные

После изменения профиля и удаления одного начального проекта:

```sh
docker compose run --rm setup
docker compose run --rm setup
docker compose restart app
```

Ожидается: правки сохранились, дубликатов нет, удалённый проект не восстановился.
Существующая учётная запись не меняется. Не удалять volume при обычном перезапуске.
Чистый запуск проверять в отдельном Compose project с отдельным volume, не на рабочей БД.

## Проверки разработки

Планируемые root scripts, после создания приложения:

```sh
npm ci
npm run db:generate
npm run api:generate
npm run typecheck
npm run lint
npm run build
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:e2e
```

Интеграционные scripts создают/используют отдельную тестовую БД, применяют миграции
и завершаются ошибкой при совпадении тестового и рабочего подключения.
В браузерном CI устанавливаются зависимости Playwright. Проверка контрактов сравнивает
каноническую сгенерированную SDL с contracts/schema.graphql и валидирует клиентские операции.
Все различия требуют явного обновления контракта, не автоматического принятия snapshot.
api:generate компилирует/экспортирует текущую серверную схему без живой БД и создаёт
apps/web/src/api/generated/sdk.ts из неё и именованных .graphql операций. Ожидается
типизированный getSdk с методами GetProfile/Login/CreateSkill по реализованным операциям.
После изменения схемы/операций повторить генерацию; вручную SDK не редактировать.
Удаление используемого поля должно ломать генерацию, неверные variables — проверку типов.
Проверить credentials, смену/очистку CSRF и обработку GraphQL errors без вывода пароля в логи.

Дополнительно: проверки 24h expiry с управляемыми часами, Origin/CSRF, пяти ошибок входа,
конкурирующих попыток и seed, числа SQL на 1/100 записей. Подробности в plan.md.

## Проверка размещённого приложения

Собрать тот же image, настроить managed PostgreSQL и HTTPS origin, выполнить release
(migrate deploy + seed) до старта web service. Проверить /health/ready, сайт и Sandbox
в production-режиме, а также отсутствие доступа к mutations без входа.
До включения production-входа настроить CLIENT_IP_MODE=trusted-proxy и проверенный
TRUSTED_PROXY_CIDRS, выполнить проверки двух источников и spoofed forwarded headers
из contracts/behavior.md. При невозможности подтвердить цепочку вход не публиковать.
Создать администратора отдельной операционной командой. В README указать URL сайта,
Sandbox и Git-репозитория; проверяющему предложить локальный экземпляр для admin-сценариев.
Приложение не готово к сдаче, пока демонстрационный контент не заменён предоставленными
реальными данными и фактические результаты проверок не зафиксированы.
