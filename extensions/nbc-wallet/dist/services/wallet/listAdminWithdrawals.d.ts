type ListAdminWithdrawalsInput = {
    status?: string;
    walletAddress?: string;
    customerId?: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
};
export declare function listAdminWithdrawals(input?: ListAdminWithdrawalsInput): Promise<{
    items: {
        withdrawalId: any;
        uuid: any;
        walletId: any;
        customerId: any;
        customerEmail: any;
        walletAddress: any;
        chainId: any;
        tokenAddress: any;
        amount: number;
        txHash: any;
        walletTxId: any;
        status: any;
        requestedAt: any;
        approvedAt: any;
        approvedBy: any;
        processingAt: any;
        processedAt: any;
        failedAt: any;
        errorMessage: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export {};
