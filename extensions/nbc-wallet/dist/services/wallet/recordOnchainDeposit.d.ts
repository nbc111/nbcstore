type RecordOnchainDepositInput = {
    walletAddress: string;
    chainId: number;
    tokenAddress: string;
    txHash: string;
    logIndex: number;
    blockNumber: number;
    amount: number | string | bigint;
    metadata?: Record<string, unknown>;
};
export declare function recordOnchainDeposit(input: RecordOnchainDepositInput): Promise<{
    depositId: any;
    status: any;
    alreadyRecorded: boolean;
    walletId?: undefined;
} | {
    depositId: any;
    walletId: any;
    status: string;
    alreadyRecorded: boolean;
}>;
export {};
