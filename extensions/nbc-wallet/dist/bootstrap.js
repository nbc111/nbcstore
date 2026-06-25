import path from 'path';
import { fileURLToPath } from 'url';
import config from 'config';
import { registerPaymentMethod } from '@evershop/evershop/checkout/services';
import { registerJob } from '@evershop/evershop/lib/cronjob';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getOnchainConfig } from './services/wallet/getOnchainConfig.js';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
export default function bootstrap() {
    config.util.setModuleDefaults('oms', {
        order: {
            paymentStatus: {
                nbc_pending: {
                    name: 'NBC Pending',
                    badge: 'default',
                    isDefault: false,
                    isCancelable: true
                },
                nbc_paid: {
                    name: 'NBC Paid',
                    badge: 'success',
                    isDefault: false,
                    isCancelable: false
                },
                nbc_failed: {
                    name: 'NBC Failed',
                    badge: 'critical',
                    isDefault: false,
                    isCancelable: true
                },
                nbc_refunded: {
                    name: 'NBC Refunded',
                    badge: 'destructive',
                    isDefault: false,
                    isCancelable: false
                },
                nbc_partial_refunded: {
                    name: 'NBC Partial Refunded',
                    badge: 'warning',
                    isDefault: false,
                    isCancelable: false
                }
            },
            psoMapping: {
                'nbc_pending:*': 'new',
                'nbc_paid:*': 'processing',
                'nbc_paid:delivered': 'completed',
                'nbc_failed:*': 'new',
                'nbc_refunded:*': 'closed',
                'nbc_partial_refunded:*': 'processing',
                'nbc_partial_refunded:delivered': 'completed'
            }
        }
    });
    registerPaymentMethod({
        init: async ()=>({
                code: 'nbc_wallet',
                name: String(getConfig('nbcWallet.displayName', 'NBC Wallet'))
            }),
        validator: async ()=>{
            const status = Number(getConfig('nbcWallet.status', 1));
            return status === 1;
        }
    });
    const onchainConfig = getOnchainConfig();
    const onchainEnabled = Number(getConfig('nbcWallet.onchain.enabled', 1)) === 1;
    registerJob({
        name: 'nbcWalletOnchainDepositPoller',
        schedule: onchainConfig.pollSchedule,
        resolve: path.resolve(currentDir, 'crons', 'processOnchainDeposits.js'),
        enabled: onchainConfig.enabled
    });
    registerJob({
        name: 'nbcWalletReconcileLedger',
        schedule: String(getConfig('nbcWallet.reconcile.schedule', '*/10 * * * *')),
        resolve: path.resolve(currentDir, 'crons', 'reconcileWalletLedger.js'),
        enabled: Number(getConfig('nbcWallet.reconcile.enabled', 1)) === 1
    });
}
