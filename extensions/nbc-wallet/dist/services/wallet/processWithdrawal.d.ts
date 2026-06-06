/**
 * Two-phase withdrawal processing to prevent double-spend:
 *
 * Phase 1 (DB transaction):
 *   - Validate withdrawal (status, balance)
 *   - Deduct balance and frozen_balance atomically
 *   - Mark as `processing` and commit
 *   Idempotency gate: concurrent retries see `processing` and abort early.
 *
 * Phase 2 (outside DB transaction):
 *   - Execute on-chain token.transfer()
 *   - Success → update status to `completed`, write tx_hash
 *   - Failure → restore balance, mark as `failed`
 *
 * If Phase 2 DB write fails after a successful chain tx, the row stays in
 * `processing`. A reconcile job must detect and finalise it — do NOT re-run
 * the chain transfer.
 */
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
    txHash: string;
    balanceAfter: number;
    frozenBalance: number;
    alreadyProcessed?: undefined;
}>;
