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

export type WebSocketContextProps = {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
};

const initialState: WebSocketContextProps = {
  socket: null,
  connect: () => {},
  disconnect: () => {},
};

const WebSocketContext = createContext(initialState);

type SocketProviderProps = {
  children: ReactNode;
};

function WebSocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);

  const disconnect = useCallback(() => {
    if (socket) {
      console.groupCollapsed("🔌 [WebSocketOEE] Disconnecting..."); // Renamed Log
      console.log("Socket ID:", socket.id);
      console.log("Connected:", socket.connected);
      console.groupEnd();
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  const connect = useCallback(() => {
    if (socket && socket.connected) {
      console.warn(
        "⚠️ [WebSocketOEE] Already connected. Aborting new connection." // Renamed Log
      );
      return;
    }

    const token = localStorage.getItem("accessToken");
    console.groupCollapsed("🛰️ [WebSocketOEE] Preparing to connect..."); // Renamed Log
    console.log("📍 Current socket:", socket);
    console.log("🔑 Token:", token ? "[Found]" : "[Missing]");
    console.groupEnd();

    if (!token) {
      console.error("❌ [WebSocketOEE] No token found. Connection aborted."); // Renamed Log
      return;
    }

    const socketOptions: Partial<SocketOptions & ManagerOptions> = {
      transportOptions: {
        polling: {
          extraHeaders: { Authorization: token },
        },
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
    };

    // --- ✅ นี่คือจุดที่แก้ไข ---
    // เปลี่ยน path ให้ตรงกับ Rule 1 ของ Nginx (สำหรับ 3010)
    const socketPath = "/ws-oee/socket.io";
    // -------------------------

    console.groupCollapsed("⚙️ [WebSocketOEE] Socket Configuration"); // Renamed Log
    console.log("🌍 Path:", socketPath);
    console.log("⚙️ Options:", socketOptions);
    console.groupEnd();

    // ✅ สร้าง Socket ใหม่
    const newSocket = io({
      ...socketOptions,
      path: socketPath,
    });

    // --- Log Event หลัก ---
    newSocket.on("connect", () => {
      console.groupCollapsed("✅ [WebSocketOEE] CONNECTED!"); // Renamed Log
      console.log("🆔 Socket ID:", newSocket.id);
      console.log("📶 Connected:", newSocket.connected);
      console.groupEnd();
      setSocket(newSocket);
    });

    newSocket.on("disconnect", (reason) => {
      console.groupCollapsed("🔌 [WebSocketOEE] DISCONNECTED"); // Renamed Log
      console.log("❗ Reason:", reason);
      console.groupEnd();
      setSocket(null);
    });

    newSocket.on("connect_error", (error) => {
      console.groupCollapsed("❌ [WebSocketOEE] CONNECTION ERROR"); // Renamed Log
      console.error("Message:", error.message);
      console.error("Details:", error);
      console.groupEnd();
    });

    // ... (ส่วน Log อื่นๆ เหมือนเดิม, แต่ผมเพิ่ม OEE เข้าไปในชื่อ) ...
    const manager = newSocket.io;

    manager.on("reconnect_attempt", (attempt) => {
      console.warn(`🌀 [ManagerOEE] Reconnect attempt #${attempt}`);
    });
    // ...
    newSocket.onAny((event, ...args) => {
      console.debug(`📨 [WebSocketOEE] Event '${event}' received:`, ...args);
    });

    console.log("🚀 [WebSocketOEE] Connection attempt started..."); // Renamed Log
  }, [socket]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (socket) {
        console.log("💥 [WebSocketOEE] Component unmounted, disconnecting..."); // Renamed Log
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <WebSocketContext.Provider value={{ socket, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export { WebSocketProvider, WebSocketContext };
const useWebSocket = () => useContext(WebSocketContext);
export default useWebSocket;
