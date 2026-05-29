import { Contract, Wallet } from 'ethers';
export declare function getTreasurySigner(): {
    signer: Wallet;
    token: Contract;
    chain: import("./getChainRpcConfig.js").ChainRpcConfig;
};
