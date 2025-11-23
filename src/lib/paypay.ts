import PAYPAY from '@paypayopa/paypayopa-sdk-node';

interface PayPayConfig {
    apiKey: string;
    apiSecret: string;
    merchantId: string;
}

interface PayPayPaymentResult {
    success: boolean;
    paymentUrl?: string;
    paymentId?: string;
    error?: string;
}

export async function createPayPayPayment(
    config: PayPayConfig,
    merchantPaymentId: string,
    amount: number,
    orderDescription: string
): Promise<PayPayPaymentResult> {
    const { apiKey, apiSecret, merchantId } = config;

    // Configure PayPay SDK
    PAYPAY.Configure({
        clientId: apiKey,
        clientSecret: apiSecret,
        merchantId: merchantId,
        productionMode: process.env.PAYPAY_ENV === 'production',
    });

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/complete`;

    const payload = {
        merchantPaymentId,
        amount: {
            amount,
            currency: 'JPY',
        },
        codeType: 'ORDER_QR',
        orderDescription,
        redirectUrl,
        redirectType: 'WEB_LINK',
        userAgent: 'Mozilla/5.0',
    };

    try {
        console.log('PayPay API Request:', {
            merchantId,
            amount,
            merchantPaymentId,
            redirectUrl,
        });

        const response = await PAYPAY.QRCodeCreate(payload) as { STATUS: number; BODY: Record<string, unknown> };
        const body = response.BODY as {
            resultInfo?: { code?: string; message?: string };
            data?: { url?: string };
        };

        console.log('PayPay API Response:', {
            status: response.STATUS,
            resultCode: body?.resultInfo?.code,
            resultMessage: body?.resultInfo?.message,
        });

        if (body?.resultInfo?.code === 'SUCCESS') {
            return {
                success: true,
                paymentUrl: body.data?.url,
                paymentId: merchantPaymentId,
            };
        }

        console.error('PayPay API error:', JSON.stringify(body, null, 2));
        const errorCode = body?.resultInfo?.code || 'UNKNOWN';
        const errorMessage = body?.resultInfo?.message || 'Unknown error';
        return {
            success: false,
            error: `${errorCode}: ${errorMessage}`,
        };
    } catch (e) {
        console.error('PayPay API request failed:', e);
        return {
            success: false,
            error: 'Request failed',
        };
    }
}

export async function getPaymentStatus(
    config: PayPayConfig,
    merchantPaymentId: string
): Promise<{ status: string; paid: boolean }> {
    const { apiKey, apiSecret, merchantId } = config;

    // Configure PayPay SDK
    PAYPAY.Configure({
        clientId: apiKey,
        clientSecret: apiSecret,
        merchantId: merchantId,
        productionMode: process.env.PAYPAY_ENV === 'production',
    });

    try {
        const response = await PAYPAY.GetCodePaymentDetails([merchantPaymentId]) as { STATUS: number; BODY: Record<string, unknown> };
        const body = response.BODY as {
            resultInfo?: { code?: string };
            data?: { status?: string };
        };

        if (body?.resultInfo?.code === 'SUCCESS') {
            const status = body.data?.status || 'UNKNOWN';
            return {
                status,
                paid: status === 'COMPLETED',
            };
        }

        return { status: 'UNKNOWN', paid: false };
    } catch (e) {
        console.error('PayPay status check failed:', e);
        return { status: 'ERROR', paid: false };
    }
}
