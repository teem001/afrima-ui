import { ApiError, realtime } from "@/lib/ws";
import type {
  AiChatRequest,
  AiChatResponse,
  AiProgress,
  AiStatus,
  AuthResponse,
  InventoryItem,
  LoginRequest,
  Order,
  PlaceOrderRequest,
  Product,
  RegisterRequest,
  SearchResponse,
  Store,
  UpsertInventoryRequest,
  User,
} from "@/lib/types";

export { ApiError };

/** A model turn can take a minute and the agent may run several tools, so chats get a long deadline. */
const AI_CHAT_TIMEOUT_MS = 180_000;

const call = <T>(type: string, payload?: unknown) => realtime.request<T>(type, payload);

export const api = {
  login: (body: LoginRequest) => call<AuthResponse>("auth.login", body),
  register: (body: RegisterRequest) => call<AuthResponse>("auth.register", body),
  logout: () => call<null>("auth.logout"),
  me: () => call<User>("me"),

  search: (params: { q: string; lat: number; lng: number; radiusMeters?: number }) => call<SearchResponse>("search", params),

  products: () => call<Product[]>("catalog.products"),
  stores: () => call<Store[]>("stores.list"),
  myStores: () => call<Store[]>("stores.mine"),
  inventory: (storeId: string) => call<InventoryItem[]>("inventory.list", { storeId }),
  upsertInventory: (storeId: string, body: UpsertInventoryRequest) =>
    call<InventoryItem>("inventory.upsert", { storeId, ...body }),

  placeOrder: (body: PlaceOrderRequest) => call<Order>("orders.place", body),
  myOrders: () => call<Order[]>("orders.mine"),
  order: (orderId: string) => call<Order>("orders.get", { orderId }),
  merchantOrders: () => call<Order[]>("orders.merchant"),
  acceptOrder: (orderId: string) => call<Order>("orders.accept", { orderId }),

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
