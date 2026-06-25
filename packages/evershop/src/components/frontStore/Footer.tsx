import Area from '@components/common/Area.js';
import { Toaster } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface FooterProps {
  copyRight: string;
}

export function Footer({ copyRight }: FooterProps) {
  return (
    <footer className="footer bg-gray-100 mt-24 pt-2.5 pb-2.5 border-t border-gray-300">
      <Area id="footerTop" className="footer__top" />
      <div className="footer__middle flex justify-between items-center">
        <Area id="footerMiddleLeft" className="footer__middle__left" />
        <Area id="footerMiddleCenter" className="footer__middle__center" />
        <Area id="footerMiddleRight" className="footer__middle__right" />
      </div>
      <Area
        id="footerBottom"
        className="footer__bottom"
        coreComponents={[
          {
            component: {
              default: (
                <div className="page-width">
                  <div className="self-center">
                    <div className="copyright text-center md:text-right text-textSubdued">
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
