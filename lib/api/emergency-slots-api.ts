import { api } from "@/lib/api/api";
import { applyMutationCacheEffects } from "@/lib/api/cache-side-effects";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";

export type EmergencySlotIndex = 1 | 2 | 3 | 4 | 5;

export type EmergencySlotContentType = "IMAGE" | "VIDEO" | "TEXT" | "FLASH";

export type EmergencySlotContentStatus = "PROCESSING" | "READY" | "FAILED";

export interface EmergencySlotContent {
  readonly id: string;
  readonly title: string;
  readonly type: EmergencySlotContentType;
  readonly status: EmergencySlotContentStatus;
  readonly thumbnailKey: string | null;
}

export interface EmergencySlot {
  readonly slotIndex: EmergencySlotIndex;
  readonly label: string | null;
  readonly contentId: string | null;
  readonly content: EmergencySlotContent | null;
  readonly updatedAt: string | null;
}

export interface ListEmergencySlotsResponse {
  readonly slots: readonly EmergencySlot[];
}

export interface SetEmergencySlotRequest {
  readonly slotIndex: EmergencySlotIndex;
  readonly label: string;
  readonly contentId: string;
}

export interface ClearEmergencySlotRequest {
  readonly slotIndex: EmergencySlotIndex;
}

export const emergencySlotsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listEmergencySlots: build.query<ListEmergencySlotsResponse, void>({
      query: () => "displays/emergency-slots",
      transformResponse: (response) =>
        parseApiResponseDataSafe<ListEmergencySlotsResponse>(
          response,
          "listEmergencySlots",
        ),
      providesTags: [{ type: "EmergencySlots", id: "LIST" }],
    }),
    setEmergencySlot: build.mutation<EmergencySlot, SetEmergencySlotRequest>({
      query: ({ slotIndex, label, contentId }) => ({
        url: `displays/emergency-slots/${slotIndex}`,
        method: "PUT",
        body: { label, contentId },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<EmergencySlot>(response, "setEmergencySlot"),
      invalidatesTags: [
        { type: "EmergencySlots", id: "LIST" },
        { type: "RuntimeOverrides", id: "GLOBAL" },
        { type: "Display", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await applyMutationCacheEffects(dispatch, {
            invalidate: [
              { type: "EmergencySlots", id: "LIST" },
              { type: "RuntimeOverrides", id: "GLOBAL" },
              { type: "Display", id: "LIST" },
            ],
            revalidate: ["displays-bootstrap", "displays-options"],
          });
        } catch {
          // mutation failed
        }
      },
    }),
    clearEmergencySlot: build.mutation<void, ClearEmergencySlotRequest>({
      query: ({ slotIndex }) => ({
        url: `displays/emergency-slots/${slotIndex}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "EmergencySlots", id: "LIST" },
        { type: "RuntimeOverrides", id: "GLOBAL" },
        { type: "Display", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await applyMutationCacheEffects(dispatch, {
            invalidate: [
              { type: "EmergencySlots", id: "LIST" },
              { type: "RuntimeOverrides", id: "GLOBAL" },
              { type: "Display", id: "LIST" },
            ],
            revalidate: ["displays-bootstrap", "displays-options"],
          });
        } catch {
          // mutation failed
        }
      },
    }),
  }),
});

export const {
  useListEmergencySlotsQuery,
  useSetEmergencySlotMutation,
  useClearEmergencySlotMutation,
} = emergencySlotsApi;
