export const shouldOpenGuidedInventoryCreate = ({
  guided,
  setupStep,
  action,
}) => Boolean(guided && setupStep === "inventory" && action === "create");

export const toggleInventoryItemAvailability = async ({
  itemId,
  itemIsActive,
  updateItem,
  refreshAndContinue,
}) => {
  const restoring = itemIsActive === false;

  await updateItem({ id: itemId, isActive: restoring }).unwrap();

  if (!restoring) return { restoring, continued: false };

  const continued = await refreshAndContinue({
    metadata: { form: "inventory_item", action: "restore" },
  });

  return { restoring, continued };
};
