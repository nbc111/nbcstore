import { Button } from '@evershop/evershop/components/common/ui/Button';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Loader2 } from 'lucide-react';
import React from 'react';
import {
  useNbcWallet,
  NbcWalletApis,
  NbcWalletPublicConfig
} from '../hooks/useNbcWallet.js';

interface WalletLoginButtonProps {
  apis: NbcWalletApis;
  publicConfig: NbcWalletPublicConfig;
  redirectUrl: string;
  isLoggedIn?: boolean;
}

/** Compact wallet sign-in control for login / register forms */
export function WalletLoginButton({
  apis,
  publicConfig,
  redirectUrl,
  isLoggedIn
}: WalletLoginButtonProps) {
  const { connecting, error, connect } = useNbcWallet(apis, publicConfig, {
    autoLoadBalance: false,
    redirectUrl
  });

  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full font-normal text-foreground/90"
          disabled={connecting}
          onClick={() => connect('okx')}
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin opacity-70" />
              {_('Connecting…')}
            </>
          ) : (
            _('Use OKX Wallet to login')
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full font-normal text-foreground/90"
          disabled={connecting}
          onClick={() => connect('metamask')}
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin opacity-70" />
              {_('Connecting…')}
            </>
          ) : (
            _('Use MetaMask to login')
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive text-center leading-snug" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
