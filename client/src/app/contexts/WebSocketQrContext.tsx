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
// ⛔️ เราไม่จำเป็นต้องใช้ HOST_API_QR สำหรับ Socket อีกต่อไป
// import { HOST_API_QR } from "../confix";

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

    const options: Partial<SocketOptions & ManagerOptions> = {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
      withCredentials: false,
      // ⛔️ ลบ path: "/socket.io" ออก เพราะเราจะกำหนด path ที่ถูกต้องด้านล่าง
    };

    // --- ✅ นี่คือส่วนที่แก้ไข ---
    // เราจะเชื่อมต่อโดยใช้ "path" ที่ Nginx จะดักจับ (ตาม Rule 3)
    // มันจะเชื่อมต่อไปยัง Host ปัจจุบัน (http://localhost:4000)
    // แต่ใช้ path ที่เรากำหนด
    const socketPath = "/ws-qr/socket.io";
    console.log(`🛰️ [WebSocketQR] Connecting via path: ${socketPath}`);
    console.groupEnd();

    // ⛔️ ลบการเชื่อมต่อแบบเก่า
    // const newSocket = io(HOST_API_QR, options);

    // ✨ ใช้การเชื่อมต่อแบบใหม่
    const newSocket = io({
      ...options, // เอา options อื่นๆ มา
      path: socketPath, // กำหนด path ที่ถูกต้อง
    });

    // --- (ส่วนที่เหลือของ Log เหมือนเดิม) ---

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
