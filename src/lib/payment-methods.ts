export type PaymentMethodType = 'PAYPAY' | 'PAYPAY_MERCHANT' | 'STRIPE' | 'BANK' | 'CASH';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
    PAYPAY: 'PayPay',
    PAYPAY_MERCHANT: 'PayPay (加盟店)',
    STRIPE: 'Stripe',
    BANK: '銀行振込',
    CASH: '現金支払い',
};

export function getPaymentMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method as PaymentMethodType] || method;
}

export function getPaymentMethodLabelForLine(method: string): string {
    const labels: Record<string, string> = {
        PAYPAY: 'PayPay',
        PAYPAY_MERCHANT: 'PayPay加盟店',
        STRIPE: 'Stripe',
        BANK: '銀行振込',
        CASH: '現金支払い',
    };
    return labels[method] || method;
}

