interface NbcWalletProps {
    captureAPI: string;
    checkoutSuccessUrl: string;
}
export default function NbcWallet({ captureAPI, checkoutSuccessUrl }: NbcWalletProps): null;
export declare const layout: {
    areaId: string;
    sortOrder: number;
};
export declare const query = "\n  query Query {\n    captureAPI: url(routeId: \"nbcWalletCapturePayment\")\n    checkoutSuccessUrl: url(routeId: \"checkoutSuccess\")\n  }\n";
export {};
