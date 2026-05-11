export declare function processOnchainDeposits(): Promise<{
    enabled: boolean;
    fromBlock: null;
    toBlock: null;
    latestBlock: number;
    processed: number;
    settled: number;
} | {
    enabled: boolean;
    fromBlock: number;
    toBlock: number;
    latestBlock: number;
    processed: number;
    settled: number;
}>;
