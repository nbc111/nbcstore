import Area from '@components/common/Area.js';
import { Toaster } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface FooterProps {
  copyRight: string;
}

export function Footer({ copyRight }: FooterProps) {
  return (
    <footer className="footer web3-footer mt-24 pt-8 pb-6">
      <Area id="footerTop" className="footer__top" />
      <div className="footer__middle flex justify-between items-center page-width">
        <Area id="footerMiddleLeft" className="footer__middle__left" />
        <Area id="footerMiddleCenter" className="footer__middle__center" />
        <Area id="footerMiddleRight" className="footer__middle__right" />
      </div>
      <Area
        id="footerBottom"
        className="footer__bottom mt-6"
        coreComponents={[
          {
            component: {
              default: (
                <div className="page-width">
                  <div className="self-center">
                    <div className="copyright text-center md:text-right text-muted-foreground text-sm">
                      <span>{_(copyRight)}</span>
                    </div>
                  </div>
                </div>
              )
            },
            sortOrder: 10
          }
        ]}
      />
      <Toaster />
    </footer>
  );
}
