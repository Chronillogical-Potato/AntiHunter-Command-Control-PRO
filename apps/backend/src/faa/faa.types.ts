export interface FaaAircraftSummary {
  nNumber: string;
  serialNumber?: string | null;
  documentNumber?: string | null;
  documentUrl?: string | null;
  trackingNumber?: string | null;
  makeName?: string | null;
  modelName?: string | null;
  series?: string | null;
  fccIdentifier?: string | null;
  registrantName?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  aircraftType?: string | null;
  engineType?: string | null;
  statusCode?: string | null;
  modeSCodeHex?: string | null;
  yearManufactured?: number | null;
  lastActionDate?: Date | null;
  expirationDate?: Date | null;
}
