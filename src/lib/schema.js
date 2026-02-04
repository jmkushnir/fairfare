export const emptyState = () => ({
  // Safe UUID-ish value (works even if crypto.randomUUID is unavailable)
  session_id:
    (globalThis.crypto && typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,

  traveler_profile: {
    age_range: "",
    mobility_notes: ""
  },

  trip: {
    from: "",
    to: "",
    trip_type: "one_way", // "one_way" | "round_trip"
    depart_date: "",
    return_date: ""
  },

  preferences: {
    max_connections: 1,        // 0 | 1 | 2
    min_layover_minutes: 90,   // 60/75/90/120 etc.
    avoid_redeye: true,
    avoid_early: false,
    avoid_late_arrival: false
  }
});
