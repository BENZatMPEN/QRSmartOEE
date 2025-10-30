"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";
import { HOST_API } from "@/app/confix";

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
      console.log("🔌 [WebSocket] Disconnecting...");
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  const connect = useCallback(() => {
    if (socket && socket.connected) {
      console.warn(
        "[WebSocket] Attempted to connect when already connected. Aborting."
      );
      return;
    }

    const token = localStorage.getItem("accessToken");
    console.groupCollapsed("🛰️ [WebSocketOEE] Preparing to connect..."); // Renamed Log
    console.log("📍 Current socket:", socket);
    console.log("🔑 Token:", token ? "[Found]" : "[Missing]");
    console.groupEnd();

    if (!token) {
      console.error("❌ [WebSocket] No token found. Connection aborted.");
      return;
    }

    const isProd = process.env.NODE_ENV === "production";
    console.log(
      `🌐 [WebSocket] Environment: ${isProd ? "Production" : "Development"}`
    );
    const socketOptions: Partial<SocketOptions & ManagerOptions> = {
      transportOptions: {
        polling: {
          extraHeaders: { Authorization: token },
        },
      },
      // transports: ["websocket", "polling"],
      // timeout: 5000,
      // reconnection: true,
      // reconnectionDelay: 1000,
      // reconnectionAttempts: 5,
    };

    let newSocket;

    // 🎯 2. แยกตาม environment
    if (isProd) {
      // ---------------------------------------------------
      // 🏭 PRODUCTION MODE
      // ใช้ path `/ws-oee/socket.io` ที่ Nginx proxy ไว้
      // (ไม่ระบุ host → ใช้ origin เดียวกับหน้าเว็บ)
      // ---------------------------------------------------
      const socketPath = "/ws-oee/socket.io";
      console.log(`🌍 [Socket] PROD mode → path: ${socketPath}`);
      newSocket = io({
        ...socketOptions,
        path: socketPath,
      });
    } else {
      // ---------------------------------------------------
      // 🧑‍💻 DEVELOPMENT MODE
      // เชื่อมตรงไปที่ backend จริง (port 3010)
      // ---------------------------------------------------
      console.log(`🌍 [Socket] DEV mode → host: ${HOST_API}`);
      newSocket = io(HOST_API, socketOptions);
    }

    // --- 3. Log สถานะการเชื่อมต่อหลัก ---
    newSocket.on("connect", () => {
      // console.log(`✅ [WebSocket] Connected successfully! Socket ID: ${newSocket.id}`);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn(`🔌 [WebSocket] Disconnected. Reason: ${reason}`);
      setSocket(null);
    });

    newSocket.on("connect_error", (error) => {
      // นี่คือ Log ที่สำคัญที่สุดสำหรับปัญหาการเชื่อมต่อ
      console.error("❌ [WebSocket] Connection Error:", error.message, error);
    });

    // --- 4. Log จากตัวจัดการการเชื่อมต่อ (Manager) เพื่อดีบักระดับล่าง ---
    const manager = newSocket.io;

    manager.on("reconnect_attempt", (attempt) => {
      console.warn(`[Manager] Reconnect attempt #${attempt}...`);
    });

    manager.on("reconnect", (attempt) => {
      console.log(`[Manager] Reconnected successfully on attempt #${attempt}!`);
    });

    manager.on("reconnect_error", (error) => {
      console.error("[Manager] Reconnection failed:", error.message);
    });
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
