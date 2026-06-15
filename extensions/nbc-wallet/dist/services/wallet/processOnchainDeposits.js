import { Interface, JsonRpcProvider, id, zeroPadValue } from 'ethers';
import { assertOnchainConfig, getOnchainConfig } from './getOnchainConfig.js';
import { getSyncState } from './getSyncState.js';
import { listAssignedDepositAddresses } from './listAssignedDepositAddresses.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
import { recordOnchainDeposit } from './recordOnchainDeposit.js';
import { setSyncState } from './setSyncState.js';
import { settleOnchainDeposit } from './settleOnchainDeposit.js';
const TRANSFER_EVENT = 'event Transfer(address indexed from, address indexed to, uint256 value)';
const transferInterface = new Interface([TRANSFER_EVENT]);
const TRANSFER_TOPIC = id('Transfer(address,address,uint256)');
function topicAddress(address) {
    return zeroPadValue(address, 32);
}
async function getDepositLogs(provider, config, fromBlock, toBlock) {
    if (config.depositMode === 'treasury') {
        return {
            logs: await provider.getLogs({
                address: config.tokenAddress,
                fromBlock,
                toBlock,
                topics: [TRANSFER_TOPIC, null, topicAddress(config.treasuryAddress)]
            }),
            assignedAddresses: new Map()
        };
    }
    const assignedAddresses = await listAssignedDepositAddresses();
    if (assignedAddresses.size === 0) {
        return {
            logs: [],
            assignedAddresses
        };
    }
    const topics = Array.from(assignedAddresses.keys()).map(topicAddress);
    const logs = await provider.getLogs({
        address: config.tokenAddress,
        fromBlock,
        toBlock,
        topics: [TRANSFER_TOPIC, null, topics]
    });
    return {
        logs,
        assignedAddresses
    };
}
export async function processOnchainDeposits() {
    var _a;
    const config = getOnchainConfig();
    assertOnchainConfig(config);
    const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
    const latestBlock = await provider.getBlockNumber();
    const safeLatestBlock = latestBlock - config.confirmations;
    if (safeLatestBlock < config.startBlock) {
        return {
            enabled: true,
            fromBlock: null,
            toBlock: null,
            latestBlock,
            processed: 0,
            settled: 0
        };
    }
    const stateKey = `onchainDeposit:${config.chainId}:${config.tokenAddress}:${config.depositMode}`;
    const state = await getSyncState(stateKey, {});
    const fromBlock = Math.max(Number(state.lastProcessedBlock || config.startBlock - 1) + 1, config.startBlock);
    const toBlock = Math.min(fromBlock + config.blockBatchSize - 1, safeLatestBlock);
    if (fromBlock > toBlock) {
        return {
            enabled: true,
            fromBlock,
            toBlock,
            latestBlock,
            processed: 0,
            settled: 0
        };
    }
    const { logs, assignedAddresses } = await getDepositLogs(provider, config, fromBlock, toBlock);
    let processed = 0;
    let settled = 0;
    for (const log of logs) {
        const parsed = transferInterface.parseLog({
            topics: [...log.topics],
            data: log.data
        });
        if (!parsed) {
            continue;
        }
        const fromAddress = normalizeWalletAddress(String(parsed.args.from));
        const toAddress = normalizeWalletAddress(String(parsed.args.to));
        const assigned = assignedAddresses.get(toAddress);
        if (config.depositMode === 'hd' && !assigned) {
            continue;
        }
        const record = await recordOnchainDeposit({
            walletId: (assigned === null || assigned === void 0 ? void 0 : assigned.walletId) || null,
            walletAddress: config.depositMode === 'hd' ? toAddress : fromAddress,
            chainId: config.chainId,
            tokenAddress: config.tokenAddress,
            txHash: log.transactionHash,
            logIndex: Number(log.index),
            blockNumber: Number(log.blockNumber),
            amount: parsed.args.value,
            metadata: {
                deposit_mode: config.depositMode,
                source_wallet_address: fromAddress,
                deposit_address: toAddress,
                treasury_address: config.treasuryAddress || null,
                address_index: (_a = assigned === null || assigned === void 0 ? void 0 : assigned.addressIndex) !== null && _a !== void 0 ? _a : null
            }
        });
        processed += record.alreadyRecorded ? 0 : 1;
        if (record.depositId) {
            const settlement = await settleOnchainDeposit(Number(record.depositId));
            if (!settlement.alreadySettled && settlement.status === 'completed') {
                settled += 1;
            }
        }
    }
    await setSyncState(stateKey, {
        lastProcessedBlock: toBlock,
        latestBlock,
        updatedAt: new Date().toISOString()
    });
    return {
        enabled: true,
        fromBlock,
        toBlock,
        latestBlock,
        processed,
        settled
    };
}
//# sourceMappingURL=processOnchainDeposits.js.map