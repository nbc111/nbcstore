export interface WalletSummary {
  walletAddress: string;
  depositAddress?: string | null;
  addressIndex?: number | null;
  chainId?: number | null;
  balance: number;
  frozenBalance: number;
  availableBalance: number;
  exchangeRate: number;
  currency: string;
  assets?: Array<{
    symbol: string;
    displayName?: string;
    balance: number;
    frozenBalance: number;
    availableBalance: number;
    tokenAddress?: string | null;
    tokenDecimals?: number | null;
  }>;
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

export interface WalletDepositAddress {
  mode: 'treasury' | 'hd';
  walletId?: number;
  customerId?: number;
  depositAddress: string | null;
  addressIndex: number | null;
  chainId: number;
  tokenAddress: string | null;
}

export async function fetchWalletDepositAddress(
  depositAddressApi: string,
  assetSymbol = 'NBC'
): Promise<WalletDepositAddress> {
  const url = new URL(depositAddressApi, window.location.origin);
  url.searchParams.set('asset', assetSymbol);
  const data = await parseJson(
    await fetch(url.toString(), { ...fetchOpts, method: 'GET' })
  );
  return data as WalletDepositAddress;
}

export async function fetchWalletTransactions(
  transactionsApi: string,
  limit = 10,
  assetSymbol?: string
) {
  const url = new URL(transactionsApi, window.location.origin);
  url.searchParams.set('limit', String(limit));
  if (assetSymbol) {
    url.searchParams.set('asset', assetSymbol);
  }
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

export async function requestWalletWithdrawal(
  withdrawApi: string,
  amount: number,
  assetSymbol = 'NBC'
) {
  return parseJson(
    await fetch(withdrawApi, {
      ...fetchOpts,
      method: 'POST',
      body: JSON.stringify({ amount, asset: assetSymbol })
    })
  );
}

export async function fetchWalletWithdrawals(
  withdrawalsApi: string,
  limit = 10
) {
  const url = new URL(withdrawalsApi, window.location.origin);
  url.searchParams.set('limit', String(limit));
  const data = await parseJson(
    await fetch(url.toString(), { ...fetchOpts, method: 'GET' })
  );
  return data;
}
