import { flushWalletNotifications } from '../services/wallet/notificationQueue.js';

let running = false;

export default async function runNbcWalletNotificationFlush() {
  if (running) return;
  running = true;
  try {
    await flushWalletNotifications();
  } finally {
    running = false;
  }
}
