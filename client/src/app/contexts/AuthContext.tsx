"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api_oee } from "../lib/axios";
import useWebSocket from "./WebSocketContext";
import useWebSocketQr from "./WebSocketQrContext";

interface User {
  id: number | string;
  email: string;
  loginTime: string;
  username?: string;
  name?: string;
  token?: string;
  refreshToken?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_FLAG_KEY = "isAuthenticated";
const AUTH_USER_KEY = "user";
const AUTH_TOKEN_KEY = "accessToken";
const AUTH_REFRESH_TOKEN_KEY = "refreshToken";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 2. Get the connect and disconnect functions
  const { connect: connectSocket, disconnect: disconnectSocket } =
    useWebSocket();

  const { connectQr: connectSocketQr, disconnectQr: disconnectSocketQr } =
    useWebSocketQr();

  const clearAuthStorage = () => {
    localStorage.removeItem(AUTH_FLAG_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  };

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authStatus = localStorage.getItem(AUTH_FLAG_KEY);
        const userData = localStorage.getItem(AUTH_USER_KEY);
        const token = localStorage.getItem(AUTH_TOKEN_KEY);

        if (authStatus === "true" && userData && token) {
          const parsedUser = JSON.parse(userData) as User;

          if (
            parsedUser &&
            typeof parsedUser === "object" &&
            typeof parsedUser.email === "string" &&
            parsedUser.email.trim() !== ""
          ) {
            setIsAuthenticated(true);
            setUser(parsedUser);

            // 3. Connect BOTH sockets
            console.log("[Auth] Valid session found, connecting WebSocket...");
            connectSocket();
            connectSocketQr(); // ✅ This is correct
            return;
          }
        }

        // If checks fail, clear everything
        clearAuthStorage();
        setIsAuthenticated(false);
        setUser(null);
      } catch (error) {
        console.error("Error checking authentication:", error);
        clearAuthStorage();
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [connectSocket, connectSocketQr]); // ✅ Added dependencies for safety

  // AuthContext.tsx

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const loginResponse = await api_oee.post("/auth/login?siteId=1", {
        email,
        password,
      });

      if (loginResponse.status >= 200 && loginResponse.status < 300) {
        const loginData = loginResponse.data ?? {};
        const tokenCandidate = loginData?.accessToken;

        if (tokenCandidate && typeof tokenCandidate === "string") {
          localStorage.setItem(AUTH_TOKEN_KEY, tokenCandidate);

          let userProfile = {};
          try {
            const profileResponse = await api_oee.get(
              "/auth/user-profile?siteId=1"
            );
            if (profileResponse.data) {
              userProfile = profileResponse.data;
            }
          } catch (profileError) {
            console.error(
              "Failed to fetch user profile after login:",
              profileError
            );
          }

          const userPayload =
            typeof loginData?.user === "object" && loginData?.user !== null
              ? loginData.user
              : loginData;

          const userData: User = {
            id: -1,
            email: userPayload?.email ?? email ?? userPayload?.username ?? "",
            loginTime: new Date().toISOString(),
            ...userPayload,
            ...userProfile,
          };

          localStorage.setItem(AUTH_FLAG_KEY, "true");
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));

          setIsAuthenticated(true);
          setUser(userData);

          // --- ✅ FIXED BUG 1 ---
          // Connect BOTH sockets on login
          connectSocket();
          connectSocketQr();
          // ---------------------

          return true;
        }
        // ... (rest of the function)
      }
    } catch (error) {
      console.error("Login failed:", error);
      clearAuthStorage();
      setIsAuthenticated(false);
      setUser(null);
    }
    return false;
  };

  const logout = () => {
    // --- ✅ FIXED BUG 2 ---
    // Disconnect BOTH sockets
    console.log("[Auth] Logging out, disconnecting WebSocket...");
    disconnectSocket();
    disconnectSocketQr();
    // ---------------------

    clearAuthStorage();
    setIsAuthenticated(false);
    setUser(null);
    router.push("/login");
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
  };

  if (loading) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ... rest of the file (useAuth, ProtectedRoute) remains the same
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
