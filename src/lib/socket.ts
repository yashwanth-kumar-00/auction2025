// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

type ServerToClientEvents = {
  state: (payload: any) => void;
  bidAccepted: (payload: any) => void;
  bidRejected: (payload: any) => void;
  auctionClosed: (payload: any) => void;
  controlEvent: (payload: any) => void;
};
type ClientToServerEvents = {
  join: (p: { auctionId?: string; userId?: string; purse?: number }) => void;
  placeBid: (p: { auctionId?: string; bidderId?: string; amount: number }) => void;
  sell: (p: { auctionId?: string; userId?: string }) => void;
  unsold: (p: { auctionId?: string; userId?: string }) => void;
  toggleTimer: (p: { auctionId?: string; userId?: string; isTimerRunning?: boolean }) => void;
  nextPlayer: (p: { auctionId?: string; userId?: string }) => void;
};

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function defaultUrl() {
  // prefer env var; if not present, use current page origin (works for deployed same-origin)
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl !== "http://localhost:4000") return envUrl;
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  return "http://localhost:4000";
}

export function connectSocket(url?: string) {
  if (socket) return socket;
  const connectUrl = url || defaultUrl();
  console.log("[SOCKET] attempting to connect to", connectUrl);
  socket = io(connectUrl, { transports: ["websocket"], autoConnect: true });
  socket.on("connect", () => console.log("[SOCKET] connected", socket?.id));
  socket.on("connect_error", (err) => console.error("[SOCKET] connect_error", err));
  socket.on("disconnect", (r) => console.log("[SOCKET] disconnected", r));
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not connected. Call connectSocket() first.");
  return socket;
}
