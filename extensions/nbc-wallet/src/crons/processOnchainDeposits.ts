import { processOnchainDeposits } from '../services/wallet/processOnchainDeposits.js';
import { getOnchainConfig } from '../services/wallet/getOnchainConfig.js';

export default async function runNbcOnchainDepositPoller() {
  const config = getOnchainConfig();
  if (!config.enabled) {
    return;
  }

  await processOnchainDeposits();
}
