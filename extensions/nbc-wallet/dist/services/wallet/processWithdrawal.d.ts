export declare function processWithdrawal(withdrawalUuid: string, performedBy?: string): Promise<{
    withdrawalUuid: string;
    status: string;
    txHash: any;
    alreadyProcessed: boolean;
    balanceAfter?: undefined;
    frozenBalance?: undefined;
} | {
    withdrawalUuid: string;
    status: string;
    txHash: any;
    balanceAfter: number;
    frozenBalance: number;
    alreadyProcessed?: undefined;
}>;
