import React from 'react';
interface Props {
    captureAPI: string;
    order: {
        uuid: string;
        paymentMethod: string;
        paymentStatus: {
            code: string;
        };
    };
}
export default function NbcWalletCaptureButton({ captureAPI, order: { uuid, paymentMethod, paymentStatus } }: Props): React.JSX.Element | null;
export declare const layout: {
    areaId: string;
    sortOrder: number;
};
export declare const query = "\n  query Query {\n    captureAPI: url(routeId: \"nbcWalletCapturePayment\")\n    order(uuid: getContextValue(\"orderId\")) {\n      uuid\n      paymentMethod\n      paymentStatus {\n        code\n      }\n    }\n  }\n";
export {};
