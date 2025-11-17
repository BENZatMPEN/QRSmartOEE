"use client";

import React from "react";
import {
  Paper,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  NetworkWifi as WebsocketIcon,
  Usb as UsbIcon,
} from "@mui/icons-material";

type ScanSource = "TCP" | "USB";

interface ScanModeToggleProps {
  scanSource: string;
  onScanSourceChange: (
    event: React.MouseEvent<HTMLElement>,
    newSource: ScanSource | null
  ) => void;
}

export default function ScanModeToggle({
  scanSource,
  onScanSourceChange,
}: ScanModeToggleProps) {
  return (
    <Paper elevation={3} className="rounded-lg w-full">
      <CardContent
        sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, textAlign: "center" }}>
          QR Scan Mode
        </Typography>

        <ToggleButtonGroup
          value={scanSource}
          exclusive
          onChange={onScanSourceChange}
          aria-label="Scan Source"
          fullWidth
          color="primary"
        >
          <ToggleButton value="TCP" aria-label="TCP mode">
            <WebsocketIcon sx={{ mr: 1 }} />
            TCP/IP
          </ToggleButton>
          <ToggleButton value="USB" aria-label="usb mode">
            <UsbIcon sx={{ mr: 1 }} />
            USB Scanner
          </ToggleButton>
        </ToggleButtonGroup>

        {/* {oeeData.scanSource === 'USB' && (
            <TextField
                label="Scan QR (Press Enter)"
                variant="outlined"
                fullWidth
                value={usbScanInput}
                onChange={(e) => setUsbScanInput(e.target.value)}
                onKeyDown={handleUsbScan}
                autoFocus
                placeholder="Click here or scan anywhere..."
                sx={{ mt: 1 }}
            />
        )} */}
      </CardContent>
    </Paper>
  );
}
