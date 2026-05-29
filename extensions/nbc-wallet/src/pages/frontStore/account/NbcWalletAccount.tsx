import React from 'react';
import { NbcWalletAccountSection } from '../../../components/NbcWalletAccountSection.js';

interface NbcWalletAccountProps {
  authRequestApi: string;
  authVerifyApi: string;
  balanceApi: string;
  transactionsApi: string;
  withdrawalsApi: string;
  withdrawApi: string;
  nbcWalletPublicConfig: {
    exchangeRate: number;
    shopCurrency: string;
    displayName: string;
    chainId?: number | null;
    treasuryAddress?: string | null;
    onchainEnabled: boolean;
  };
}

export default function NbcWalletAccount({
  authRequestApi,
  authVerifyApi,
  balanceApi,
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
        onchainEnabled: nbcWalletPublicConfig.onchainEnabled
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
    transactionsApi: url(routeId: "nbcWalletTransactions")
    withdrawalsApi: url(routeId: "nbcWalletWithdrawals")
    withdrawApi: url(routeId: "nbcWalletWithdraw")
    nbcWalletPublicConfig {
      exchangeRate
      shopCurrency
      displayName
      chainId
      treasuryAddress
      onchainEnabled
    }
  }
`;
