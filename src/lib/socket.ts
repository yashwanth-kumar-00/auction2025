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

export function connectSocket(url = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000") {
  if (socket) return socket;
  console.log("[SOCKET] attempting to connect to", url);
  socket = io(url, { transports: ["websocket"], autoConnect: true });

  socket.on("connect", () => console.log("[SOCKET] connected", socket?.id));
  socket.on("connect_error", (err) => console.error("[SOCKET] connect_error", err));
  socket.on("disconnect", (r) => console.log("[SOCKET] disconnected", r));

  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not connected. Call connectSocket() first.");
  return socket;
}
