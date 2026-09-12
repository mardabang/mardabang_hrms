export const fallbackFirms = [
  { id: 1, code: "MBIPL", name: "Marda Bang Industries Pvt. Ltd.", active: true },
  { id: 2, code: "MBQS", name: "Marda Bang Quality Services", active: true },
  { id: 3, code: "MSI", name: "Marda Bang Solutions Inc.", active: false },
];

export const getAvailableFirms = (firms) =>
  Array.isArray(firms) && firms.length ? firms : fallbackFirms;

export const getActiveFirms = (firms) =>
  getAvailableFirms(firms).filter(
    (firm) => firm.active !== false && firm.status !== "Inactive"
  );
