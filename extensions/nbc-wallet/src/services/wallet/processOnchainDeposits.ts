import { Interface, JsonRpcProvider, id, zeroPadValue } from 'ethers';
import {
  assertOnchainConfig,
  getOnchainConfig
} from './getOnchainConfig.js';
import { listDepositAddressBindings } from './assignDepositAddress.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
import { getSyncState } from './getSyncState.js';
import { recordOnchainDeposit } from './recordOnchainDeposit.js';
import { setSyncState } from './setSyncState.js';
import { settleOnchainDeposit } from './settleOnchainDeposit.js';

const TRANSFER_EVENT =
  'event Transfer(address indexed from, address indexed to, uint256 value)';
const transferInterface = new Interface([TRANSFER_EVENT]);
const TRANSFER_TOPIC = id('Transfer(address,address,uint256)');

type DepositSyncState = {
  lastProcessedBlock?: number;
};

function topicAddress(address: string) {
  return zeroPadValue(address, 32);
}

function getTokenAddressKey(config: ReturnType<typeof getOnchainConfig>) {
  return config.assetType === 'native'
    ? 'native:NBC'
    : normalizeWalletAddress(config.tokenAddress);
}

async function settleRecordedDeposit(record: { alreadyRecorded: boolean; depositId?: number }) {
  let settled = 0;
  if (record.depositId) {
    const settlement = await settleOnchainDeposit(Number(record.depositId));
    if (!settlement.alreadySettled && settlement.status === 'completed') {
      settled = 1;
    }
  }
  return {
    processed: record.alreadyRecorded ? 0 : 1,
    settled
  };
}

async function processErc20ToTreasury(
  provider: JsonRpcProvider,
  config: ReturnType<typeof getOnchainConfig>,
  fromBlock: number,
  toBlock: number
) {
  const logs = await provider.getLogs({
    address: config.tokenAddress,
    fromBlock,
    toBlock,
    topics: [TRANSFER_TOPIC, null, topicAddress(config.treasuryAddress)]
  });

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

    const record = await recordOnchainDeposit({
      walletAddress: String(parsed.args.from),
      chainId: config.chainId,
      tokenAddress: getTokenAddressKey(config),
      txHash: log.transactionHash,
      logIndex: Number(log.index),
      blockNumber: Number(log.blockNumber),
      amount: parsed.args.value,
      metadata: {
        mode: 'treasury',
        treasury_address: config.treasuryAddress
      }
    });
    const stats = await settleRecordedDeposit(record);
    processed += stats.processed;
    settled += stats.settled;
  }

  return { processed, settled };
}

async function processErc20ToHdAddresses(
  provider: JsonRpcProvider,
  config: ReturnType<typeof getOnchainConfig>,
  fromBlock: number,
  toBlock: number
) {
  const tokenAddressKey = getTokenAddressKey(config);
  const bindings = await listDepositAddressBindings(config.chainId, tokenAddressKey);

  let processed = 0;
  let settled = 0;

  for (const binding of bindings) {
    const logs = await provider.getLogs({
      address: config.tokenAddress,
      fromBlock,
      toBlock,
      topics: [TRANSFER_TOPIC, null, topicAddress(binding.depositAddress)]
    });

    for (const log of logs) {
      const parsed = transferInterface.parseLog({
        topics: [...log.topics],
        data: log.data
      });
      if (!parsed) {
        continue;
      }

      const record = await recordOnchainDeposit({
        walletAddress: binding.walletAddress,
        chainId: config.chainId,
        tokenAddress: tokenAddressKey,
        txHash: log.transactionHash,
        logIndex: Number(log.index),
        blockNumber: Number(log.blockNumber),
        amount: parsed.args.value,
        metadata: {
          mode: 'hd',
          from_address: normalizeWalletAddress(String(parsed.args.from)),
          deposit_address: binding.depositAddress,
          address_index: binding.addressIndex
        }
      });

      const stats = await settleRecordedDeposit(record);
      processed += stats.processed;
      settled += stats.settled;
    }
  }

  return { processed, settled };
}

async function processNativeTransfers(
  provider: JsonRpcProvider,
  config: ReturnType<typeof getOnchainConfig>,
  fromBlock: number,
  toBlock: number
) {
  const tokenAddressKey = getTokenAddressKey(config);
  const monitored = new Map<
    string,
    { walletAddress?: string; addressIndex?: number; mode: 'hd' | 'treasury' }
  >();

  if (config.depositMode === 'hd') {
    const bindings = await listDepositAddressBindings(config.chainId, tokenAddressKey);
    for (const binding of bindings) {
      monitored.set(binding.depositAddress, {
        walletAddress: binding.walletAddress,
        addressIndex: binding.addressIndex,
        mode: 'hd'
      });
    }
  } else if (config.treasuryAddress) {
    monitored.set(config.treasuryAddress, { mode: 'treasury' });
  }

  if (monitored.size === 0) {
    return { processed: 0, settled: 0 };
  }

  let processed = 0;
  let settled = 0;

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1) {
    const block: any = await provider.getBlock(blockNumber, true);
    const transactions = block?.transactions || [];
    for (const tx of transactions) {
      if (!tx?.to || !tx?.hash) {
        continue;
      }
      const toAddress = normalizeWalletAddress(String(tx.to));
      const binding = monitored.get(toAddress);
      if (!binding) {
        continue;
      }

      const value = BigInt(tx.value || 0);
      if (value <= BigInt(0)) {
        continue;
      }

      const walletAddress =
        binding.mode === 'hd'
          ? binding.walletAddress
          : tx.from
            ? normalizeWalletAddress(String(tx.from))
            : '';

      if (!walletAddress) {
        continue;
      }

      const record = await recordOnchainDeposit({
        walletAddress,
        chainId: config.chainId,
        tokenAddress: tokenAddressKey,
        txHash: String(tx.hash),
        logIndex: 0,
        blockNumber,
        amount: value,
        metadata: {
          mode: binding.mode,
          from_address: tx.from ? normalizeWalletAddress(String(tx.from)) : null,
          deposit_address: toAddress,
          address_index: binding.addressIndex ?? null
        }
      });
      const stats = await settleRecordedDeposit(record);
      processed += stats.processed;
      settled += stats.settled;
    }
  }

  return { processed, settled };
}

export async function processOnchainDeposits() {
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

  const tokenAddressKey = getTokenAddressKey(config);
  const stateKey = `onchainDeposit:${config.chainId}:${tokenAddressKey}`;
  const state = await getSyncState<DepositSyncState>(stateKey, {});
  const fromBlock = Math.max(
    Number(state.lastProcessedBlock || config.startBlock - 1) + 1,
    config.startBlock
  );
  const toBlock = Math.min(
    fromBlock + config.blockBatchSize - 1,
    safeLatestBlock
  );

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

  let processed = 0;
  let settled = 0;
  if (config.assetType === 'native') {
    const stats = await processNativeTransfers(provider, config, fromBlock, toBlock);
    processed = stats.processed;
    settled = stats.settled;
  } else if (config.depositMode === 'hd') {
    const stats = await processErc20ToHdAddresses(provider, config, fromBlock, toBlock);
    processed = stats.processed;
    settled = stats.settled;
  } else {
    const stats = await processErc20ToTreasury(provider, config, fromBlock, toBlock);
    processed = stats.processed;
    settled = stats.settled;
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
