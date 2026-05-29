type RequestWithdrawalInput = {
    customerId: number;
    amount: number;
};
export declare function requestWithdrawal(input: RequestWithdrawalInput): Promise<{
    withdrawalId: any;
    amount: number;
    walletAddress: any;
    frozenBalance: number;
}>;
export {};
