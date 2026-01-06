# YooKassa Extension

Приём платежей через ЮKassa. **2 функции**: создание платежа + webhook.

---

## Для ассистента: перед интеграцией

1. **Проверь таблицу orders** — должны быть ВСЕ столбцы из SQL ниже. Если таблица уже есть, добавь недостающие:
   ```sql
   -- Проверь наличие столбцов, добавь если нет:
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS yookassa_payment_id VARCHAR(100);
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_url TEXT;
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
   ```
2. Добавь переменные `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`
3. **После деплоя обязательно:** [настрой HTTP-уведомления](https://yookassa.ru/my/merchant/integration/http-notifications):
   - Укажи URL webhook функции
   - **Отметь ВСЕ чекбоксы:**
     - `payment.waiting_for_capture`
     - `payment.succeeded`
     - `payment.canceled`
     - `refund.succeeded`
4. **Создай страницу статуса заказа** — на неё ЮKassa перенаправит пользователя после оплаты. Страница должна показывать статус заказа и благодарность за покупку.

---

## Установка

### 1. База данных

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    yookassa_payment_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100),
    product_name VARCHAR(255),
    product_price DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_payment_id ON orders(yookassa_payment_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### 2. Переменные окружения

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `MAIN_DB_SCHEMA` | Схема БД |
| `YOOKASSA_SHOP_ID` | Shop ID из кабинета ЮKassa |
| `YOOKASSA_SECRET_KEY` | Секретный ключ API |

### 3. Настройка в кабинете ЮKassa

1. [Личный кабинет](https://yookassa.ru/my/payments) → в шапке виден `shopId`
2. [API-ключи](https://yookassa.ru/my/merchant/integration/api-keys) → создай секретный ключ
3. [HTTP-уведомления](https://yookassa.ru/my/merchant/integration/http-notifications) → добавь URL webhook и выбери события:
   - `payment.succeeded` — успешный платёж
   - `payment.waiting_for_capture` — платёж нужно подтвердить
   - `payment.canceled` — отмена платежа
   - `refund.succeeded` — успешный возврат

---

## API

### POST /yookassa — создание платежа

```json
{
  "amount": 1500.00,
  "user_email": "user@example.com",
  "user_name": "Иван Иванов",
  "return_url": "https://your-site.com/success",
  "cart_items": [{ "id": "1", "name": "Товар", "price": 1500, "quantity": 1 }]
}
```

**Ограничения:**
- `amount`: 1 — 1 000 000 RUB
- `user_email`: валидный email (нужен для чека)
- `return_url`: только HTTPS
- `cart_items`: опционально (если не передан, создаётся один item с суммой)

### POST /yookassa-webhook — уведомления

Автоматически обновляет статус заказа.

---

## Frontend

```tsx
import { PaymentButton } from "./PaymentButton";

<PaymentButton
  apiUrl="https://functions.poehali.dev/xxx"
  amount={2500}
  userEmail="user@example.com"
  returnUrl="https://your-site.com/success"
  onSuccess={(orderNumber) => console.log(orderNumber)}
/>
```

---

## Безопасность

### Webhook верификация

YooKassa не использует подписи для webhook. Вместо этого каждый webhook подтверждается GET-запросом к API (`/v3/payments/{id}`) — это рекомендуемый способ.

### Валидация входных данных

- Email проверяется regex
- URL должен быть HTTPS
- Сумма ограничена 1 — 1 000 000 RUB

---

## Тестовый режим

В кабинете ЮKassa включи тестовый режим. Тестовые карты:
- `5555 5555 5555 4477` — успешная оплата
- `5555 5555 5555 4444` — отклонённая оплата

**Важно:** Тестируй оплату в отдельной вкладке браузера! YooMoney блокирует iframe — в среде разработки платёжная страница не откроется.

---

## Статусы заказа

| Статус | Описание |
|--------|----------|
| `pending` | Ожидает оплаты |
| `paid` | Оплачен |
| `canceled` | Отменён |

---

## После установки

**ОБЯЗАТЕЛЬНО:** Последним шагом добавь кнопку оплаты на фронтенд, чтобы пользователь сразу видел результат!

Используй компоненты из `/frontend`:
- `PaymentButton.tsx` — кнопка оплаты
- `useYookassa.ts` — хук для работы с API

**Скажи пользователю:**

> ✅ Оплата через ЮKassa настроена!
