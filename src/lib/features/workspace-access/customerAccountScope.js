const getId = (record) => String(record?.id || record?._id || "");

// Keep the account query identity identical in the portal and mutation cache
// updates. The API chooses the account from authentication, never these args.
export const getCustomerAccountQueryScope = (customer, tenant) => ({
  customerId: getId(customer),
  tenantId: getId(tenant) || tenant?.slug || "",
});
