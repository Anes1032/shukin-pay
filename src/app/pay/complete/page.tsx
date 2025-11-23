'use client';

export default function PaymentCompletePage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-white text-xl font-bold">決済処理が完了しました</h1>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-gray-600">
                            ご利用ありがとうございました。
                        </p>
                        <p className="text-gray-500 text-sm mt-4">
                            このページを閉じてください。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
