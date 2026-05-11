export declare function listWalletTransactions(customerId: number, options?: {
    page?: number;
    limit?: number;
    transactionType?: string;
}): Promise<{
    items: {
        walletTxId: any;
        uuid: any;
        walletId: any;
        orderId: any;
        orderUuid: any;
        orderNumber: any;
        transactionType: any;
        amount: number;
        balanceBefore: number;
        balanceAfter: number;
        exchangeRate: number | null;
        cnyAmount: number | null;
        reference: any;
        status: any;
        metadata: any;
        createdAt: any;
    }[];
    currentPage: number;
    pageSize: number;
    total: number;
}>;
