import { Contract, Wallet } from 'ethers';
export declare function getTreasurySigner(): {
    signer: Wallet;
    token: Contract | null;
    chain: import("./getChainRpcConfig.js").ChainRpcConfig;
};
