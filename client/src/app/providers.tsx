"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import { AuthProvider } from "./contexts/AuthContext";
import { WebSocketProvider } from "@/app/contexts/WebSocketContext";
import { WebSocketQrProvider } from "./contexts/WebSocketQrContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WebSocketProvider>
        <WebSocketQrProvider>
          <AuthProvider>{children}</AuthProvider>
        </WebSocketQrProvider>
      </WebSocketProvider>
    </ThemeProvider>
  );
}
