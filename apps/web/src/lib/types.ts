// Tipos compartilhados das respostas da API

export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  hasGoogle: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  priceFromCents: number;
  hasVariants: boolean;
  isFeatured: boolean;
  soldOut: boolean;
  category: { id: string; name: string; slug: string };
  image: { url: string; alt: string } | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize?: number;
  total: number;
  totalPages: number;
}

export interface Variant {
  id: string;
  name: string;
  size: string | null;
  flavor: string | null;
  priceCents: number;
  stock: number | null;
  available: boolean;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  priceFromCents: number;
  leadTimeDays: number | null;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string }[];
  variants: Variant[];
  rating: { average: number; count: number };
  reviews: Review[];
  related: ProductCard[];
}

export interface Testimonial extends Review {
  product: { name: string; slug: string } | null;
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagramHandle: string;
  addressLine: string;
  city: string;
  mapQuery: string;
  openingHours: string;
  aboutText: string;
  minLeadDays: number;
  customMinLeadDays: number;
  openWeekdays: number[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  sortOrder: number;
}

export interface InstagramPost {
  id: string;
  caption: string;
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  mediaType: string;
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id'>;

export interface CartLine {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  imageAlt: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  stock: number | null;
  leadTimeDays: number | null;
}

export interface ShippingQuote {
  deliverable: boolean;
  feeCents: number;
  zoneName: string | null;
  address: { zipCode: string; street: string; neighborhood: string; city: string; state: string } | null;
}

export interface CartQuote {
  lines: CartLine[];
  problems: { variantId: string; message: string }[];
  subtotalCents: number;
  shipping: ShippingQuote | null;
  shippingCents: number;
  totalCents: number;
  leadDays: number;
  earliestDate: string;
  openWeekdays: number[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'RECEIVED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED';

export type PaymentMethod = 'PIX' | 'CARD';
export type FulfillmentType = 'DELIVERY' | 'PICKUP';

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'REFUNDED';
  statusDetail: string | null;
  amountCents: number;
  provider: string;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  pixTicketUrl: string | null;
  pixExpiresAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  scheduledDate: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: Omit<AddressInput, 'isDefault'> | null;
  shippingZone: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  customOrder: { id: string; number: string } | null;
  items: {
    id: string;
    productId: string | null;
    productName: string;
    variantName: string | null;
    imageUrl: string | null;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
  }[];
  statusHistory: { status: OrderStatus; note: string | null; createdAt: string }[];
  payments: Payment[];
}

export interface OrderSummary {
  id: string;
  number: string;
  status: OrderStatus;
  totalCents: number;
  fulfillmentType: FulfillmentType;
  scheduledDate: string;
  createdAt: string;
  items: { productName: string; quantity: number; imageUrl: string | null }[];
}

export type CustomOrderStatus =
  | 'REQUESTED'
  | 'QUOTED'
  | 'APPROVED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELED';

export interface CustomOrder {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventType: string;
  eventDate: string;
  guests: number;
  size: string | null;
  flavor: string;
  filling: string | null;
  frosting: string | null;
  fulfillmentType: FulfillmentType;
  notes: string | null;
  referenceImageUrl: string | null;
  status: CustomOrderStatus;
  quotedPriceCents: number | null;
  quoteMessage: string | null;
  createdAt: string;
  order: { id: string; status: OrderStatus } | null;
  adminNotes?: string | null;
  statusHistory?: { status: CustomOrderStatus; note: string | null; createdAt: string }[];
}
