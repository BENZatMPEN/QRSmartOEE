"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { api_oee } from "../../../lib/axios";
import useWebSocket from "../../../contexts/WebSocketContext";
import useWebSocketQr from "../../../contexts/WebSocketQrContext";
import { useAuth } from "../../../contexts/AuthContext";

// --- Interfaces ---
type OEEStatus = "running" | "ended" | "no plan" | "breakdown" | "unknown";
interface OEEDetailData {
  id: string;
  name: string;
  sku: string;
  pd: string;
  plannedQuantity: string;
  status: OEEStatus;
}
interface LastQrScanData {
  oeeId: number;
  status: "FOUND" | "NOT_FOUND" | "ERROR";
  scannedText: string;
  type?: "SKU" | "PD" | "START" | "STOP";
  productInfo?: {
    productId: string;
    productName: string;
  };
  timestamp: string;
}
const capitalize = (s: string) => {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// --- Main Component ---
export default function OEEDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { socket } = useWebSocket();
  const { socketQr } = useWebSocketQr();
  const { user } = useAuth();
  const [oeeData, setOeeData] = useState<OEEDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  // (ลบ lastQrScan state)
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  const [lastScannedProductId, setLastScannedProductId] = useState<
    number | null
  >(null);
  const oeeId = params.id as string;

  // --- Helper: Function to show Alert Modal ---
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setIsAlertModalOpen(true);
  };

  const formatBatchData = useCallback(
    (data: any): OEEDetailData => {
      const status = data.status?.toLowerCase() || "no plan";

      return {
        id: data.id.toString(),
        name: data.productionName || `OEE ${oeeId} Production`,
        status: status,
        sku: status === "ended" ? "" : data.product?.sku || "N/A",
        pd: status === "ended" ? "" : data.lotNumber || "N/A",
        plannedQuantity:
          status === "ended" ? "0" : data.plannedQuantity?.toString() || "0",
      };
    },
    [oeeId]
  );

  const fetchOeeDetail = useCallback(async () => {
    if (!oeeId) return;
    setLoading(true);
    try {
      const response = await api_oee.get(`/oees/${oeeId}/latest-batch`, {
        params: { siteId: 1 },
      });

      if (response.data && response.data.id) {
        setCurrentBatchId(response.data.id);
        setLastScannedProductId(response.data.product?.id || null);
        setOeeData(formatBatchData(response.data));
      } else {
        throw new Error("No batch data found");
      }
    } catch (error) {
      console.error("Error fetching OEE detail:", error);
      setCurrentBatchId(null);
      setOeeData({
        id: oeeId,
        name: `OEE ${oeeId} Production`,
        sku: "N/A",
        pd: "N/A",
        plannedQuantity: "0",
        status: "no plan",
      });
    } finally {
      setLoading(false);
    }
  }, [oeeId, formatBatchData]);

  useEffect(() => {
    fetchOeeDetail();
  }, [fetchOeeDetail]);

  useEffect(() => {
    if (!socket || !socket.connected) {
      return;
    }
    const siteId = 1;
    const eventName = `dashboard_${siteId}_${user?.id}`;
    const handleDashboardUpdate = (stats: any) => {
      if (stats && Array.isArray(stats.oees)) {
        const currentOeeDataFromSocket = stats.oees.find(
          (oee: any) => oee.id.toString() === oeeId
        );
        if (currentOeeDataFromSocket) {
          const newStatus =
            currentOeeDataFromSocket.batchStatus?.toLowerCase() || "no plan";
          setOeeData((prevData) => {
            if (!prevData) return null;
            return { ...prevData, status: newStatus };
          });
        }
      }
    };
    socket.on(eventName, handleDashboardUpdate);
    return () => {
      socket.off(eventName, handleDashboardUpdate);
    };
  }, [socket, oeeId, user?.id]);

  // ✨ --- [REFACTORED] WebSocket: QR Updates Logic ---
  const handleQrUpdate = useCallback(
    (data: LastQrScanData) => {
      console.log(`[WebSocketQr] 📦 Received QR update:`, data);

      // (ลบ setLastQrScan(data))

      // [GATEKEEPER]
      console.log(`data.oeeid: ${data.oeeId} | oeeId: ${oeeId}`);
      if (data.oeeId !== Number(oeeId)) {
        console.log(
          `[WebSocketQr] Ignoring event for oeeId ${data.oeeId} (this page is ${oeeId})`
        );
        return;
      }

      let displayText = data.scannedText;
      if (data.type === "START" && displayText.startsWith("start_"))
        displayText = displayText.substring(6);
      if (data.type === "STOP" && displayText.startsWith("stop_"))
        displayText = displayText.substring(5);

      setOeeData((currentOeeData) => {
        if (!currentOeeData) return null;

        const currentStatus = currentOeeData.status;
        const isEnded =
          currentStatus === "ended" || currentStatus === "no plan";

        // ===================================
        // CASE 1: Machine is ENDED / NO PLAN
        // ===================================
        if (isEnded) {
          if (data.status === "FOUND") {
            switch (data.type) {
              case "START":
                console.log("Attempting to start batch...");
                if (!lastScannedProductId) {
                  showAlert("Please scan a valid product SKU before starting.");
                  return currentOeeData;
                }
                if (!currentOeeData.pd) {
                  showAlert("Lot Number (PD) is required before starting.");
                  return currentOeeData;
                }
                const plannedQty = parseInt(currentOeeData.plannedQuantity, 10);
                if (isNaN(plannedQty) || plannedQty <= 0) {
                  showAlert(
                    "Planned Quantity must be a number greater than 0."
                  );
                  return currentOeeData;
                }

                const startDate = new Date();
                const endDate = new Date(
                  startDate.getTime() + 24 * 60 * 60 * 1000
                );
                const payload = {
                  plannedQuantity: plannedQty,
                  productId: lastScannedProductId,
                  oeeId: parseInt(oeeId),
                  planningId: -1,
                  lotNumber: currentOeeData.pd,
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                  startType: "MANUAL",
                  endType: "MANUAL",
                  operatorId: 0,
                };

                api_oee
                  .post(`/oee-batches?siteId=1&oeeId=${oeeId}`, payload)
                  .then((createResponse) => {
                    const newBatchId = createResponse.data.id;
                    if (!newBatchId)
                      throw new Error("API did not return a new batch ID.");
                    return api_oee.put(
                      `/oee-batches/${newBatchId}/start?siteId=1&oeeId=${oeeId}`
                    );
                  })
                  .then(() => {
                    // showAlert("✅ Batch started successfully!"); // ✨ NOTI
                    fetchOeeDetail();
                  })
                  .catch((error) => {
                    console.error(
                      "❌ Failed during start batch process:",
                      error
                    );
                    showAlert(
                      error.response?.data?.message || "Failed to start batch."
                    );
                  });

                return { ...currentOeeData, status: "unknown" };

              case "STOP":
                showAlert(`Cannot stop batch. Please start a new batch first.`);
                break;
              case "SKU":
                // setLastScannedProductId(parseInt(data.productInfo!.productId!));
                // showAlert(`SKU Found: ${data.productInfo!.productName}`); // ✨ NOTI
                return {
                  ...currentOeeData,
                  sku: data.productInfo!.productName,
                };
              case "PD":
                // showAlert(`Lot Number Found: ${data.scannedText}`); // ✨ NOTI
                return { ...currentOeeData, pd: data.scannedText };
            }
          } else if (data.status === "NOT_FOUND") {
            switch (data.type) {
              case "SKU":
                showAlert(`SKU "${displayText}" not found in the system.`);
                break;
              case "STOP":
                showAlert(`Invalid STOP format: "${displayText}".`);
                break;
              case "START":
                showAlert(`Invalid START format: "${displayText}".`);
                break;
              case "PD":
                showAlert(`Invalid PD format: "${displayText}".`);
                break;
            }
          }
        }

        // ===================================
        // CASE 2: Machine is RUNNING / BREAKDOWN
        // ===================================
        else {
          if (data.status === "FOUND") {
            switch (data.type) {
              case "STOP":
                console.log("Attempting to stop batch...");
                if (!currentBatchId) {
                  showAlert("Error: Cannot stop. Batch ID is missing.");
                  return currentOeeData;
                }
                api_oee
                  .put(
                    `/oee-batches/${currentBatchId}/end?siteId=1&oeeId=${oeeId}`
                  )
                  .then(() => {
                    // showAlert("✅ Batch stopped successfully!"); // ✨ NOTI
                    fetchOeeDetail();
                  })
                  .catch((error) => {
                    console.error("❌ Failed to end batch:", error);
                    showAlert('Failed to send "end batch" command.');
                  });
                break;
              case "START":
                showAlert(`Cannot start. Batch is already ${currentStatus}.`);
                break;
              case "SKU":
                showAlert(
                  `Cannot scan new SKU. Batch is ${currentStatus}. Please stop first.`
                );
                break;
              case "PD":
                showAlert(
                  `Cannot scan new Lot Number. Batch is ${currentStatus}. Please stop first.`
                );
                break;
            }
          } else if (data.status === "NOT_FOUND") {
            console.log("NOT FOUND");
            switch (data.type) {
              case "SKU":
                showAlert(`SKU "${displayText}" not found in the system.`);
                break;
              case "STOP":
                showAlert(`Invalid STOP format: "${displayText}".`);
                break;
              case "START":
                showAlert(`Invalid START format: "${displayText}".`);
                break;
              case "PD":
                showAlert(`Invalid PD format: "${displayText}".`);
                break;
            }
          }
        }

        return currentOeeData;
      });
    },
    [oeeId, fetchOeeDetail, currentBatchId, lastScannedProductId]
  );

  // --- WebSocket: QR (Subscribe) ---
  useEffect(() => {
    if (!socketQr || !socketQr.connected || !oeeId) {
      return;
    }
    const roomName = `site_1`;
    socketQr.emit("join_room", roomName);
    console.log(`[WebSocketQr] Emitting 'join_room' to join: '${roomName}'`);

    const eventName = `qr_update_${oeeId}`;
    socketQr.on(eventName, handleQrUpdate);
    console.log(`[WebSocketQr] Subscribing to: '${eventName}'`);

    return () => {
      console.log(`[WebSocketQr] Unsubscribing from: '${eventName}'`);
      socketQr.off(eventName, handleQrUpdate);
    };
  }, [socketQr, oeeId, handleQrUpdate]);

  // --- Handlers (Getters) ---
  const handleInputChange =
    (field: keyof OEEDetailData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setOeeData((prev) => (prev ? { ...prev, [field]: value } : null));
    };
  const getChipColor = (
    status: OEEStatus
  ): "success" | "error" | "warning" | "default" => {
    switch (status) {
      case "running":
        return "success";
      case "breakdown":
        return "error";
      case "ended":
      case "no plan":
        return "warning";
      default:
        return "default";
    }
  };
  const getStatusBackgroundColor = (status: OEEStatus): string => {
    switch (status) {
      case "running":
        return "success.main";
      case "breakdown":
        return "error.main";
      case "ended":
      case "no plan":
        return "warning.main";
      default:
        return "primary.main";
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />{" "}
        <Typography sx={{ ml: 2 }}>Loading Details...</Typography>
      </Box>
    );
  }
  if (!oeeData) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Alert severity="error">OEE data not found for ID: {oeeId}</Alert>
      </Box>
    );
  }

  const isFormEditable =
    oeeData.status === "ended" || oeeData.status === "no plan";

  const plannedQuantityValue = Number(oeeData.plannedQuantity);
  const formattedPlannedQuantity = isNaN(plannedQuantityValue)
    ? oeeData.plannedQuantity
    : plannedQuantityValue.toLocaleString("en-US");

  return (
    <Box className="min-h-screen bg-slate-100">
      <AppBar
        position="static"
        elevation={1}
        sx={{ bgcolor: "white", color: "text.primary" }}
      >
        <Toolbar sx={{ px: 3 }}>
          <IconButton
            onClick={() => router.back()}
            color="inherit"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600 }}
          >
            OEE Detail
          </Typography>
        </Toolbar>
      </AppBar>

      {/* ✨ [แก้ไข] เปลี่ยน Layout เป็น flex และจัดให้อยู่ตรงกลาง */}
      <main className="p-4 md:p-6 flex justify-center">
        {/* --- Main OEE Detail Card --- */}
        <Paper
          elevation={3}
          // ✨ [แก้ไข] กำหนดความกว้างสูงสุด
          className="rounded-lg overflow-hidden w-full max-w-lg"
        >
          <Box
            sx={{
              bgcolor: getStatusBackgroundColor(oeeData.status),
              color: "white",
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {oeeData.name}
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" className="flex flex-col gap-4">
              <TextField
                label="SKU"
                fullWidth
                value={oeeData.sku}
                variant="outlined"
                onChange={handleInputChange("sku")}
                InputProps={{ readOnly: !isFormEditable }}
                sx={{
                  "& .MuiInputBase-input[readOnly]": {
                    backgroundColor: "#f0f0f0",
                  },
                }}
              />
              <TextField
                label="Lot Number (PD)"
                fullWidth
                value={oeeData.pd}
                variant="outlined"
                onChange={handleInputChange("pd")}
                InputProps={{ readOnly: !isFormEditable }}
                sx={{
                  "& .MSuiInputBase-input[readOnly]": {
                    backgroundColor: "#f0f0f0",
                  },
                }}
              />
              <TextField
                label="Planned Quantity"
                fullWidth
                variant="outlined"
                onChange={handleInputChange("plannedQuantity")}
                InputProps={{ readOnly: !isFormEditable }}
                value={
                  isFormEditable
                    ? oeeData.plannedQuantity
                    : formattedPlannedQuantity
                }
                sx={{
                  "& .MuiInputBase-input[readOnly]": {
                    backgroundColor: "#f0f0f0",
                  },
                }}
              />
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1, fontWeight: 600 }}
                >
                  Current Status
                </Typography>
                <Chip
                  label={
                    oeeData.status === "unknown"
                      ? "Starting"
                      : capitalize(oeeData.status)
                  }
                  color={getChipColor(oeeData.status)}
                  sx={{
                    minWidth: 120,
                    height: 40,
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Paper>

        {/* ✨ [ลบ] "Last QR Scan Card" JSX ทั้งหมดถูกลบออกจากส่วนนี้ */}
      </main>

      {/* --- Alert Modal --- */}
      <Dialog
        open={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ErrorIcon color="error" />
          Scan Notification
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{alertMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsAlertModalOpen(false)}
            color="primary"
            autoFocus
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
