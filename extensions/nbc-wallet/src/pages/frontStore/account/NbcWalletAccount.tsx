import React from 'react';
import { NbcWalletAccountSection } from '../../../components/NbcWalletAccountSection.js';

interface NbcWalletAccountProps {
  authRequestApi: string;
  authVerifyApi: string;
  balanceApi: string;
  depositAddressApi: string;
  transactionsApi: string;
  withdrawalsApi: string;
  withdrawApi: string;
  nbcWalletPublicConfig: {
    exchangeRate: number;
    shopCurrency: string;
    displayName: string;
    chainId?: number | null;
    treasuryAddress?: string | null;
    depositMode?: string;
    onchainEnabled: boolean;
    assets?: Array<{
      symbol: string;
      displayName?: string;
      chainId?: number | null;
      assetType: string;
      tokenAddress?: string | null;
      tokenDecimals?: number | null;
    }>;
  };
}

export default function NbcWalletAccount({
  authRequestApi,
  authVerifyApi,
  balanceApi,
  depositAddressApi,
  transactionsApi,
  withdrawalsApi,
  withdrawApi,
  nbcWalletPublicConfig
}: NbcWalletAccountProps) {
  return (
    <NbcWalletAccountSection
      apis={{
        authRequestApi,
        authVerifyApi,
        balanceApi,
        depositAddressApi,
        transactionsApi,
        withdrawalsApi,
        withdrawApi
      }}
      publicConfig={{
        exchangeRate: nbcWalletPublicConfig.exchangeRate,
        shopCurrency: nbcWalletPublicConfig.shopCurrency,
        displayName: nbcWalletPublicConfig.displayName,
        chainId: nbcWalletPublicConfig.chainId,
        treasuryAddress: nbcWalletPublicConfig.treasuryAddress,
        depositMode: nbcWalletPublicConfig.depositMode,
        onchainEnabled: nbcWalletPublicConfig.onchainEnabled,
        assets: nbcWalletPublicConfig.assets
      }}
    />
  );
}

export const layout = {
  areaId: 'accountPageAddressBook',
  sortOrder: 5
};

export const query = `
  query Query {
    authRequestApi: url(routeId: "authRequest")
    authVerifyApi: url(routeId: "authVerify")
    balanceApi: url(routeId: "nbcWalletBalance")
    depositAddressApi: url(routeId: "nbcWalletDepositAddress")
    transactionsApi: url(routeId: "nbcWalletTransactions")
    withdrawalsApi: url(routeId: "nbcWalletWithdrawals")
    withdrawApi: url(routeId: "nbcWalletWithdraw")
    nbcWalletPublicConfig {
      exchangeRate
      shopCurrency
      displayName
      chainId
      treasuryAddress
      depositMode
      onchainEnabled
      assets {
        symbol
        displayName
        chainId
        assetType
        tokenAddress
        tokenDecimals
      }
    }
  }
`;
