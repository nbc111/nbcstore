import React from 'react';
import { NbcWalletAccountSection } from '../../../components/NbcWalletAccountSection.js';

interface NbcWalletAccountProps {
  authRequestApi: string;
  authVerifyApi: string;
  balanceApi: string;
  bindCustomerApi: string;
  depositAddressApi: string;
  profileApi: string;
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
      exchangeRate?: number | null;
    }>;
  };
}

export default function NbcWalletAccount({
  authRequestApi,
  authVerifyApi,
  balanceApi,
  bindCustomerApi,
  depositAddressApi,
  profileApi,
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
        bindCustomerApi,
        depositAddressApi,
        profileApi,
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
    bindCustomerApi: url(routeId: "nbcWalletBindCustomer")
    depositAddressApi: url(routeId: "nbcWalletDepositAddress")
    profileApi: url(routeId: "nbcWalletProfile")
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
        exchangeRate
      }
    }
  }
`;
