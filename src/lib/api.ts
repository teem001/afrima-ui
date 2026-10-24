import { apiHttpOrigin } from "@/lib/media";
import { useAuth } from "@/store/auth";
import { ApiError, realtime } from "@/lib/ws";
import type {
  AiChatRequest,
  AiChatResponse,
  AiProgress,
  AiStatus,
  AuthResponse,
  CreateProductRequest,
  CustomerTwin,
  InventoryItem,
  LoginRequest,
  MediaUpload,
  MerchantPayments,
  Order,
  OrderPayment,
  Payout,
  PlaceOrderRequest,
  Product,
  RegisterRequest,
  SearchResponse,
  ShopTwin,
  Simulation,
  Store,
  UpsertInventoryRequest,
  UpsertStoreRequest,
  User,
  VerifyResult,
  Wallet,
  WalletTransaction,
} from "@/lib/types";

export { ApiError };

/** A model turn can take a minute and the agent may run several tools, so chats get a long deadline. */
const AI_CHAT_TIMEOUT_MS = 180_000;

const call = <T>(type: string, payload?: unknown) => realtime.request<T>(type, payload);

/** Prefer HTTP for media — large base64 frames used to exceed the 64KB WebSocket limit and drop the socket. */
async function uploadMediaHttp(body: { contentType: string; data: string }): Promise<MediaUpload> {
  const token = useAuth.getState().token;
  if (!token) {
    throw new ApiError(401, { code: "UNAUTHORIZED", message: "Sign in to upload media" });
  }
  const response = await fetch(`${apiHttpOrigin()}/api/v1/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const err = parsed as { code?: string; message?: string; details?: string[] } | null;
    throw new ApiError(response.status, {
      code: err?.code ?? "UPLOAD_FAILED",
      message: err?.message ?? `Upload failed (${response.status})`,
      details: err?.details ?? [],
    });
  }
  return parsed as MediaUpload;
}

export const api = {
  login: (body: LoginRequest) => call<AuthResponse>("auth.login", body),
  register: (body: RegisterRequest) => call<AuthResponse>("auth.register", body),
  logout: () => call<null>("auth.logout"),
  me: () => call<User>("me"),

  search: (params: {
    q: string;
    lat: number;
    lng: number;
    /** Omit to search any store with stock; set to limit by distance (e.g. cart reroute). */
    radiusMeters?: number | null;
    page?: number;
    pageSize?: number;
  }) => call<SearchResponse>("search", params),

  products: () => call<Product[]>("catalog.products"),
  createProduct: (body: CreateProductRequest) => call<Product>("catalog.products.create", body),
  stores: () => call<Store[]>("stores.list"),
  myStores: () => call<Store[]>("stores.mine"),
  createStore: (body: UpsertStoreRequest) => call<Store>("stores.create", body),
  updateStore: (storeId: string, body: UpsertStoreRequest) => call<Store>("stores.update", { storeId, ...body }),
  inventory: (storeId: string) => call<InventoryItem[]>("inventory.list", { storeId }),
  upsertInventory: (storeId: string, body: UpsertInventoryRequest) =>
    call<InventoryItem>("inventory.upsert", { storeId, ...body }),
  restockInventory: (storeId: string, body: { productId: string; addQuantity: number; unitPriceKobo?: number | null }) =>
    call<InventoryItem>("inventory.restock", { storeId, ...body }),
  uploadMedia: (body: { contentType: string; data: string }) => uploadMediaHttp(body),

  placeOrder: (body: PlaceOrderRequest) => call<Order>("orders.place", body),
  myOrders: () => call<Order[]>("orders.mine"),
  order: (orderId: string) => call<Order>("orders.get", { orderId }),
  merchantOrders: () => call<Order[]>("orders.merchant"),
  acceptOrder: (orderId: string) => call<Order>("orders.accept", { orderId }),
  fulfilOrder: (orderId: string) => call<Order>("orders.fulfil", { orderId }),
  cancelOrder: (orderId: string) => call<Order>("orders.cancel", { orderId }),
  verifyOrder: (orderId: string) => call<VerifyResult>("verify", { orderId }),

  wallet: () => call<Wallet>("wallet.me"),
  fundWallet: (amountKobo: number) => call<Wallet>("wallet.fund", { amountKobo }),
  walletTransactions: () => call<WalletTransaction[]>("wallet.transactions"),
  orderPayment: (orderId: string) => call<OrderPayment>("payments.order", { orderId }),
  merchantPayments: () => call<MerchantPayments>("payments.merchantSummary"),
  requestPayout: (amountKobo: number) => call<Payout>("payouts.request", { amountKobo }),
  myPayouts: () => call<Payout[]>("payouts.mine"),

  shopTwin: (storeId: string) => call<ShopTwin>("twin.shop", { storeId }),
  myTwin: () => call<CustomerTwin>("twin.me"),
  simulate: (body: { storeId: string; productId: string; restockQty?: number; priceChangePercent?: number }) =>
    call<Simulation>("twin.simulate", body),

  aiStatus: () => call<AiStatus>("ai.status"),
  aiChat: (body: AiChatRequest, onProgress?: (progress: AiProgress) => void) =>
    realtime.request<AiChatResponse>("ai.chat", body, {
      timeoutMs: AI_CHAT_TIMEOUT_MS,
      onProgress: onProgress as ((data: unknown) => void) | undefined,
    }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details.length ? `${error.message}: ${error.details.join(", ")}` : error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
