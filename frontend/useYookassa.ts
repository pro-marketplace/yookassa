/**
 * YooKassa Extension - useYookassa Hook
 *
 * React hook for creating payments via YooKassa.
 */
import { useState, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
}

export interface PaymentPayload {
  amount: number;
  userEmail: string;
  userName?: string;
  userPhone?: string;
  description?: string;
  returnUrl: string;
  cartItems?: CartItem[];
}

export interface PaymentResponse {
  payment_url: string;
  payment_id: string;
  order_id: number;
  order_number: string;
}

interface UseYookassaOptions {
  apiUrl: string;
  onSuccess?: (response: PaymentResponse) => void;
  onError?: (error: Error) => void;
}

interface UseYookassaReturn {
  createPayment: (payload: PaymentPayload) => Promise<PaymentResponse | null>;
  isLoading: boolean;
  error: Error | null;
  paymentUrl: string | null;
  orderNumber: string | null;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Open payment page (new tab on mobile, same tab on desktop)
 */
export function openPaymentPage(url: string): void {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.open(url, "_blank");
  } else {
    window.location.href = url;
  }
}

/**
 * Format phone number to +7 (XXX) XXX-XX-XX
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return phone;

  const country = digits[0] === "8" ? "7" : digits[0];
  const area = digits.slice(1, 4);
  const first = digits.slice(4, 7);
  const second = digits.slice(7, 9);
  const third = digits.slice(9, 11);

  return `+${country} (${area}) ${first}-${second}-${third}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone (11 digits)
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11;
}

// =============================================================================
// HOOK
// =============================================================================

export function useYookassa(options: UseYookassaOptions): UseYookassaReturn {
  const { apiUrl, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const createPayment = useCallback(
    async (payload: PaymentPayload): Promise<PaymentResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Convert camelCase to snake_case for API
        const body = {
          amount: payload.amount,
          user_email: payload.userEmail,
          user_name: payload.userName || "",
          user_phone: payload.userPhone || "",
          description: payload.description || "Оплата заказа",
          return_url: payload.returnUrl,
          cart_items: payload.cartItems || [],
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка создания платежа");
        }

        setPaymentUrl(data.payment_url);
        setOrderNumber(data.order_number);

        // Save pending order to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "yookassa_pending_order",
            JSON.stringify({
              order_number: data.order_number,
              order_id: data.order_id,
              payment_id: data.payment_id,
              created_at: new Date().toISOString(),
            })
          );
        }

        onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, onSuccess, onError]
  );

  return {
    createPayment,
    isLoading,
    error,
    paymentUrl,
    orderNumber,
  };
}

export default useYookassa;
