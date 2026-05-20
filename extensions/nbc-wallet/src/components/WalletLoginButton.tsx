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

  const label =
    publicConfig.displayName && publicConfig.displayName !== 'NBC Wallet'
      ? _('${name} login', { name: publicConfig.displayName })
      : _('Wallet login');

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full font-normal text-foreground/90"
        disabled={connecting}
        onClick={() => connect()}
      >
        {connecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin opacity-70" />
            {_('Connecting…')}
          </>
        ) : (
          label
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center leading-snug" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
