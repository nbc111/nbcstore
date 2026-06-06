/**
 * Reject or cancel a withdrawal and restore the user's balance.
 *
 * Balance restoration depends on the current status:
 *
 * • `requested` / `approved`:
 *     processWithdrawal Phase 1 has NOT run yet.
 *     State: balance unchanged, frozen_balance += amount  (set by requestWithdrawal)
 *     Restore: frozen_balance -= amount
 *
 * • `processing`:
 *     processWithdrawal Phase 1 has already committed:
 *       balance -= amount, frozen_balance -= amount  (net: balance is down, frozen is back to pre-request level)
 *     MUST only be called after confirming the on-chain tx was NOT mined.
 *     Restore: balance += amount  (frozen_balance is already correct)
 */
export declare function failWithdrawal(withdrawalUuid: string, reason: string, performedBy?: string): Promise<{
    withdrawalUuid: string;
    withdrawalId: any;
    walletId: any;
    customerId: any;
    status: "failed";
    previousStatus: any;
    amount: number;
    balanceRestored: number;
    frozenBalance: number;
    errorMessage: string;
} | {
    withdrawalUuid: string;
    status: string;
    alreadyFailed: boolean;
}>;
