export type AssignedDepositAddress = {
    walletId: number;
    walletAddress: string;
    depositAddress: string;
    addressIndex: number | null;
};
export declare function listAssignedDepositAddresses(): Promise<Map<string, AssignedDepositAddress>>;
