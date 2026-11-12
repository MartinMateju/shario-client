const AUTOMATED_COMMUNICATIONS_PATH = "/app/communications";

export const getAutomatedCommunicationsHref = (searchParams, tabId) => {
  const query = new URLSearchParams(searchParams?.toString?.() ?? "");

  query.set("section", "automations");
  query.set("tab", tabId);

  return `${AUTOMATED_COMMUNICATIONS_PATH}?${query.toString()}`;
};
