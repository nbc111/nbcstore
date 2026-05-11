export declare function reconcileWalletLedger(limit?: number): Promise<{
    scanned: number;
    completed: number;
    unmatched: number;
    failed: number;
}>;
