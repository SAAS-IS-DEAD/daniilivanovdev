# Модель данных

Это логическая модель; Prisma schema и SQL-миграции создаются на этапе реализации.
Все ограничения длины и обязательности из spec.md применяются на сервере.
Строковые длины считаются по Unicode code points, пароли не trim/normalize.
Даты опыта — календарные YYYY-MM-DD, PostgreSQL date; «сегодня» определяется в UTC.
Служебное время — timestamptz, отдаётся ISO 8601 UTC.

| Сущность | Поля | Ограничения и связи |
|---|---|---|
| Profile | id=1, name, description, specialization?, createdAt, updatedAt | PK + CHECK id=1; единственность обеспечивается БД |
| ProfileLink | UUID id, profileId, label, url, position, createdAt | FK Profile; порядок задаётся позицией в массиве updateProfile |
| Skill | UUID id, profileId, name, normalizedName, sortOrder, createdAt, updatedAt | UNIQUE(profileId, normalizedName), FK Profile |
| Experience | UUID id, profileId, company, position, description?, startDate, endDate?, sortOrder, createdAt, updatedAt | FK Profile; CHECK endDate >= startDate при наличии |
| Project | UUID id, profileId, name, description, websiteUrl?, repositoryUrl?, imageUrl?, sortOrder, createdAt, updatedAt | FK Profile |
| Admin | id=1, email, normalizedEmail, passwordHash, createdAt, updatedAt | CHECK id=1; UNIQUE normalizedEmail; нет публичного GraphQL-типа |
| Session | UUID id, adminId, tokenHash, csrfToken, createdAt, expiresAt, revokedAt? | UNIQUE tokenHash; FK Admin; индекс expiresAt |
| LoginAttemptWindow | keyHash, windowStartedAt, failureCount | keyHash PK, ключи отдельно для IP и email; сброс окна после 15 минут |
| SeedState | version=1, appliedAt | PK version; маркер первичного заполнения |

UUID генерируются сервером; идентификаторы, даты создания и auth-поля не принимаются
в контентных inputs. Для всех FK профиль/администратор удаляются с RESTRICT;
публичных операций их удаления нет. Удаление дочерней записи физическое.
Нормализация skill/email: trim + Unicode NFC + lowercase без зависимости от locale.
Уникальность навыка проверяется БД; конфликт параллельных записей → CONFLICT.
Сортировка: sortOrder ASC, createdAt ASC, id ASC; индекс по profileId и этим полям.
Публичные ссылки сортируются по position. Текст показывается без интерпретации HTML.
HTTP/HTTPS URL проверяется парсером; backend не загружает ресурс по пользовательскому URL.

## Обновления и транзакции

- Update inputs являются полным представлением редактируемой формы, не patch.
  Обязательные поля передаются каждый раз; пропущенное nullable-поле очищается в null.
  Пустая необязательная строка нормализуется в null. Пустая обязательная — ошибка.
- updateProfile атомарно обновляет профиль и полностью заменяет links в порядке массива.
  Отсутствующий профиль → NOT_FOUND, а не неявное создание.
- update/delete дочернего объекта проверяют существование и принадлежность единственному
  профилю; отсутствие → NOT_FOUND. Последнее сохранение выигрывает.
- SeedState и весь начальный контент создаются в одной транзакции под advisory lock.
  Обычный seed не меняет уже подготовленные данные, включая ранее удалённые записи.
- Admin create отказывает, если запись уже есть. Reset password изменяет hash и отзывает
  все сеансы одной транзакцией; пароль вводится скрыто в CLI или через защищённое окружение.

## Состояния доступа

Сеанс создаётся после успешной проверки пароля: token — 32 случайных байта,
csrfToken — независимые 32 случайных байта. Cookie хранит token; база — SHA-256(token).
csrfToken не является средством входа и возвращается только владельцу активного сеанса.
ACTIVE означает revokedAt=null и now < expiresAt. Переходы: ACTIVE → REVOKED при выходе
или reset; ACTIVE → EXPIRED по абсолютному сроку 24 часа. Продления нет.
Отзыв повторного logout с валидным сеансом безопасен; без сеанса logout → UNAUTHENTICATED,
клиент в любом случае очищает своё состояние входа. Cookie очищается сервером.
Очистка устаревших Session и LoginAttemptWindow выполняется периодически с ограниченным batch.

## Ограничение входа

Для каждой попытки вычисляются два HMAC-ключа с AUTH_RATE_KEY: нормализованный email и IP.
Два ключа блокируются в стабильном порядке транзакционными advisory locks, затем
проверяется окно и пароль. Это сериализует конкурирующие попытки для одного ключа;
проверка Argon2 выполняется под короткой транзакцией с согласованным timeout.
Сначала лимит: failureCount >= 5 в действующем окне → RATE_LIMITED без проверки пароля.
Неуспех увеличивает оба счётчика; истёкшее окно начинается заново с первого неуспеха.
Успех не обнуляет действующие окна, чтобы не обходить лимит IP. Для несуществующего
email проверяется заранее подготовленный dummy hash; сообщение одинаковое.
retryAfterSeconds — максимум оставшегося времени по заблокированным ключам.
Источник IP определяется по CLIENT_IP_MODE и TRUSTED_PROXY_CIDRS строго по
contracts/behavior.md: direct игнорирует forwarded headers; trusted-proxy использует
проверенный allowlist и первый недоверенный адрес справа налево. IPv4-mapped IPv6
нормализуется до вычисления HMAC. Перезапуск сохраняет лимиты в БД.
