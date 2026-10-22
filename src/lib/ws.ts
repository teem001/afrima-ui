import { create } from "zustand";
import { useAuth } from "@/store/auth";
import type { ErrorResponse } from "@/lib/types";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: string[];

  constructor(status: number, body: Partial<ErrorResponse> | null) {
    super(body?.message ?? `Request failed (${status})`);
    this.code = body?.code ?? "UNKNOWN";
    this.status = status;
    this.details = body?.details ?? [];
  }
}

export type ConnectionStatus = "connecting" | "open" | "reconnecting";

export const useConnection = create<{ status: ConnectionStatus; connectedOnce: boolean }>(() => ({
  status: "connecting",
  connectedOnce: false,
}));

type Listener = (data: unknown) => void;

interface Pending {
  type: string;
  frame: string;
  sent: boolean;
  resolve: (data: unknown) => void;
  reject: (error: ApiError) => void;
  timer: ReturnType<typeof setTimeout>;
  onProgress?: (data: unknown) => void;
}

interface RequestOptions {
  timeoutMs?: number;
  onProgress?: (data: unknown) => void;
}

type ServerMessage =
  | { type: "response"; id: string | null; ok: true; data?: unknown }
  | { type: "response"; id: string | null; ok: false; error: ErrorResponse }
  | { type: "event"; event: string; data: unknown };

const PING_INTERVAL_MS = 25_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_BACKOFF_MS = 10_000;

function socketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL?.trim();
  if (configured) return configured;
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/ws`;
}

const connectionLost = () =>
  new ApiError(0, { code: "NETWORK", message: "Lost connection to AfriSmart. Reconnecting…" });

/**
 * One socket for the whole app. Requests made while disconnected wait in a queue; on every (re)connect the saved
 * token is presented first so queued requests run as the signed-in user.
 */
class RealtimeClient {
  private socket: WebSocket | null = null;
  private ready = false;
  /** Ids of requests waiting for the socket; their frames live on the pending entry. */
  private queue: string[] = [];
  private pending = new Map<string, Pending>();
  private listeners = new Map<string, Set<Listener>>();
  private backoffMs = 500;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private sequence = 0;

  constructor() {
    window.addEventListener("online", () => this.reconnectNow());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.reconnectNow();
    });
    this.connect();
  }

  request<T>(type: string, payload?: unknown, options: RequestOptions = {}): Promise<T> {
    const id = `${Date.now().toString(36)}-${(this.sequence++).toString(36)}`;
    const frame = JSON.stringify(payload === undefined ? { id, type } : { id, type, payload });
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ApiError(0, { code: "TIMEOUT", message: "AfriSmart took too long to answer. Try again." }));
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      this.pending.set(id, {
        type,
        frame,
        sent: false,
        resolve: resolve as (data: unknown) => void,
        reject,
        timer,
        onProgress: options.onProgress,
      });
      if (this.ready && this.socket?.readyState === WebSocket.OPEN) {
        this.send(this.socket, id);
      } else {
        this.queue.push(id);
      }
    });
  }

  private send(socket: WebSocket, id: string) {
    const entry = this.pending.get(id);
    if (!entry) return;
    entry.sent = true;
    socket.send(entry.frame);
  }

  on(event: string, listener: Listener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  private connect() {
    this.ready = false;
    useConnection.setState((s) => ({ status: s.connectedOnce ? "reconnecting" : "connecting" }));
    const socket = new WebSocket(socketUrl());
    this.socket = socket;

    socket.onopen = () => {
      this.backoffMs = 500;
      void this.handshake(socket);
    };
    socket.onmessage = (message) => this.receive(message.data);
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.ready = false;
      this.stopPing();
      this.failInFlight();
      this.scheduleReconnect();
    };
  }

  private async handshake(socket: WebSocket) {
    const token = useAuth.getState().token;
    if (token) {
      const id = `resume-${this.sequence++}`;
      const frame = JSON.stringify({ id, type: "auth.resume", payload: { token } });
      const resumed = new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, DEFAULT_TIMEOUT_MS);
        this.pending.set(id, {
          type: "auth.resume",
          frame,
          sent: true,
          resolve: () => resolve(),
          reject: (error) => {
            if (error.status === 401) useAuth.getState().logout();
            resolve();
          },
          timer,
        });
      });
      socket.send(frame);
      await resumed;
    }
    if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) return;
    this.ready = true;
    const queued = this.queue;
    this.queue = [];
    queued.forEach((id) => this.send(socket, id));
    this.startPing();
    useConnection.setState({ status: "open", connectedOnce: true });
    this.emit("connection.open", null);
  }

  private receive(raw: unknown) {
    let message: ServerMessage;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (message.type === "event") {
      const requestId = (message.data as { requestId?: string } | null)?.requestId;
      if (requestId) this.pending.get(requestId)?.onProgress?.(message.data);
      this.emit(message.event, message.data);
      return;
    }
    if (!message.id) return;
    const entry = this.pending.get(message.id);
    if (!entry) return;
    this.pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.ok) {
      entry.resolve(message.data ?? null);
      return;
    }
    const error = new ApiError(message.error.status, message.error);
    const authFlow = entry.type.startsWith("auth.");
    if (error.status === 401 && !authFlow && useAuth.getState().token) {
      useAuth.getState().logout();
    }
    entry.reject(error);
  }

  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  /** Requests already on the wire can't be answered by a new socket, so callers retry instead of hanging. */
  private failInFlight() {
    for (const [id, entry] of this.pending) {
      if (!entry.sent) continue;
      clearTimeout(entry.timer);
      entry.reject(connectionLost());
      this.pending.delete(id);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    useConnection.setState((s) => ({ status: s.connectedOnce ? "reconnecting" : "connecting" }));
    const delay = this.backoffMs + Math.random() * 250;
    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private reconnectNow() {
    if (this.socket || !this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.backoffMs = 500;
    this.connect();
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.request("ping", undefined, { timeoutMs: 10_000 }).catch(() => this.socket?.close());
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}

export const realtime = new RealtimeClient();
