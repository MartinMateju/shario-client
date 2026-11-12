// lib/features/staffTasks/staffTasksApiSlice.js
import { apiSlice } from "../api/apiSlice";

const normalizeTaskParams = ({ locationId, ...params } = {}) => ({
  ...params,
  ...(locationId ? { location: locationId } : {}),
});

const normalizeTaskBody = ({ locationId, ...body } = {}) => ({
  ...body,
  ...(locationId !== undefined ? { location: locationId || null } : {}),
});

export const staffTasksApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStaffTasks: builder.query({
      query: (params = {}) => ({
        url: "/staff/tasks",
        params: normalizeTaskParams(params),
      }),
      providesTags: ["StaffTask"],
    }),

    createStaffTask: builder.mutation({
      query: (body) => ({
        url: "/staff/tasks",
        method: "POST",
        body: normalizeTaskBody(body),
      }),
      invalidatesTags: ["StaffTask", "StaffPlanning"],
    }),

    updateStaffTask: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/staff/tasks/${id}`,
        method: "PATCH",
        body: normalizeTaskBody(body),
      }),
      invalidatesTags: ["StaffTask", "StaffPlanning"],
    }),

    deleteStaffTask: builder.mutation({
      query: (id) => ({
        url: `/staff/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StaffTask", "StaffPlanning"],
    }),
  }),
});

export const {
  useGetStaffTasksQuery,
  useCreateStaffTaskMutation,
  useUpdateStaffTaskMutation,
  useDeleteStaffTaskMutation,
} = staffTasksApiSlice;
