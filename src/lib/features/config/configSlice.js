import { formatDateToYYYYMMDD } from "@/utils/utilityFunctions";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSidebarOpen: false,
  selectedDate: formatDateToYYYYMMDD(new Date()),
  loaderRunning: false,
  sidebarContext: "studio", // "studio" or "course"
  sidebarLocationId: null,
  sidebarPrefill: null, // { start, end, bookingType, lane, isHalfWidth, source } | null
};

const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    openSidebar: (state, action) => {
      state.isSidebarOpen = true;

      if (typeof action.payload === "string") {
        state.sidebarContext = action.payload || "studio";
        state.sidebarLocationId = null;
        state.sidebarPrefill = null;
        return;
      }

      if (action.payload && typeof action.payload === "object") {
        state.sidebarContext = action.payload.context || "studio";
        state.sidebarLocationId = action.payload.locationId || null;
        state.sidebarPrefill = action.payload.prefill || null;
        if (action.payload.selectedDate) {
          state.selectedDate = action.payload.selectedDate;
        }
        return;
      }

      state.sidebarContext = "studio";
      state.sidebarLocationId = null;
      state.sidebarPrefill = null;
    },

    closeSidebar: (state) => {
      state.isSidebarOpen = false;
      state.sidebarLocationId = null;
      state.sidebarPrefill = null;
    },

    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },

    setSidebarContext: (state, action) => {
      state.sidebarContext = action.payload || "studio";
    },

    setSidebarLocationId: (state, action) => {
      state.sidebarLocationId = action.payload || null;
    },

    setSidebarPrefill: (state, action) => {
      state.sidebarPrefill = action.payload || null;
    },

    clearSidebarPrefill: (state) => {
      state.sidebarPrefill = null;
    },

    setLoaderRunning: (state, action) => {
      state.loaderRunning = action.payload;
    },
  },
});

export const {
  openSidebar,
  closeSidebar,
  setSidebarContext,
  setSidebarLocationId,
  setSelectedDate,
  setSidebarPrefill,
  clearSidebarPrefill,
  setLoaderRunning,
} = configSlice.actions;

// alias so both names work
export const setPickedDate = setSelectedDate;

export default configSlice.reducer;

export const selectIsSidebarOpen = (state) => state.config.isSidebarOpen;
export const selectPickedDate = (state) => state.config.selectedDate;
export const selectLoaderStatus = (state) => state.config.loaderRunning;
export const selectSidebarContext = (state) => state.config.sidebarContext;
export const selectSidebarLocationId = (state) =>
  state.config.sidebarLocationId;
export const selectSidebarPrefill = (state) => state.config.sidebarPrefill;
