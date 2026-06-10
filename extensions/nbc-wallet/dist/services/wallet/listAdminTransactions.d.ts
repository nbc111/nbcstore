type ListAdminTransactionsInput = {
    walletId?: number;
    customerId?: number;
    walletAddress?: string;
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
};
export declare function listAdminTransactions(input?: ListAdminTransactionsInput): Promise<{
    items: {
        walletTxId: any;
        uuid: any;
        walletId: any;
        walletAddress: any;
        customerId: any;
        customerEmail: any;
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
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export {};
