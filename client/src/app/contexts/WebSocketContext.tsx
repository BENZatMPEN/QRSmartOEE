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
    if (!token) {
      console.error("❌ [WebSocket] No token found. Connection aborted.");
      return;
    }

    // // --- 1. Log ข้อมูลทั้งหมดก่อนเริ่มการเชื่อมต่อ ---
    // console.groupCollapsed('🔍 [WebSocket] Preparing to connect...');
    // console.log('🔑 Token:', token);
    // console.log('🌐 Host API:', HOST_API);
    const socketOptions: Partial<SocketOptions & ManagerOptions> = {
      transportOptions: {
        polling: {
          extraHeaders: { Authorization: token },
        },
      },
      // เพิ่ม timeout เพื่อให้เห็น error ชัดขึ้นถ้า server ไม่ตอบสนอง
      timeout: 5000,
    };
    // console.log('⚙️ Options:', JSON.stringify(socketOptions, null, 2));
    console.groupEnd();

    const newSocket = io("/socket.io", socketOptions);

    // // --- 2. Log ทุก Event ที่ได้รับจาก Server (ดีบักชื่อ Event) ---
    // newSocket.onAny((eventName, ...args) => {
    //     console.log(`[EVENT] Received '${eventName}' with data:`, args);
    // });

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

    manager.on("error", (error) => {
      console.error("[Manager] Error:", error.message);
    });

    manager.on("ping", () => {
      console.log("[Manager] Ping sent to server...");
    });

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
