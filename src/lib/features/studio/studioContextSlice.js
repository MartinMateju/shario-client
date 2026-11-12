import { createSlice } from "@reduxjs/toolkit";

import { logOut } from "@/lib/features/auth/authSlice";
import {
  getTenantIdFromUser,
  isMongoObjectId,
} from "@/lib/features/locations/location.utils";

const initialState = {
  tenantId: null,
  activeStudioId: null,
};

const normalizeStudioId = (value) => {
  const studioId = typeof value === "string" ? value.trim() : "";

  return isMongoObjectId(studioId) ? studioId : null;
};

const studioContextSlice = createSlice({
  name: "studioContext",
  initialState,
  reducers: {
    setActiveStudioId(state, action) {
      const tenantId = normalizeStudioId(action.payload?.tenantId);
      const studioId = normalizeStudioId(action.payload?.studioId);

      state.tenantId = tenantId;
      state.activeStudioId = tenantId && studioId ? studioId : null;
    },

    clearActiveStudioId(state) {
      state.tenantId = null;
      state.activeStudioId = null;
    },

    resetStudioContext() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logOut, () => initialState);
  },
});

export const { setActiveStudioId, clearActiveStudioId, resetStudioContext } =
  studioContextSlice.actions;

export const selectStudioContext = (state) =>
  state.studioContext || initialState;

export const selectActiveStudioId = (state) => {
  const context = selectStudioContext(state);
  const authenticatedTenantId = getTenantIdFromUser(state?.auth?.userInfo);

  if (
    context.tenantId !== authenticatedTenantId ||
    !isMongoObjectId(context.activeStudioId || "")
  ) {
    return null;
  }

  return context.activeStudioId;
};

export const selectHasActiveStudio = (state) =>
  Boolean(selectActiveStudioId(state));

export default studioContextSlice.reducer;
