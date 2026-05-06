"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthProvider";
import { ServerToClientEvents, ClientToServerEvents } from "@damned/shared";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SocketContext = createContext<AppSocket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const socketRef = useRef<AppSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
    const socket = io(wsUrl, {
      auth: { token: accessToken ?? "" },
      transports: ["websocket"],
      autoConnect: true,
    }) as AppSocket;

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): AppSocket | null {
  return useContext(SocketContext);
}
