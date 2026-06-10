/**
 * Approve a withdrawal request.
 *
 * State machine: requested → approved
 *
 * This is the "human review" gate that separates the approval decision from
 * the actual on-chain transfer (handled by processWithdrawal). Keeping them
 * separate enables dual-control workflows and audit trails.
 */
export declare function approveWithdrawal(withdrawalUuid: string, performedBy?: string): Promise<{
    withdrawalUuid: string;
    withdrawalId: any;
    walletId: any;
    customerId: any;
    amount: number;
    walletAddress: any;
    status: "approved";
    approvedBy: string;
    alreadyApproved: boolean;
} | {
    withdrawalUuid: string;
    status: string;
    alreadyApproved: boolean;
}>;
