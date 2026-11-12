const ANONYMOUS_REFRESH_CONSOLE_ERROR =
  "Failed to load resource: the server responded with a status of 401 (Unauthorized)";

export const isExpectedAnonymousRefreshConsoleError = (message) => {
  if (
    message.type() !== "error" ||
    message.text() !== ANONYMOUS_REFRESH_CONSOLE_ERROR
  ) {
    return false;
  }

  const locationUrl = message.location().url;

  if (!locationUrl) return false;

  try {
    return ["/auth/refresh", "/auth/customer/refresh"].includes(
      new URL(locationUrl).pathname,
    );
  } catch {
    return false;
  }
};
