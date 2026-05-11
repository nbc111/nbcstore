type AdjustmentType = 'credit' | 'debit';
type AdjustWalletBalanceInput = {
    walletId?: number;
    customerId?: number;
    walletAddress?: string;
    type: AdjustmentType;
    amount: number;
    reason: string;
    reference?: string;
    performedBy: string;
};
export declare function adjustWalletBalance(input: AdjustWalletBalanceInput): Promise<{
    walletId: any;
    customerId: any;
    walletAddress: any;
    transactionId: any;
    transactionType: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: string;
    reference: string | null;
}>;
export {};
