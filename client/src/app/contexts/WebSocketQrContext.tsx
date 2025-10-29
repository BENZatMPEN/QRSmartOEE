"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";
import { HOST_API_QR } from "../confix";

export type WebSocketQrContextProps = {
  socketQr: Socket | null;
  connectQr: () => void;
  disconnectQr: () => void;
};

const initialState: WebSocketQrContextProps = {
  socketQr: null,
  connectQr: () => {},
  disconnectQr: () => {},
};

const WebSocketQrContext = createContext(initialState);

type Props = {
  children: ReactNode;
};

export function WebSocketQrProvider({ children }: Props) {
  const [socketQr, setSocketQr] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false); // Refined state

  const disconnectQr = useCallback(() => {
    if (socketQr) {
      console.log("🔌 [WebSocketQR] Disconnecting...");
      socketQr.disconnect();
      setSocketQr(null);
    }
  }, [socketQr]);

  const connectQr = useCallback(() => {
    if ((socketQr && socketQr.connected) || isConnecting) {
      console.warn(
        "⚠️ [WebSocketQR] Already connected or connection in progress."
      );
      return;
    }

    setIsConnecting(true);
    console.groupCollapsed("🛰️ [WebSocketQR] Connecting...");
    console.log("🌐 HOST_API_QR:", HOST_API_QR);
    console.groupEnd();

    const options: Partial<SocketOptions & ManagerOptions> = {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
      withCredentials: false,
      path: "/socket.io",
    };

    const newSocket = io(HOST_API_QR, options);

    newSocket.on("connect", () => {
      console.log(`✅ [WebSocketQR] Connected! Socket ID: ${newSocket.id}`);
      setIsConnecting(false);
      setSocketQr(newSocket);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn(`[WebSocketQR] 🔌 Disconnected. Reason: ${reason}`);
      setIsConnecting(false); // Also reset if disconnect happens during connection attempt
      setSocketQr(null);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ [WebSocketQR] Connection Error:", error.message);
      setIsConnecting(false);
    });

    newSocket.onAny((event, ...args) => {
      console.log(`📡 [WebSocketQR] Event received → ${event}:`, ...args);
    });
  }, [socketQr, isConnecting]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (socketQr) {
        console.log("💥 [WebSocketQR] Provider unmounted → disconnect");
        socketQr.disconnect();
      }
    };
  }, [socketQr]);

  return (
    <WebSocketQrContext.Provider value={{ socketQr, connectQr, disconnectQr }}>
      {children}
    </WebSocketQrContext.Provider>
  );
}

const useWebSocketQr = () => useContext(WebSocketQrContext);
export default useWebSocketQr;
