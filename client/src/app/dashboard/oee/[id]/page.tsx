"use client";

import { useState, useEffect, useCallback } from "react"; // 1. เพิ่ม useCallback
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
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { api_oee } from "../../../lib/axios";
import useWebSocket from "../../../contexts/WebSocketContext";
import useWebSocketQr from "../../../contexts/WebSocketQrContext";
import { useAuth } from "../../../contexts/AuthContext";

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

export default function OEEDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { socket } = useWebSocket();
  const { socketQr } = useWebSocketQr();
  const { user } = useAuth();
  const [oeeData, setOeeData] = useState<OEEDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastQrScan, setLastQrScan] = useState<LastQrScanData | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  const [lastScannedProductId, setLastScannedProductId] = useState<
    number | null
  >(null);
  const oeeId = params.id as string;

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
      } else {
        setCurrentBatchId(null);
      }

      setOeeData(formatBatchData(response.data));
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
  }, [socket, oeeId]);

  useEffect(() => {
    if (!socketQr || !socketQr.connected) {
      return;
    }

    const roomName = `site_1`;
    const adminRoomName = `site_admin`;
    socketQr.emit("join_room", roomName);
    socketQr.emit("join_room", adminRoomName);

    const handleQrUpdate = (data: LastQrScanData) => {
      console.log(`[WebSocketQr] 📦 Received QR update:`, data);
      setLastQrScan(data);

      if (
        data.type === "SKU" &&
        data.status === "FOUND" &&
        data.productInfo?.productId
      ) {
        setLastScannedProductId(parseInt(data.productInfo.productId));
      }

      if (data.type === "STOP" && data.status === "FOUND" && currentBatchId) {
        if (oeeData?.status === "ended" && data?.oeeId === Number(oeeId)) {
          setAlertMessage(
            `Cannot stop batch when OEE status is "${oeeData?.status}".`
          );
          setIsAlertModalOpen(true);
          return;
        }

        api_oee
          .put(`/oee-batches/${currentBatchId}/end?siteId=1&oeeId=${oeeId}`)
          .then((response) => {
            console.log("✅ Batch ended successfully:", response.data);
            fetchOeeDetail();
          })
          .catch((error) => {
            console.error("❌ Failed to end batch:", error);
            setAlertMessage(
              'Failed to send "end batch" command to the server.'
            );
            setIsAlertModalOpen(true);
          });
      }

      if (data.type === "START" && data.status === "FOUND") {
        if (oeeData?.status === "running" || oeeData?.status === "breakdown") {
          setAlertMessage(
            `Cannot start a new batch while status is "${oeeData.status}".`
          );
          setIsAlertModalOpen(true);
          return;
        }

        if (!lastScannedProductId) {
          setAlertMessage(
            "Please scan a valid product SKU before starting a new batch."
          );
          setIsAlertModalOpen(true);
          return;
        }
        if (!oeeData?.pd) {
          setAlertMessage(
            "Lot Number (PD) is required before starting a new batch."
          );
          setIsAlertModalOpen(true);
          return;
        }

        const plannedQty = parseInt(oeeData.plannedQuantity, 10);
        if (isNaN(plannedQty) || plannedQty <= 0) {
          setAlertMessage("Planned Quantity must be a number greater than 0.");
          setIsAlertModalOpen(true);
          return;
        }

        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const payload = {
          plannedQuantity: parseInt(oeeData.plannedQuantity) || 1000,
          productId: lastScannedProductId,
          oeeId: parseInt(oeeId),
          planningId: -1,
          lotNumber: oeeData.pd,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startType: "MANUAL",
          endType: "MANUAL",
          operatorId: 0,
        };

        console.log("Attempting to start a new batch with payload:", payload);

        api_oee
          .post(`/oee-batches?siteId=1&oeeId=${oeeId}`, payload)
          .then((createResponse) => {
            console.log(
              "✅ New batch created successfully:",
              createResponse.data
            );
            const newBatchId = createResponse.data.id;

            if (!newBatchId) {
              throw new Error(
                "API did not return a new batch ID after creation."
              );
            }

            console.log(
              `Attempting to start the new batch with ID: ${newBatchId}`
            );

            return api_oee.put(
              `/oee-batches/${newBatchId}/start?siteId=1&oeeId=${oeeId}`
            );
          })
          .then((startResponse) => {
            console.log("✅ Batch started successfully:", startResponse.data);

            fetchOeeDetail();
          })
          .catch((error) => {
            console.error("❌ Failed during start batch process:", error);
            const errorMessage =
              error.response?.data?.message ||
              "An error occurred during the start batch process.";
            setAlertMessage(errorMessage);
            setIsAlertModalOpen(true);
          });
      }

      setOeeData((currentOeeData) => {
        if (!currentOeeData) return null;

        if (data.status === "NOT_FOUND") {
          let shouldAlert = false;
          let message = "";
          let displayText = data.scannedText;

          if (data.type === "START" && displayText.startsWith("start_")) {
            displayText = displayText.substring(6);
          } else if (data.type === "STOP" && displayText.startsWith("stop_")) {
            displayText = displayText.substring(5);
          }

          switch (data.type) {
            case "SKU":
            case "START":
              if (currentOeeData.status === "ended") {
                shouldAlert = true;
                message = `Scanned ${data.type} "${displayText}" is invalid while batch has ended.`;
              }
              break;
            case "STOP":
              if (
                currentOeeData.status === "running" ||
                currentOeeData.status === "breakdown"
              ) {
                shouldAlert = true;
                message = `Stop QR "${displayText}" is invalid while batch is active.`;
              }
              break;
          }

          if (shouldAlert) {
            setAlertMessage(message);
            setIsAlertModalOpen(true);
          }
        }

        if (currentOeeData.status !== "ended") {
          return currentOeeData;
        }

        if (data.status === "FOUND") {
          if (data.type === "SKU" && data.productInfo) {
            return { ...currentOeeData, sku: data.productInfo.productName };
          }
          if (data.type === "PD") {
            return { ...currentOeeData, pd: data.scannedText };
          }
        }

        return currentOeeData;
      });
    };

    const oeeSpecificEventName = `qr_update_${oeeId}`;
    socketQr.on(oeeSpecificEventName, handleQrUpdate);
    const genericEventName = `qr_update_0`;
    socketQr.on(genericEventName, handleQrUpdate);

    return () => {
      socketQr.off(oeeSpecificEventName, handleQrUpdate);
      socketQr.off(genericEventName, handleQrUpdate);
    };
  }, [
    socketQr,
    oeeId,
    fetchOeeDetail,
    currentBatchId,
    oeeData,
    lastScannedProductId,
  ]);

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
  const handleInputChange =
    (field: keyof OEEDetailData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setOeeData((prev) => (prev ? { ...prev, [field]: value } : null));
    };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Loading OEE details...</Typography>
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
          minHeight: "80vh",
        }}
      >
        <Typography>OEE data not found for ID: {oeeId}</Typography>
      </Box>
    );
  }

  const isFormEditable = oeeData.status === "ended";
  const plannedQuantityValue = Number(oeeData.plannedQuantity);
  const formattedPlannedQuantity = isNaN(plannedQuantityValue)
    ? oeeData.plannedQuantity // ถ้าไม่ใช่ตัวเลข ให้แสดงค่าเดิม
    : plannedQuantityValue.toLocaleString("en-US");
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f8" }}>
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

      <main className="p-4 md:p-6 space-y-6">
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Paper
            elevation={3}
            sx={{
              maxWidth: 500,
              width: "100%",
              borderRadius: 2,
              overflow: "hidden",
            }}
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                    "& .MuiInputBase-input[readOnly]": {
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
        </Box>

        {lastQrScan && (
          <Box sx={{ display: "flex", justifyContent: "center" }}></Box>
        )}
      </main>

      <Dialog
        open={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ErrorIcon color="error" />
          Scan Warning
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
