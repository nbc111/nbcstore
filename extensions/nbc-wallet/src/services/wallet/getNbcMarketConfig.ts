import { getConfig } from '@evershop/evershop/lib/util/getConfig';

export interface NbcMarketConfig {
  enabled: boolean;
  tickerUrl: string;
  symbol: string;
  accessKey: string;
  cacheTtlSeconds: number;
  priceField: string;
}

export function getNbcMarketConfig(): NbcMarketConfig {
  const accessKeyFromEnv = process.env.NBC_WALLET_MARKET_ACCESS_KEY;
  const accessKeyFromConfig = String(
    getConfig('nbcWallet.market.accessKey', '')
  );

  return {
    enabled: Number(getConfig('nbcWallet.market.enabled', 0)) === 1,
    tickerUrl: String(
      getConfig(
        'nbcWallet.market.tickerUrl',
        'https://www.nbcex.com/v1/rest/api/market/ticker'
      )
    ),
    symbol: String(getConfig('nbcWallet.market.symbol', 'nbcusdt')),
    accessKey: accessKeyFromEnv || accessKeyFromConfig,
    cacheTtlSeconds: Math.max(
      Number(getConfig('nbcWallet.market.cacheTtlSeconds', 60)),
      5
    ),
    priceField: String(getConfig('nbcWallet.market.priceField', 'buy'))
  };
}
