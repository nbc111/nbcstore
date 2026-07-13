import Area from '@components/common/Area.js';
import { Toaster } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
export function Footer({ copyRight }) {
    return /*#__PURE__*/ React.createElement("footer", {
        className: "footer web3-footer mt-24 pt-8 pb-6"
    }, /*#__PURE__*/ React.createElement(Area, {
        id: "footerTop",
        className: "footer__top"
    }), /*#__PURE__*/ React.createElement("div", {
        className: "footer__middle flex justify-between items-center page-width"
    }, /*#__PURE__*/ React.createElement(Area, {
        id: "footerMiddleLeft",
        className: "footer__middle__left"
    }), /*#__PURE__*/ React.createElement(Area, {
        id: "footerMiddleCenter",
        className: "footer__middle__center"
    }), /*#__PURE__*/ React.createElement(Area, {
        id: "footerMiddleRight",
        className: "footer__middle__right"
    })), /*#__PURE__*/ React.createElement(Area, {
        id: "footerBottom",
        className: "footer__bottom mt-6",
        coreComponents: [
            {
                component: {
                    default: /*#__PURE__*/ React.createElement("div", {
                        className: "page-width"
                    }, /*#__PURE__*/ React.createElement("div", {
                        className: "self-center"
                    }, /*#__PURE__*/ React.createElement("div", {
                        className: "copyright text-center md:text-right text-muted-foreground text-sm"
                    }, /*#__PURE__*/ React.createElement("span", null, _(copyRight)))))
                },
                sortOrder: 10
            }
        ]
    }), /*#__PURE__*/ React.createElement(Toaster, null));
}
