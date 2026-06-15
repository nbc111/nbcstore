export declare function ensureWalletDepositAddress(customerId: number): Promise<{
    mode: "treasury";
    depositAddress: string | null;
    addressIndex: null;
    chainId: number;
    tokenAddress: string;
    walletId?: undefined;
    customerId?: undefined;
} | {
    mode: "hd";
    walletId: any;
    customerId: any;
    depositAddress: any;
    addressIndex: number | null;
    chainId: number;
    tokenAddress: string;
}>;
