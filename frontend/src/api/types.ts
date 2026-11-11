export type Product = {
  code: string;
  name: string;
  unitPriceCents: number;
  promotions: string[];
};

export type Catalogue = {
  currency: string;
  maximumQuantityPerProduct: number;
  products: Product[];
};

export type BasketItem = {
  code: string;
  quantity: number;
};

export type QuoteLine = {
  code: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
};

export type AppliedOffer = {
  productCode: string;
  description: string;
  timesApplied: number;
  discountCents: number;
};

export type NextDeliveryTier = {
  thresholdCents: number;
  deliveryCents: number;
  remainingCents: number;
};

export type Quote = {
  currency: string;
  itemCount: number;
  lines: QuoteLine[];
  appliedOffers: AppliedOffer[];
  subtotalCents: number;
  discountCents: number;
  discountedSubtotalCents: number;
  deliveryCents: number;
  nextDeliveryTier: NextDeliveryTier | null;
  totalCents: number;
};
