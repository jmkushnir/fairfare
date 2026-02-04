export const emptyTraveler = {
  label: "",
  ageRange: "",
  stamina: "",
  assistance: [],
  comfort: [],
  timing: { avoidEarly: false, avoidLate: false, redEyeOk: false },
  connections: { nonstopOnly: false, maxStops: 1, minLayoverMin: 90 },
  pets: { hasPet: false, hasServiceAnimal: false, inCabinRequired: false }
};

export const emptyTrip = {
  from: "",
  to: "",
  tripType: "oneway",
  departDate: "",
  returnDate: "",
  travelers: [structuredClone(emptyTraveler)]
};
