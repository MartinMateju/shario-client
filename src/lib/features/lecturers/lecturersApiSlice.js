import { apiSlice } from "../api/apiSlice";

export const lecturersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllLecturers: builder.query({
      query: (initialData) => ({
        url: `/lecturers/${initialData.userId}`,
        method: "GET",
        validateStatus: (response, result) => {
          return response.status === 200 && !result.isError;
        },
      }),
      providesTags: ["Lecturer"],
    }),
    createNewLecturer: builder.mutation({
      query: (initialData) => ({
        url: `/lecturers/${initialData.userId}`,
        method: "POST",
        body: { ...initialData },
      }),
      invalidatesTags: ["Lecturer"],
    }),
    deleteLecturer: builder.mutation({
      query: (initialData) => ({
        url: `/lecturers/${initialData.userId}`,
        method: "DELETE",
        body: { ...initialData },
      }),
      invalidatesTags: ["Lecturer"],
    }),
  }),
});

export const {
  useGetAllLecturersQuery,
  useCreateNewLecturerMutation,
  useDeleteLecturerMutation,
} = lecturersApiSlice;
