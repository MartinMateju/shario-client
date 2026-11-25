"use client";

import { useState } from "react";

import { useUpdateWorkspacePreferencesMutation } from "@/lib/features/workspace-access/workspaceAccessApiSlice";

export default function useWorkspaceBannerDismissal(access, preferenceKey) {
  const [updatePreferences] = useUpdateWorkspacePreferencesMutation();
  const scope = JSON.stringify([
    access?.tenantId,
    access?.userId,
    access?.membershipId,
    preferenceKey,
  ]);
  const [saved, setSaved] = useState(null);
  const local = saved?.scope === scope ? saved : null;
  const dismissed =
    local?.dismissed ?? access?.preferences?.[preferenceKey] === true;

  const setDismissed = async (value) => {
    if (local?.isSaving) return false;
    const request = { scope, dismissed, isSaving: true, saveError: false };
    setSaved(request);
    try {
      await updatePreferences({ [preferenceKey]: value }).unwrap();
      setSaved((current) =>
        current === request
          ? { scope, dismissed: value, isSaving: false, saveError: false }
          : current,
      );
      return true;
    } catch {
      // Keep the banner visible until its preference has actually been saved.
      setSaved((current) =>
        current === request
          ? { scope, dismissed, isSaving: false, saveError: true }
          : current,
      );
      return false;
    }
  };

  return {
    dismissed,
    setDismissed,
    isSaving: local?.isSaving === true,
    saveError: local?.saveError === true,
  };
}
