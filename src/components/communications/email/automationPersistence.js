import { getResourceId } from "./emailContent";

const getCreatedAutomation = (response) =>
  response?.automation ?? response?.data ?? response;

export function resolveCommunicationAutomationSaveState({
  activate = false,
  managedReady = false,
  currentlyActive = false,
  currentStatus = "inactive",
} = {}) {
  if (activate && !managedReady) {
    return {
      allowed: false,
      isActive: false,
      automationStatus: "inactive",
    };
  }

  return {
    allowed: true,
    isActive: Boolean(activate || (managedReady && currentlyActive)),
    automationStatus: activate
      ? "active"
      : managedReady
        ? currentStatus
        : "inactive",
  };
}

/**
 * Persist a draft before activating it. `onPersisted` runs immediately after
 * the create succeeds, so a failed activation can be retried as an update
 * instead of creating duplicate drafts.
 */
export async function persistCommunicationAutomation({
  persistedId = "",
  payload,
  activate = false,
  createAutomation,
  updateAutomation,
  onPersisted,
  missingIdMessage = "The automation was saved, but it could not be activated.",
}) {
  let automationId = getResourceId(persistedId);

  if (automationId) {
    await updateAutomation({ id: automationId, ...payload });
    return { id: automationId, created: false };
  }

  const created = await createAutomation({
    ...payload,
    isActive: false,
    automationStatus: "waiting_to_activate",
  });
  automationId = getResourceId(getCreatedAutomation(created));

  if (automationId) onPersisted?.(automationId);

  if (activate) {
    if (!automationId) throw new Error(missingIdMessage);
    await updateAutomation({
      id: automationId,
      isActive: true,
      automationStatus: "active",
    });
  }

  return { id: automationId, created: true };
}
