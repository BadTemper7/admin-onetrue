import { create } from "zustand";
import { api, getApiError } from "../lib/api";

const emptyYardSummary = {
  areaCount: 0,
  blockCount: 0,
  totalAreaCapacityTeu: 0,
  totalTeuSlots: 0,
  occupiedSlots: 0,
  availableSlots: 0,
};

export const useAdminDashboardStore = create((set) => ({
  users: [],
  yardSummary: emptyYardSummary,
  bookingSummary: {},
  loading: false,
  error: "",

  fetchDashboard: async () => {
    set({ loading: true, error: "" });

    const [usersResult, yardResult, bookingsResult] = await Promise.allSettled([
      api.get("/admin/users"),
      api.get("/admin/yard/summary"),
      api.get("/admin/bookings/summary"),
    ]);

    const errors = [usersResult, yardResult, bookingsResult]
      .filter((result) => result.status === "rejected")
      .map((result) => getApiError(result.reason));

    set({
      users:
        usersResult.status === "fulfilled"
          ? usersResult.value.data.users || []
          : [],
      yardSummary:
        yardResult.status === "fulfilled"
          ? yardResult.value.data.summary || emptyYardSummary
          : emptyYardSummary,
      bookingSummary:
        bookingsResult.status === "fulfilled"
          ? bookingsResult.value.data.summary || {}
          : {},
      loading: false,
      error: errors[0] || "",
    });
  },
}));
