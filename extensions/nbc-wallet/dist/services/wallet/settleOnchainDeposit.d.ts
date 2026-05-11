export declare function settleOnchainDeposit(depositId: number): Promise<{
    depositId: number;
    walletTxId: any;
    status: string;
    alreadySettled: boolean;
    walletId?: undefined;
    amount?: undefined;
    balanceAfter?: undefined;
} | {
    depositId: number;
    status: string;
    alreadySettled: boolean;
    walletTxId?: undefined;
    walletId?: undefined;
    amount?: undefined;
    balanceAfter?: undefined;
} | {
    depositId: number;
    walletId: any;
    walletTxId: any;
    status: string;
    amount: string;
    balanceAfter: string;
    alreadySettled: boolean;
}>;
