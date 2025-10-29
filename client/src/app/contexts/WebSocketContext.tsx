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
      console.log("🔌 [WebSocketQR] Disconnecting...");
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  const connect = useCallback(() => {
    if (socket && socket.connected) {
      console.warn(
        "[WebSocketQR] Attempted to connect when already connected. Aborting."
      );
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.error("❌ [WebSocketQR] No token found. Connection aborted.");
      return;
    }

    const socketOptions: Partial<SocketOptions & ManagerOptions> = {
      transportOptions: {
        polling: {
          extraHeaders: { Authorization: token },
        },
      },
      timeout: 5000,
    };
    const socketPath = "/ws-qr/socket.io";
    console.log(`🛰️ [WebSocketQR] Connecting via path: ${socketPath}`);

    // ⛔️ ลบการเชื่อมต่อแบบเก่า
    // const newSocket = io(`${HOST_API}`, socketOptions);

    // ✨ ใช้การเชื่อมต่อแบบใหม่
    const newSocket = io({
      ...socketOptions,
      path: socketPath,
    });

    // --- (ส่วนที่เหลือของ Log เหมือนเดิม) ---

    newSocket.on("connect", () => {
      console.log(
        `✅ [WebSocketQR] Connected successfully! Socket ID: ${newSocket.id}`
      );
      setSocket(newSocket);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn(`🔌 [WebSocketQR] Disconnected. Reason: ${reason}`);
      setSocket(null);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ [WebSocketQR] Connection Error:", error.message, error);
    });

    const manager = newSocket.io;
    manager.on("error", (error) => {
      console.error("[ManagerQR] Error:", error.message);
    });
    // ... (Log อื่นๆ ของ Manager) ...
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
