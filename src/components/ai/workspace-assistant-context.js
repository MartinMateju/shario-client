const OBJECT_ID = /^[a-f\d]{24}$/i;
const SAFE_WORKSPACE_ROUTE = /^\/app(?:\/[a-z0-9_-]+)*$/i;

const normalizeWorkspaceRoute = (value) => {
  const raw = String(value ?? "")
    .trim()
    .split(/[?#]/, 1)[0]
    .replace(/\/+$/, "");
  if (!raw || raw.length > 300 || !SAFE_WORKSPACE_ROUTE.test(raw)) {
    return "/app";
  }
  return raw;
};

const queryValues = (searchParams, key) => {
  if (typeof searchParams?.getAll === "function") {
    return searchParams.getAll(key).map((value) => String(value).trim());
  }
  if (typeof searchParams?.get === "function") {
    const value = String(searchParams.get(key) ?? "").trim();
    return value ? [value] : [];
  }
  return [];
};

export const buildWorkspaceAssistantContext = ({
  pathname,
  searchParams,
} = {}) => {
  const route = normalizeWorkspaceRoute(pathname);

  const editorId = route.match(/^\/app\/bookings\/([a-f\d]{24})\/edit$/i)?.[1];
  if (editorId) {
    return {
      surface: "workspace",
      route,
      entity: { kind: "booking", id: editorId },
    };
  }

  if (route === "/app/bookings") {
    const bookingIds = queryValues(searchParams, "bookingId");
    if (bookingIds.length === 1 && OBJECT_ID.test(bookingIds[0])) {
      return {
        surface: "workspace",
        route,
        entity: {
          kind: "booking",
          id: bookingIds[0],
        },
      };
    }
  }

  return {
    surface: "command_center",
    route,
  };
};

export const getWorkspaceAssistantContextScope = (context) =>
  [
    context?.surface || "general",
    context?.route || "",
    context?.entity?.kind || "",
    context?.entity?.id || "",
    context?.setupStepId || "",
    context?.knowledgeSourceId || "",
    context?.recommendationId || "",
  ]
    .map((value) => String(value))
    .join("|");
