import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { emit } from '@evershop/evershop/lib/event';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { Contract } from 'ethers';
import { getWalletAssetConfig } from './assets.js';
import { ensureWalletAssetBalance } from './walletAssetBalance.js';
import { enqueueWalletNotification } from './notificationQueue.js';
import { writeAuditLog } from './writeAuditLog.js';
import { getTreasurySigner } from './getTreasurySigner.js';
const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)'
];
/**
 * When `nbcWallet.withdrawal.requireApproval` is 1 (default in production),
 * processWithdrawal only accepts `approved` withdrawals, enforcing the two-step
 * approve → process workflow. Set to 0 only during development/testing.
 */ function getProcessableStatuses() {
    const requireApproval = Number(getConfig('nbcWallet.withdrawal.requireApproval', 1));
    return requireApproval === 1 ? [
        'approved'
    ] : [
        'requested',
        'approved'
    ];
}
function requiresDualControl(amount, assetSymbol) {
    const assetPrefix = `nbcWallet.assets.${assetSymbol}.withdrawal`;
    const requireDualControl = Number(getConfig(`${assetPrefix}.requireDualControl`, getConfig('nbcWallet.withdrawal.requireDualControl', 1)));
    const threshold = Number(getConfig(`${assetPrefix}.dualControlAmount`, getConfig('nbcWallet.withdrawal.dualControlAmount', 0)));
    return requireDualControl === 1 && (threshold <= 0 || amount >= threshold);
}
/**
 * Two-phase withdrawal processing to prevent double-spend:
 *
 * Phase 1 (DB transaction):
 *   - Validate withdrawal (status, balance)
 *   - Deduct balance and frozen_balance atomically
 *   - Mark as `processing` and commit
 *   Idempotency gate: concurrent retries see `processing` and abort early.
 *
 * Phase 2 (outside DB transaction):
 *   - Execute on-chain token.transfer()
 *   - Success → update status to `completed`, write tx_hash
 *   - Failure → restore balance, mark as `failed`
 *
 * If Phase 2 DB write fails after a successful chain tx, the row stays in
 * `processing`. A reconcile job must detect and finalise it — do NOT re-run
 * the chain transfer.
 */ export async function processWithdrawal(withdrawalUuid, performedBy = 'system') {
    // ── Phase 1: validate + mark processing (committed DB txn) ───────────────
    let withdrawalId;
    let walletId;
    let customerId;
    let walletAddress;
    let amount;
    let assetSymbol;
    let assetType;
    let tokenAddress;
    let tokenDecimals;
    let balanceBefore;
    let balanceAfter;
    let frozenBefore;
    {
        const conn = await getConnection();
        try {
            await startTransaction(conn);
            const wdResult = await conn.query('SELECT * FROM nbc_withdrawal WHERE uuid = $1 FOR UPDATE', [
                withdrawalUuid
            ]);
            const wd = wdResult.rows[0];
            if (!wd) throw new Error('Withdrawal not found');
            if (wd.status === 'completed') {
                await commit(conn);
                return {
                    withdrawalUuid,
                    status: 'completed',
                    txHash: wd.tx_hash,
                    alreadyProcessed: true
                };
            }
            if (wd.status === 'processing') {
                await commit(conn);
                return {
                    withdrawalUuid,
                    status: 'processing',
                    txHash: wd.tx_hash,
                    alreadyProcessed: true
                };
            }
            const processableStatuses = getProcessableStatuses();
            if (!processableStatuses.includes(wd.status)) {
                const hint = wd.status === 'requested' ? ' (approval is required before processing — call /approve first)' : '';
                throw new Error(`Withdrawal status "${wd.status}" cannot be processed${hint}`);
            }
            const walletResult = await conn.query('SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE', [
                wd.wallet_id
            ]);
            const wallet = walletResult.rows[0];
            if (!wallet) throw new Error('NBC wallet not found');
            amount = Number(wd.amount);
            assetSymbol = wd.asset_symbol || 'NBC';
            if (requiresDualControl(amount, assetSymbol)) {
                if (!wd.approved_by) {
                    throw new Error('Withdrawal approval must record an approver before processing');
                }
                if (wd.approved_by === performedBy) {
                    throw new Error('Withdrawal must be processed by a different admin than the approver');
                }
            }
            const asset = getWalletAssetConfig(assetSymbol);
            assetType = asset.assetType;
            tokenAddress = wd.token_address || asset.tokenAddress;
            tokenDecimals = Number(wd.token_decimals || asset.tokenDecimals);
            const assetBalance = await ensureWalletAssetBalance(conn, wallet, asset);
            frozenBefore = Number(assetBalance.frozen_balance);
            balanceBefore = Number(assetBalance.balance);
            if (frozenBefore < amount) throw new Error('Frozen balance is insufficient for withdrawal');
            if (balanceBefore < amount) throw new Error('Wallet balance is insufficient for withdrawal');
            balanceAfter = balanceBefore - amount;
            const nextFrozen = frozenBefore - amount;
            await conn.query(`UPDATE nbc_wallet_asset_balance
            SET balance = $1, frozen_balance = $2, updated_at = NOW()
          WHERE wallet_asset_id = $3`, [
                balanceAfter,
                nextFrozen,
                assetBalance.wallet_asset_id
            ]);
            if (asset.symbol === 'NBC') {
                await conn.query(`UPDATE nbc_wallet
              SET balance = $1, frozen_balance = $2, updated_at = NOW()
            WHERE wallet_id = $3`, [
                    balanceAfter,
                    nextFrozen,
                    wallet.wallet_id
                ]);
            }
            await conn.query(`UPDATE nbc_withdrawal
            SET status = 'processing', processing_at = NOW(), updated_at = NOW(),
                processed_by = $1,
                metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
          WHERE withdrawal_id = $3`, [
                performedBy,
                JSON.stringify({
                    performed_by: performedBy
                }),
                wd.withdrawal_id
            ]);
            withdrawalId = wd.withdrawal_id;
            walletId = wallet.wallet_id;
            customerId = wallet.customer_id;
            walletAddress = wd.wallet_address;
            await commit(conn);
        } catch (err) {
            await rollback(conn);
            throw err;
        }
    }
    // ── Phase 2: on-chain transfer (outside DB transaction) ──────────────────
    let txHash;
    let onchainError;
    try {
        const { signer } = getTreasurySigner();
        const onchainAmount = BigInt(amount) * BigInt(10) ** BigInt(tokenDecimals);
        const token = assetType === 'erc20' ? new Contract(tokenAddress, ERC20_ABI, signer) : null;
        const tx = assetType === 'native' ? await signer.sendTransaction({
            to: walletAddress,
            value: onchainAmount
        }) : await token.transfer(walletAddress, onchainAmount);
        const receipt = await tx.wait();
        txHash = receipt?.hash || tx.hash;
    } catch (err) {
        onchainError = err instanceof Error ? err : new Error(String(err));
    }
    // ── Phase 2 DB write: finalise status ────────────────────────────────────
    if (txHash) {
        // Success path
        const conn2 = await getConnection();
        try {
            await startTransaction(conn2);
            const walletTx = await insert('nbc_wallet_transaction').given({
                wallet_id: walletId,
                asset_symbol: assetSymbol,
                token_address: tokenAddress,
                token_decimals: tokenDecimals,
                transaction_type: 'withdrawal',
                amount: -amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reference: withdrawalUuid,
                status: 'completed',
                metadata: {
                    source: 'onchain_withdrawal',
                    asset_type: assetType,
                    asset_symbol: assetSymbol,
                    token_address: tokenAddress,
                    tx_hash: txHash,
                    performed_by: performedBy
                }
            }).execute(conn2);
            await conn2.query(`UPDATE nbc_withdrawal
            SET tx_hash      = $1,
                wallet_tx_id = $2,
                status       = 'completed',
                processed_at = NOW(),
                updated_at   = NOW()
          WHERE withdrawal_id = $3`, [
                txHash,
                walletTx.insertId || walletTx.wallet_tx_id,
                withdrawalId
            ]);
            await commit(conn2);
        } catch (dbErr) {
            await rollback(conn2);
            // Chain tx succeeded but DB write failed. Row stays in `processing`.
            // Reconcile job must handle this — do NOT retry the chain transfer.
            throw new Error(`Chain transfer succeeded (txHash=${txHash}) but DB finalisation failed: ` + `${dbErr.message}. Row ${withdrawalId} is in 'processing' state.`);
        }
        await Promise.all([
            emit('nbc_wallet_withdrawal_completed', {
                withdrawalUuid,
                withdrawalId,
                walletId,
                txHash,
                amount,
                balanceAfter,
                assetSymbol
            }).catch(()=>{}),
            enqueueWalletNotification({
                walletId,
                customerId,
                type: 'withdrawal_completed',
                assetSymbol: assetSymbol,
                amount,
                reference: txHash,
                payload: {
                    withdrawalUuid,
                    withdrawalId,
                    txHash,
                    balanceAfter
                }
            }).catch(()=>{}),
            writeAuditLog({
                entityType: 'withdrawal',
                entityId: withdrawalId,
                action: 'completed',
                performedBy,
                metadata: {
                    tx_hash: txHash,
                    amount,
                    balance_after: balanceAfter
                }
            })
        ]);
        return {
            withdrawalUuid,
            status: 'completed',
            txHash,
            balanceAfter,
            frozenBalance: frozenBefore - amount
        };
    } else {
        // Failure path — restore balance and mark as failed
        const conn3 = await getConnection();
        try {
            await startTransaction(conn3);
            const restoredFrozen = Math.max(frozenBefore - amount, 0);
            await conn3.query(`UPDATE nbc_wallet_asset_balance
            SET balance = $1, frozen_balance = $2, updated_at = NOW()
          WHERE wallet_id = $3
            AND asset_symbol = $4`, [
                balanceBefore,
                restoredFrozen,
                walletId,
                assetSymbol
            ]);
            if (assetSymbol === 'NBC') {
                await conn3.query(`UPDATE nbc_wallet
              SET balance = $1, frozen_balance = $2, updated_at = NOW()
            WHERE wallet_id = $3`, [
                    balanceBefore,
                    restoredFrozen,
                    walletId
                ]);
            }
            await conn3.query(`UPDATE nbc_withdrawal
            SET status = 'failed', failed_at = NOW(),
                error_message = $1, updated_at = NOW()
          WHERE withdrawal_id = $2`, [
                onchainError.message,
                withdrawalId
            ]);
            await commit(conn3);
        } catch (_restoreErr) {
            await rollback(conn3);
        // Restoration failed — row stays in `processing`, needs manual review
        }
        await Promise.all([
            emit('nbc_wallet_withdrawal_failed', {
                withdrawalUuid,
                withdrawalId,
                walletId,
                error: onchainError.message
            }).catch(()=>{}),
            enqueueWalletNotification({
                walletId,
                customerId,
                type: 'withdrawal_failed',
                assetSymbol: assetSymbol,
                amount,
                reference: withdrawalUuid,
                payload: {
                    withdrawalUuid,
                    withdrawalId,
                    error: onchainError.message
                }
            }).catch(()=>{})
        ]);
        throw onchainError;
    }
}
