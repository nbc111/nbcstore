export function buildCurrentCustomer(customer) {
    return {
        customer_id: customer.customer_id,
        group_id: customer.group_id ?? 0,
        uuid: customer.uuid,
        email: customer.email,
        full_name: customer.full_name ?? '',
        status: customer.status,
        created_at: customer.created_at,
        updated_at: customer.updated_at
    };
}
