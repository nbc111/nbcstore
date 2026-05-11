declare namespace _default {
    export { GraphQLJSON as JSON };
    export namespace Query {
        function nbcWallet(_: any, args: any, { customer }: {
            customer: any;
        }): Promise<{
            walletId: any;
            uuid: any;
            customerId: any;
            walletAddress: any;
            chainId: any;
            balance: number;
            frozenBalance: number;
            availableBalance: number;
            currency: string;
            status: any;
            exchangeRate: number;
            cnyValue: number;
            availableCnyValue: number;
            lastLoginAt: any;
            createdAt: any;
            updatedAt: any;
        } | null>;
        function nbcWalletTransactions(_: any, args: any, { customer }: {
            customer: any;
        }): Promise<{
            items: {
                walletTxId: any;
                uuid: any;
                walletId: any;
                orderId: any;
                orderUuid: any;
                orderNumber: any;
                transactionType: any;
                amount: number;
                balanceBefore: number;
                balanceAfter: number;
                exchangeRate: number | null;
                cnyAmount: number | null;
                reference: any;
                status: any;
                metadata: any;
                createdAt: any;
            }[];
            currentPage: number;
            pageSize: number;
            total: number;
        } | {
            items: never[];
            currentPage: any;
            pageSize: any;
            total: number;
        }>;
    }
    export namespace Customer {
        export function nbcWallet_1({ customerId }: {
            customerId: any;
        }): Promise<{
            walletId: any;
            uuid: any;
            customerId: any;
            walletAddress: any;
            chainId: any;
            balance: number;
            frozenBalance: number;
            availableBalance: number;
            currency: string;
            status: any;
            exchangeRate: number;
            cnyValue: number;
            availableCnyValue: number;
            lastLoginAt: any;
            createdAt: any;
            updatedAt: any;
        } | null>;
        export { nbcWallet_1 as nbcWallet };
        export function nbcWalletTransactions_1({ customerId }: {
            customerId: any;
        }, args: any): Promise<{
            items: {
                walletTxId: any;
                uuid: any;
                walletId: any;
                orderId: any;
                orderUuid: any;
                orderNumber: any;
                transactionType: any;
                amount: number;
                balanceBefore: number;
                balanceAfter: number;
                exchangeRate: number | null;
                cnyAmount: number | null;
                reference: any;
                status: any;
                metadata: any;
                createdAt: any;
            }[];
            currentPage: number;
            pageSize: number;
            total: number;
        }>;
        export { nbcWalletTransactions_1 as nbcWalletTransactions };
    }
    export namespace Order {
        function nbcUsage({ orderId }: {
            orderId: any;
        }, args: any, { customer }: {
            customer: any;
        }): Promise<{
            nbcAmount: number;
            exchangeRate: number;
            cnyAmount: number;
            wallet: () => Promise<{
                walletId: any;
                uuid: any;
                customerId: any;
                walletAddress: any;
                chainId: any;
                balance: number;
                frozenBalance: number;
                availableBalance: number;
                currency: string;
                status: any;
                exchangeRate: number;
                cnyValue: number;
                availableCnyValue: number;
                lastLoginAt: any;
                createdAt: any;
                updatedAt: any;
            } | null>;
        } | null>;
    }
    export namespace NbcOrderUsage {
        function wallet(usage: any): any;
    }
}
export default _default;
import { GraphQLJSON } from 'graphql-type-json';
