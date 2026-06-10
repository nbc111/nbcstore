export declare function captureOrderPayment(orderUuid: string, customerId: number): Promise<{
    orderUuid: string;
    orderId: any;
    nbcAmount: string;
    cnyAmount: string;
    exchangeRate: string;
    balanceAfter: number | null;
    alreadyCaptured: boolean;
} | {
    orderUuid: string;
    orderId: any;
    nbcAmount: null;
    cnyAmount: null;
    exchangeRate: null;
    balanceAfter: null;
    alreadyCaptured: boolean;
} | {
    orderUuid: string;
    orderId: any;
    nbcAmount: number;
    cnyAmount: number;
    exchangeRate: number;
    balanceAfter: number;
    alreadyCaptured?: undefined;
}>;
