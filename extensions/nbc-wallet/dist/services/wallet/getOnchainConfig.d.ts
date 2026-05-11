export type NbcOnchainConfig = {
    enabled: boolean;
    rpcUrl: string;
    chainId: number;
    tokenAddress: string;
    treasuryAddress: string;
    startBlock: number;
    confirmations: number;
    blockBatchSize: number;
    pollSchedule: string;
    reconcileSchedule: string;
};
export declare function getOnchainConfig(): NbcOnchainConfig;
export declare function assertOnchainConfig(config?: NbcOnchainConfig): void;
