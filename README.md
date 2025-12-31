# YooKassa Extension

Приём платежей через ЮKassa (Яндекс.Касса). **2 функции**: создание платежа + webhook.

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

1. Войди в [Личный кабинет](https://yookassa.ru/my)
2. **Настройки → Магазин** → скопируй `shopId`
3. **Интеграция → API-ключи** → создай секретный ключ
4. **Интеграция → HTTP-уведомления** → добавь URL webhook:
   ```
   https://functions.poehali.dev/xxx-webhook
   ```
   Выбери события: `payment.succeeded`, `payment.canceled`

---

## API

### POST /yookassa — создание платежа

```json
// Request
{
  "amount": 1500.00,
  "user_email": "user@example.com",
  "user_name": "Иван Иванов",
  "user_phone": "+79991234567",
  "description": "Заказ #123",
  "return_url": "https://your-site.com/checkout/success",
  "cart_items": [
    { "id": "1", "name": "Товар", "price": 1500, "quantity": 1 }
  ]
}

// Response
{
  "payment_url": "https://yookassa.ru/checkout/...",
  "payment_id": "2d4d5e6f-...",
  "order_id": 123,
  "order_number": "YK-20241231-A1B2C3D4"
}
```

### POST /yookassa-webhook — уведомления от ЮKassa

Автоматически обновляет статус заказа при событиях:
- `payment.succeeded` → status = 'paid'
- `payment.canceled` → status = 'canceled'

---

## Frontend

| Файл | Описание |
|------|----------|
| `useYookassa.ts` | Хук для создания платежей |
| `PaymentButton.tsx` | Готовая кнопка оплаты |

```tsx
import { PaymentButton } from "./PaymentButton";

<PaymentButton
  apiUrl="https://functions.poehali.dev/xxx"
  amount={2500}
  userEmail="user@example.com"
  userName="Иван Иванов"
  returnUrl="https://your-site.com/success"
  cartItems={cartItems}
  onSuccess={(orderNumber) => {
    console.log("Заказ создан:", orderNumber);
  }}
/>
```

---

## Поток оплаты

```
1. Пользователь нажимает "Оплатить"
2. Frontend → POST /yookassa → создаёт заказ в БД
3. Backend → YooKassa API → получает payment_url
4. Редирект пользователя на страницу оплаты ЮKassa
5. После оплаты → редирект на return_url
6. YooKassa → POST /yookassa-webhook → обновляет статус заказа
```

---

## Статусы заказа

| Статус | Описание |
|--------|----------|
| `pending` | Создан, ожидает оплаты |
| `paid` | Успешно оплачен |
| `canceled` | Отменён |
