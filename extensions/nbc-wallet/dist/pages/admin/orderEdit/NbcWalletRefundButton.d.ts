import React from 'react';
interface Props {
    refundAPI: string;
    order: {
        uuid: string;
        paymentMethod: string;
        paymentStatus: {
            code: string;
        };
    };
}
export default function NbcWalletRefundButton({ refundAPI, order: { uuid, paymentMethod, paymentStatus } }: Props): React.JSX.Element | null;
export declare const layout: {
    areaId: string;
    sortOrder: number;
};
export declare const query = "\n  query Query {\n    refundAPI: url(routeId: \"nbcWalletRefundPayment\")\n    order(uuid: getContextValue(\"orderId\")) {\n      uuid\n      paymentMethod\n      paymentStatus {\n        code\n      }\n    }\n  }\n";
export {};
