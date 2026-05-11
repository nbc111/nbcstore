export declare function getWalletSummary(customerId: number): Promise<{
    walletId: any;
    uuid: any;
    customerId: any;
    walletAddress: any;
    chainId: any;
    balance: number;
    frozenBalance: number;
    availableBalance: number;
    currency: string;
    status: any;
    exchangeRate: number;
    cnyValue: number;
    availableCnyValue: number;
    lastLoginAt: any;
    createdAt: any;
    updatedAt: any;
} | null>;
