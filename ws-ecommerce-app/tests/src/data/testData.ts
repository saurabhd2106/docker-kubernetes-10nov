export const products = {
  aeroClick: {
    search: 'AeroClick',
    name: 'AeroClick Wireless Mouse',
    priceCents: 2499,
  },
  northlineTee: {
    search: 'Northline',
    name: 'Northline Cotton Tee',
    priceCents: 1999,
  },
  gardenPasta: {
    search: 'GardenPasta',
    name: 'GardenPasta Penne',
    priceCents: 349,
  },
  soldOut: {
    search: 'SoldOut',
    name: 'SoldOut',
  },
  lastPair: {
    search: 'LastPair',
    name: 'LastPair USB Hub',
  },
} as const;

export const cards = {
  approved: ['4242424242424242', '5555555555554444', '378282246310005'] as const,
  declined: ['4000000000000002', '4000000000009995'] as const,
};

export const promoCodes = {
  save10: 'SAVE10',
  fiveOff: 'FIVEOFF',
  expired: 'EXPIRED',
} as const;

export const shippingDefaults = {
  shippingName: 'Demo Shopper',
  shippingLine1: '100 Market Street',
  shippingCity: 'San Francisco',
  shippingRegion: 'CA',
  shippingPostal: '94105',
  cardName: 'Demo Shopper',
  cardExpMonth: '12',
  cardExpYear: '2030',
  cardCvc: '123',
} as const;
