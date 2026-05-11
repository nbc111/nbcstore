export declare function refundOrderPayment(orderUuid: string, performedBy?: string): Promise<{
    orderUuid: string;
    orderId: any;
    refunded: boolean;
    alreadyRefunded: boolean;
    nbcAmount?: undefined;
    balanceAfter?: undefined;
} | {
    orderUuid: string;
    orderId: any;
    refunded: boolean;
    alreadyRefunded: boolean;
    nbcAmount: number;
    balanceAfter: number;
} | {
    orderUuid: string;
    orderId: any;
    refunded: boolean;
    nbcAmount: number;
    balanceAfter: number;
    alreadyRefunded?: undefined;
}>;
