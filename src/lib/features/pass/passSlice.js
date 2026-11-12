import { createSlice } from "@reduxjs/toolkit";

const passSlice = createSlice({
  name: "pass",
  initialState: { email: null, resetToken: null, nextPath: null },
  reducers: {
    setTempCredentials: (state, action) => {
      const { email, resetToken, token, nextPath } = action.payload ?? {};
      state.email = email || null;
      state.resetToken = resetToken || token || null;
      state.nextPath = nextPath || null;
    },
    clearTempCredentials: (state) => {
      state.email = null;
      state.resetToken = null;
      state.nextPath = null;
    },
  },
});

export const { setTempCredentials, clearTempCredentials } = passSlice.actions;

export default passSlice.reducer;

export const selectCurrentTempUser = (state) => state.pass.email;

export const selectCurrentOptToken = (state) => state.pass.resetToken;

export const selectPasswordResetNextPath = (state) => state.pass.nextPath;
