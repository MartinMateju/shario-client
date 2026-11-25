// Next's server searchParams values may contain repeated query keys. Preserve
// these when older bookmarks are moved into the shared settings area.
export const getSettingsSearchParams = (searchParams) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry === "string") query.append(key, entry);
    }
  }
  return query;
};

export const getSettingsRedirectHref = (pathname, searchParams) => {
  const query = getSettingsSearchParams(searchParams).toString();
  return query ? `${pathname}?${query}` : pathname;
};
