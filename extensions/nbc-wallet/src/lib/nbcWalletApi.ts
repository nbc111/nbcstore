export interface WalletSummary {
  walletAddress: string;
  balance: number;
  frozenBalance: number;
  availableBalance: number;
  exchangeRate: number;
  currency: string;
}

async function parseJson(response: Response) {
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || 'Request failed');
  }
  return json.data;
}

const fetchOpts: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
};

export async function requestWalletAuth(
  authRequestApi: string,
  walletAddress: string
) {
  const data = await parseJson(
    await fetch(authRequestApi, {
      ...fetchOpts,
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    })
  );
  return data as {
    walletAddress: string;
    nonce: string;
    message: string;
    expiresAt: string;
  };
}

export async function verifyWalletAuth(
  authVerifyApi: string,
  payload: {
    walletAddress: string;
    signature: string;
    nonce: string;
  }
) {
  return parseJson(
    await fetch(authVerifyApi, {
      ...fetchOpts,
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchWalletBalance(
  balanceApi: string
): Promise<WalletSummary | null> {
  const data = await parseJson(
    await fetch(balanceApi, { ...fetchOpts, method: 'GET' })
  );
  return (data?.wallet as WalletSummary) || null;
}

export async function fetchWalletTransactions(
  transactionsApi: string,
  limit = 10
) {
  const url = new URL(transactionsApi, window.location.origin);
  url.searchParams.set('limit', String(limit));
  const data = await parseJson(
    await fetch(url.toString(), { ...fetchOpts, method: 'GET' })
  );
  return data;
}

export interface OnchainNbcBalance {
  walletAddress: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  source: 'native' | 'erc20';
  chainId: number;
  tokenAddress: string | null;
}

export async function fetchOnchainNbcBalance(
  onchainBalanceApi: string,
  walletAddress: string
): Promise<OnchainNbcBalance> {
  const url = new URL(onchainBalanceApi, window.location.origin);
  url.searchParams.set('walletAddress', walletAddress);
  return parseJson(
    await fetch(url.toString(), { ...fetchOpts, method: 'GET' })
  ) as Promise<OnchainNbcBalance>;
}
