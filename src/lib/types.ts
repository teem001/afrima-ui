export type Role = "CONSUMER" | "MERCHANT";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
  phone?: string;
  role: Role;
}

export interface NearbyOffer {
  storeId: string;
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  openNow: boolean;
  storeImageUrl: string | null;
  productId: string;
  sku: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  unitPriceKobo: number;
  unitPrice: string;
  currency: string;
  distanceMeters: number;
}

export interface SearchResponse {
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  resultCount: number;
  minPriceKobo: number | null;
  maxPriceKobo: number | null;
  minPrice: string | null;
  maxPrice: string | null;
  offers: NearbyOffer[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  aliases: string[];
  imageMediaId: string | null;
  imageUrl: string | null;
}

export interface CreateProductRequest {
  sku?: string | null;
  name: string;
  description?: string | null;
  aliases?: string[];
  imageMediaId?: string | null;
}

export interface Store {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  openAt: string;
  closeAt: string;
  deliveryRadiusM: number;
  active: boolean;
  openNow: boolean;
  imageMediaId: string | null;
  imageUrl: string | null;
  phone: string | null;
  category: string | null;
}

export interface UpsertStoreRequest {
  name: string;
  description?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  openAt: string;
  closeAt: string;
  deliveryRadiusM?: number | null;
  imageMediaId?: string | null;
  phone?: string | null;
  category?: string | null;
}

export interface MediaUpload {
  id: string;
  url: string;
  contentType: string;
  byteSize: number;
}

export interface InventoryItem {
  id: string;
  storeId: string;
  productId: string;
  quantity: number;
  unitPriceKobo: number;
  unitPrice: string;
  currency: string;
}

export interface UpsertInventoryRequest {
  productId: string;
  quantity: number;
  unitPriceKobo: number;
}

export type OrderStatus = "PLACED" | "ACCEPTED" | "FULFILLED" | "CANCELLED";

export interface OrderLine {
  productId: string;
  quantity: number;
  unitPriceKobo: number;
  unitPrice: string;
}

export interface Order {
  id: string;
  consumerId: string;
  storeId: string;
  status: OrderStatus;
  totalKobo: number;
  total: string;
  currency: string;
  ledgerHash: string;
  createdAt: string;
  items: OrderLine[];
}

export interface PlaceOrderRequest {
  storeId: string;
  items: { productId: string; quantity: number }[];
}

export interface Wallet {
  ownerId: string;
  balanceKobo: number;
  balance: string;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  referenceId: string | null;
  description: string | null;
  amountKobo: number;
  amount: string;
  createdAt: string;
}

export interface OrderPayment {
  orderId: string;
  status: "UNPAID" | "IN_ESCROW" | "RELEASED" | "REFUNDED";
  amountKobo: number;
  amount: string;
  commissionKobo: number;
  commission: string;
  netKobo: number;
  net: string;
}

export interface Payout {
  id: string;
  amountKobo: number;
  amount: string;
  status: string;
  bankLabel: string;
  createdAt: string;
}

export interface MerchantPayments {
  walletBalanceKobo: number;
  walletBalance: string;
  inEscrowKobo: number;
  inEscrow: string;
  releasedGrossKobo: number;
  releasedGross: string;
  commissionKobo: number;
  commission: string;
  paidOutKobo: number;
  paidOut: string;
  payouts: Payout[];
}

export interface VerifyResult {
  orderId: string;
  ledgerHash: string;
  hashMatches: boolean;
  anchored: boolean;
  merkleRoot: string | null;
  txReference: string | null;
  anchorStatus: string | null;
  proofValid: boolean;
}

export interface StockTwin {
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceKobo: number;
  unitPrice: string;
  unitsSold7d: number;
  velocityPerDay: number;
  daysToStockout: number | null;
  lowStock: boolean;
}

export interface ShopSuggestion {
  type: string;
  message: string;
  productId: string | null;
  suggestedQty: number | null;
}

export interface ShopTwin {
  storeId: string;
  storeName: string;
  address: string;
  openNow: boolean;
  imageUrl: string | null;
  stock: StockTwin[];
  suggestions: ShopSuggestion[];
  money: MerchantPayments;
}

export interface CustomerTwin {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  wallet: Wallet;
  escrow: { inEscrowKobo: number; inEscrow: string; heldOrders: number };
  ordersCount: number;
  totalSpentKobo: number;
  totalSpent: string;
  recentOrders: Order[];
}

export interface Simulation {
  productId: string;
  productName: string;
  currentQuantity: number;
  restockQty: number;
  currentPriceKobo: number;
  currentPrice: string;
  simulatedPriceKobo: number;
  simulatedPrice: string;
  velocityPerDay: number;
  daysToStockoutNow: number | null;
  daysToStockoutAfterRestock: number | null;
  projectedRevenue7dKobo: number;
  projectedRevenue7d: string;
  simulatedRevenue7dKobo: number;
  simulatedRevenue7d: string;
  note: string;
}

export interface StockChanged {
  storeId: string;
  productId: string;
  quantity: number;
  unitPriceKobo: number;
}

export interface AiStatus {
  engine: string;
  configured: boolean;
  model: string | null;
}

export interface AiClientContext {
  screen?: string;
  searchQuery?: string;
  locationLabel?: string;
  radiusMeters?: number;
  storeName?: string;
  cart?: {
    storeName?: string;
    items: { productName: string; quantity: number; unitPrice: string }[];
  };
}

export interface AiChatRequest {
  conversationId?: string;
  message: string;
  latitude?: number;
  longitude?: number;
  context?: AiClientContext;
}

export interface ToolExecution {
  tool: string;
  arguments: Record<string, unknown>;
  result: { success: boolean; message?: string; errorCode?: string; data?: unknown };
}

export interface AiChatResponse {
  conversationId: string;
  reply: string;
  toolCalls: ToolExecution[];
}

export type AiProgress =
  | { requestId: string; phase: "conversation"; conversationId: string }
  | { requestId: string; phase: "thinking"; round: number }
  | { requestId: string; phase: "tool_started"; tool: string }
  | { requestId: string; phase: "tool_finished"; tool: string; success: boolean; message?: string };

export interface ErrorResponse {
  code: string;
  message: string;
  status: number;
  timestamp: string;
  details: string[];
}
