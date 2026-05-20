import React from 'react';
import { WalletLoginButton } from '../../../components/WalletLoginButton.js';

interface WalletLoginEntryProps {
  authRequestApi: string;
  authVerifyApi: string;
  balanceApi: string;
  redirectUrl: string;
  customer?: { customerId?: number } | null;
  nbcWalletPublicConfig: {
    exchangeRate: number;
    displayName: string;
    chainId?: number | null;
    treasuryAddress?: string | null;
    onchainEnabled: boolean;
  };
}

export default function WalletLoginEntry({
  authRequestApi,
  authVerifyApi,
  balanceApi,
  redirectUrl,
  customer,
  nbcWalletPublicConfig
}: WalletLoginEntryProps) {
  return (
    <WalletLoginButton
      apis={{ authRequestApi, authVerifyApi, balanceApi }}
      publicConfig={{
        exchangeRate: nbcWalletPublicConfig.exchangeRate,
        displayName: nbcWalletPublicConfig.displayName,
        chainId: nbcWalletPublicConfig.chainId,
        treasuryAddress: nbcWalletPublicConfig.treasuryAddress,
        onchainEnabled: nbcWalletPublicConfig.onchainEnabled
      }}
      redirectUrl={redirectUrl}
      isLoggedIn={Boolean(customer?.customerId)}
    />
  );
}

export const layout = {
  areaId: 'customerLoginForm',
  sortOrder: 40
};

export const query = `
  query Query {
    authRequestApi: url(routeId: "authRequest")
    authVerifyApi: url(routeId: "authVerify")
    balanceApi: url(routeId: "nbcWalletBalance")
    redirectUrl: url(routeId: "homepage")
    customer: currentCustomer {
      customerId
    }
    nbcWalletPublicConfig {
      exchangeRate
      displayName
      chainId
      treasuryAddress
      onchainEnabled
    }
  }
`;
