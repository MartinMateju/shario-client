export const EMAIL_WORKSPACE_SECTIONS = Object.freeze([
  "history",
  "automations",
  "templates",
  "setup",
]);

const LEGACY_SECTIONS = Object.freeze({
  inbox: "history",
  routing: "history",
  satisfaction: "history",
  audit: "history",
  settings: "setup",
});

export const resolveEmailWorkspaceSection = ({
  section,
  tab,
  availableSections = EMAIL_WORKSPACE_SECTIONS,
  guided = false,
} = {}) => {
  const available = new Set(availableSections);
  let resolved = guided ? "setup" : String(section || "history");

  if (resolved === "automations" && tab) {
    resolved = tab === "senders" ? "setup" : tab;
  }

  resolved = LEGACY_SECTIONS[resolved] || resolved;
  return available.has(resolved) ? resolved : availableSections[0] || "history";
};

export const getEmailWorkspaceHref = (searchParams, section) => {
  const query = new URLSearchParams(searchParams?.toString?.() || "");
  query.set("section", section);
  query.delete("tab");
  query.delete("compose");
  return `/app/communications?${query.toString()}`;
};
