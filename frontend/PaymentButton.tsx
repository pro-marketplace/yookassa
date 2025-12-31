/**
 * YooKassa Extension - Payment Button
 *
 * Ready-to-use payment button component.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { useYookassa, openPaymentPage, CartItem } from "./useYookassa";

// =============================================================================
// TYPES
// =============================================================================

interface PaymentButtonProps {
  /** API URL for payment creation */
  apiUrl: string;
  /** Payment amount */
  amount: number;
  /** Customer email (required) */
  userEmail: string;
  /** Customer name */
  userName?: string;
  /** Customer phone */
  userPhone?: string;
  /** Payment description */
  description?: string;
  /** Return URL after payment */
  returnUrl: string;
  /** Cart items */
  cartItems?: CartItem[];
  /** Success callback */
  onSuccess?: (orderNumber: string) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Button text */
  buttonText?: string;
  /** CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PaymentButton({
  apiUrl,
  amount,
  userEmail,
  userName,
  userPhone,
  description,
  returnUrl,
  cartItems = [],
  onSuccess,
  onError,
  buttonText = "Оплатить",
  className = "",
  disabled = false,
}: PaymentButtonProps): React.ReactElement {
  const { createPayment, isLoading } = useYookassa({
    apiUrl,
    onSuccess: (response) => {
      onSuccess?.(response.order_number);
    },
    onError,
  });

  const handleClick = async () => {
    const response = await createPayment({
      amount,
      userEmail,
      userName,
      userPhone,
      description,
      returnUrl,
      cartItems,
    });

    if (response?.payment_url) {
      openPaymentPage(response.payment_url);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? "Загрузка..." : buttonText}
    </Button>
  );
}

export default PaymentButton;
