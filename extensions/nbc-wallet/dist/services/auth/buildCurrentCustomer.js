export function buildCurrentCustomer(customer) {
    var _a, _b;
    return {
        customer_id: customer.customer_id,
        group_id: (_a = customer.group_id) !== null && _a !== void 0 ? _a : 0,
        uuid: customer.uuid,
        email: customer.email,
        full_name: (_b = customer.full_name) !== null && _b !== void 0 ? _b : '',
        status: customer.status,
        created_at: customer.created_at,
        updated_at: customer.updated_at
    };
}
//# sourceMappingURL=buildCurrentCustomer.js.map