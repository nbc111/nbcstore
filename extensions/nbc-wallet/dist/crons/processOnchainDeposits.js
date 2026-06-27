import { processOnchainDeposits } from '../services/wallet/processOnchainDeposits.js';
import { getOnchainConfig } from '../services/wallet/getOnchainConfig.js';
let running = false;
export default async function runNbcOnchainDepositPoller() {
    const config = getOnchainConfig();
    if (!config.enabled) {
        return;
    }
    if (running) {
        return;
    }
    running = true;
    try {
        await processOnchainDeposits();
    }
    finally {
        running = false;
    }
}
