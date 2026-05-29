export declare function failWithdrawal(withdrawalUuid: string, reason: string, performedBy?: string): Promise<{
    withdrawalUuid: string;
    status: string;
    alreadyFailed: boolean;
    frozenBalance?: undefined;
    errorMessage?: undefined;
} | {
    withdrawalUuid: string;
    status: string;
    frozenBalance: number;
    errorMessage: string;
    alreadyFailed?: undefined;
}>;
