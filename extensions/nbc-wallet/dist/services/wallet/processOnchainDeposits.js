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
function hexToNumber(value, fallback = 0) {
    if (typeof value === 'number')
        return value;
    if (!value)
        return fallback;
    return Number(BigInt(value));
}
function range(fromBlock, toBlock) {
    return Array.from({ length: toBlock - fromBlock + 1 }, (_, index) => fromBlock + index);
}
async function mapWithConcurrency(items, concurrency, mapper) {
    const results = [];
    for (let index = 0; index < items.length; index += concurrency) {
        const chunk = items.slice(index, index + concurrency);
        results.push(...(await Promise.all(chunk.map(mapper))));
    }
    return results;
}
async function getErc20DepositEvents(provider, config, fromBlock, toBlock) {
    var _a;
    let assignedAddresses = new Map();
    let logs;
    if (config.depositMode === 'treasury') {
        logs = await provider.getLogs({
            address: config.tokenAddress,
            fromBlock,
            toBlock,
            topics: [TRANSFER_TOPIC, null, topicAddress(config.treasuryAddress)]
        });
    }
    else {
        assignedAddresses = await listAssignedDepositAddresses();
        if (assignedAddresses.size === 0) {
            return [];
        }
        const topics = Array.from(assignedAddresses.keys()).map(topicAddress);
        logs = await provider.getLogs({
            address: config.tokenAddress,
            fromBlock,
            toBlock,
            topics: [TRANSFER_TOPIC, null, topics]
        });
    }
    const events = [];
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
        events.push({
            walletId: (assigned === null || assigned === void 0 ? void 0 : assigned.walletId) || null,
            walletAddress: config.depositMode === 'hd' ? toAddress : fromAddress,
            fromAddress,
            toAddress,
            txHash: log.transactionHash,
            logIndex: Number(log.index),
            blockNumber: Number(log.blockNumber),
            amount: parsed.args.value,
            addressIndex: (_a = assigned === null || assigned === void 0 ? void 0 : assigned.addressIndex) !== null && _a !== void 0 ? _a : null
        });
    }
    return events;
}
async function getNativeDepositEvents(provider, config, fromBlock, toBlock) {
    var _a;
    const assignedAddresses = config.depositMode === 'hd'
        ? await listAssignedDepositAddresses()
        : new Map();
    if (config.depositMode === 'hd' && assignedAddresses.size === 0) {
        return [];
    }
    const events = [];
    const blocks = await mapWithConcurrency(range(fromBlock, toBlock), config.nativeScanConcurrency, async (blockNumber) => provider.send('eth_getBlockByNumber', [
        `0x${blockNumber.toString(16)}`,
        true
    ]));
    for (const block of blocks) {
        const blockNumber = hexToNumber(block === null || block === void 0 ? void 0 : block.number, 0);
        for (const tx of (block === null || block === void 0 ? void 0 : block.transactions) || []) {
            if (!(tx === null || tx === void 0 ? void 0 : tx.to) || !(tx === null || tx === void 0 ? void 0 : tx.from) || !(tx === null || tx === void 0 ? void 0 : tx.hash)) {
                continue;
            }
            const amount = BigInt(tx.value || 0);
            if (amount <= BigInt(0)) {
                continue;
            }
            const fromAddress = normalizeWalletAddress(String(tx.from));
            const toAddress = normalizeWalletAddress(String(tx.to));
            const assigned = assignedAddresses.get(toAddress);
            if (config.depositMode === 'treasury') {
                if (toAddress !== config.treasuryAddress) {
                    continue;
                }
            }
            else if (!assigned) {
                continue;
            }
            events.push({
                walletId: (assigned === null || assigned === void 0 ? void 0 : assigned.walletId) || null,
                walletAddress: config.depositMode === 'hd' ? toAddress : fromAddress,
                fromAddress,
                toAddress,
                txHash: String(tx.hash),
                logIndex: hexToNumber(tx.transactionIndex, events.length),
                blockNumber,
                amount,
                addressIndex: (_a = assigned === null || assigned === void 0 ? void 0 : assigned.addressIndex) !== null && _a !== void 0 ? _a : null
            });
        }
    }
    return events;
}
async function getDepositEvents(provider, config, fromBlock, toBlock) {
    return config.assetType === 'native'
        ? getNativeDepositEvents(provider, config, fromBlock, toBlock)
        : getErc20DepositEvents(provider, config, fromBlock, toBlock);
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
    const stateKey = `onchainDeposit:${config.chainId}:${config.assetKey}:${config.depositMode}`;
    const state = await getSyncState(stateKey, {});
    let fromBlock = Math.max(Number(state.lastProcessedBlock || config.startBlock - 1) + 1, config.startBlock);
    if (fromBlock > safeLatestBlock) {
        return {
            enabled: true,
            fromBlock,
            toBlock: safeLatestBlock,
            latestBlock,
            batches: 0,
            processed: 0,
            settled: 0
        };
    }
    const firstBlock = fromBlock;
    let lastProcessedBlock = fromBlock - 1;
    let batches = 0;
    let processed = 0;
    let settled = 0;
    while (fromBlock <= safeLatestBlock && batches < config.maxBatchesPerRun) {
        const toBlock = Math.min(fromBlock + config.blockBatchSize - 1, safeLatestBlock);
        const events = await getDepositEvents(provider, config, fromBlock, toBlock);
        for (const event of events) {
            const record = await recordOnchainDeposit({
                walletId: event.walletId || null,
                walletAddress: event.walletAddress,
                chainId: config.chainId,
                tokenAddress: config.assetKey,
                txHash: event.txHash,
                logIndex: event.logIndex,
                blockNumber: event.blockNumber,
                amount: event.amount,
                metadata: {
                    deposit_mode: config.depositMode,
                    asset_type: config.assetType,
                    source_wallet_address: event.fromAddress,
                    deposit_address: event.toAddress,
                    treasury_address: config.treasuryAddress || null,
                    address_index: (_a = event.addressIndex) !== null && _a !== void 0 ? _a : null
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
        lastProcessedBlock = toBlock;
        batches += 1;
        await setSyncState(stateKey, {
            lastProcessedBlock,
            latestBlock,
            updatedAt: new Date().toISOString()
        });
        fromBlock = toBlock + 1;
    }
    return {
        enabled: true,
        fromBlock: firstBlock,
        toBlock: lastProcessedBlock,
        latestBlock,
        batches,
        processed,
        settled
    };
}
//# sourceMappingURL=processOnchainDeposits.js.map