// The sealed OAuth handoff is still a short-lived bearer. Consume it from the
// fragment only, remove it before starting network work and never persist it.
export const consumeCustomerSessionHandoff = ({
  location = window.location,
  history = window.history,
} = {}) => {
  const fragment = new URLSearchParams(String(location.hash || "").slice(1));
  const handoffs = fragment.getAll("sessionHandoff");
  if (!handoffs.length) return { present: false, value: "" };

  history.replaceState(
    history.state,
    "",
    `${location.pathname}${location.search}`,
  );
  const value = handoffs.length === 1 ? handoffs[0] : "";
  return {
    present: true,
    value:
      value.length <= 16_384 && /^v1\.[A-Za-z0-9_.-]+$/.test(value)
        ? value
        : "",
  };
};
