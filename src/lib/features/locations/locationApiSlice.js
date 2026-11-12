import { apiSlice } from "../api/apiSlice";

const LOCATIONS_URL = "/locations";

const locationListTags = (result) => {
  const locations = Array.isArray(result?.locations) ? result.locations : [];

  return [
    { type: "Location", id: "LIST" },
    ...locations
      .map((location) => location?._id || location?.id)
      .filter(Boolean)
      .map((id) => ({ type: "Location", id: String(id) })),
  ];
};

export const locationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLocations: builder.query({
      query: ({
        tenantId: _tenantId,
        search,
        isActive,
        bookingEnabled,
        page = 1,
        limit = 100,
      } = {}) => ({
        url: LOCATIONS_URL,
        params: {
          search,
          isActive,
          bookingEnabled,
          page,
          limit,
        },
      }),
      providesTags: locationListTags,
    }),

    getCustomerLocations: builder.query({
      query: ({ tenantId: _tenantId } = {}) => ({
        url: `${LOCATIONS_URL}/customer`,
        cache: "no-store",
      }),
      providesTags: (result) => [
        { type: "Location", id: "CUSTOMER-LIST" },
        ...locationListTags(result).slice(1),
      ],
    }),

    getLocationById: builder.query({
      query: (locationId) => `${LOCATIONS_URL}/${locationId}`,
      providesTags: (_result, _error, locationId) => [
        { type: "Location", id: String(locationId) },
      ],
    }),

    createLocation: builder.mutation({
      query: (body) => ({
        url: LOCATIONS_URL,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Location", id: "LIST" }, "SetupCenter"],
    }),

    updateLocation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${LOCATIONS_URL}/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Location", id: String(id) },
        { type: "Location", id: "LIST" },
        "SetupCenter",
      ],
    }),

    setPrimaryLocation: builder.mutation({
      query: (locationId) => ({
        url: `${LOCATIONS_URL}/${locationId}/set-primary`,
        method: "PATCH",
      }),
      invalidatesTags: ["Location", "SetupCenter"],
    }),

    activateLocation: builder.mutation({
      query: (locationId) => ({
        url: `${LOCATIONS_URL}/${locationId}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: ["Location", "SetupCenter"],
    }),

    deactivateLocation: builder.mutation({
      query: (locationId) => ({
        url: `${LOCATIONS_URL}/${locationId}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: ["Location", "SetupCenter"],
    }),

    archiveLocation: builder.mutation({
      query: (locationId) => ({
        url: `${LOCATIONS_URL}/${locationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Location", "SetupCenter"],
    }),
  }),
});

export const {
  useGetLocationsQuery,
  useGetCustomerLocationsQuery,
  useGetLocationByIdQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useSetPrimaryLocationMutation,
  useActivateLocationMutation,
  useDeactivateLocationMutation,
  useArchiveLocationMutation,
} = locationApiSlice;
