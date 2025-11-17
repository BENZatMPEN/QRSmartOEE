"use client";

import { useState, useEffect, useCallback, KeyboardEvent } from "react";
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
import { api_oee, api_qr } from "../../../lib/axios"; // ✨ Import api_qr
import useWebSocket from "../../../contexts/WebSocketContext";
import useWebSocketQr from "../../../contexts/WebSocketQrContext";
import { useAuth } from "../../../contexts/AuthContext";

// --- Interfaces ---
type OEEStatus = "running" | "ended" | "no plan" | "breakdown" | "unknown";
type ScanSource = "TCP" | "USB";

interface OEEDetailData {
  id: string;
  name: string;
  sku: string;
  pd: string;
  plannedQuantity: string;
  status: OEEStatus;
  scanSource: ScanSource;
  productId?: string;
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
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  const [lastScannedProductId, setLastScannedProductId] = useState<
    number | null
  >(null);
  const oeeId = params.id as string;
  const [usbScanInput, setUsbScanInput] = useState("");

  const [globalScanBuffer, setGlobalScanBuffer] = useState("");
  const [scanTimer, setScanTimer] = useState<NodeJS.Timeout | null>(null);

  // --- Helper: Function to show Alert Modal ---
  const showAlert = (message: string) => {
    console.log(`[Alert] Showing modal: "${message}"`);
    setAlertMessage(message);
    setIsAlertModalOpen(true);
  };

  // ✨ --- [REFACTORED] fetchOeeDetail ---
  const fetchOeeDetail = useCallback(async () => {
    if (!oeeId) return;
    console.log(`[Debug] fetchOeeDetail: Fetching data for oeeId: ${oeeId}`);
    setLoading(true);
    try {
      // 1. สร้าง Promises สำหรับ API ทั้งสอง
      const batchPromise = api_oee.get(`/oees/${oeeId}/latest-batch`, {
        params: { siteId: 1 },
      });
      const configPromise = api_qr.get(`/oee/${oeeId}`);

      // 2. เรียก API พร้อมกัน
      const [batchResult, configResult] = await Promise.allSettled([
        batchPromise,
        configPromise,
      ]);

      // 3. ประมวลผล Config (ต้องสำเร็จเสมอ)
      let configData: any;
      if (configResult.status === "fulfilled" && configResult.value.data) {
        console.log(
          "[Debug] fetchOeeDetail: Config API response received:",
          configResult.value.data
        );
        configData = configResult.value.data;
      } else {
        console.error(
          "[Debug] fetchOeeDetail: Config API Error:",
          configResult.status === "rejected"
            ? configResult.reason
            : "No config data"
        );
        throw new Error("Failed to fetch essential OEE configuration.");
      }

      // 4. ประมวลผล Batch (อาจจะไม่เจอข้อมูลก็ได้)
      let batchData: any = {};
      let product: any = null;
      if (batchResult.status === "fulfilled" && batchResult.value.data) {
        console.log(
          "[Debug] fetchOeeDetail: Batch API response received:",
          batchResult.value.data
        );
        batchData = batchResult.value.data;
        product = batchData.product;
        setCurrentBatchId(batchData.id);
        setLastScannedProductId(batchData.product?.id || null);
      } else {
        console.warn(
          "[Debug] fetchOeeDetail: Could not fetch latest batch (This is OK for 'no plan')."
        );
        setCurrentBatchId(null);
      }

      // 5. รวมข้อมูลและตั้งค่า State
      const status = batchData.status?.toLowerCase() || "no plan";
      const formatted: OEEDetailData = {
        id: batchData.id?.toString() || oeeId,
        name: configData.oeeName || `OEE ${oeeId} Production`, // 👈 ใช้ชื่อจาก Config
        status: status,
        sku: status === "ended" ? "" : product?.name || "N/A",
        productId: status === "ended" ? "" : product?.id?.toString() || "N/A",
        pd: status === "ended" ? "" : batchData.lotNumber || "N/A",
        plannedQuantity:
          status === "ended"
            ? "0"
            : batchData.plannedQuantity?.toString() || "0",
        // 👈 [GOAL] ใช้ scanSource จาก configData
        scanSource: configData.scanSource?.toUpperCase() || "TCP",
      };

      console.log("[Debug] formatBatchData: Result:", formatted);
      setOeeData(formatted);
    } catch (error) {
      console.error("[Debug] fetchOeeDetail: General Error:", error);
      setCurrentBatchId(null);
      setOeeData({
        id: oeeId,
        name: `OEE ${oeeId} Production`,
        sku: "N/A",
        pd: "N/A",
        plannedQuantity: "0",
        status: "no plan",
        scanSource: "TCP",
      });
    } finally {
      setLoading(false);
    }
  }, [oeeId]);

  useEffect(() => {
    fetchOeeDetail();
  }, [fetchOeeDetail]);

  useEffect(() => {
    if (!socket || !socket.connected) {
      console.log("[TCP/IP] Dashboard socket not ready, skipping listener.");
      return;
    }
    const siteId = 1;
    const eventName = `dashboard_${siteId}_${user?.id}`;

    const handleDashboardUpdate = (stats: any) => {
      console.groupCollapsed(`[TCP/IP] Received '${eventName}'`);
      console.log("Raw stats:", stats);
      if (stats && Array.isArray(stats.oees)) {
        const currentOeeDataFromSocket = stats.oees.find(
          (oee: any) => oee.id.toString() === oeeId
        );
        if (currentOeeDataFromSocket) {
          const newStatus =
            currentOeeDataFromSocket.batchStatus?.toLowerCase() || "no plan";
          console.log(`[TCP/IP] Found matching OEE. New status: ${newStatus}`);
          setOeeData((prevData) => {
            if (!prevData) return null;
            return { ...prevData, status: newStatus };
          });
        } else {
          console.log(
            `[TCP/IP] No matching OEE data found for ID ${oeeId} in this update.`
          );
        }
      } else {
        console.warn(
          "[TCP/IP] Received data with unexpected structure:",
          stats
        );
      }
      console.groupEnd();
    };

    console.log(`[TCP/IP] Subscribing to: '${eventName}'`);
    socket.on(eventName, handleDashboardUpdate);
    return () => {
      console.log(`[TCP/IP] Unsubscribing from: '${eventName}'`);
      socket.off(eventName, handleDashboardUpdate);
    };
  }, [socket, oeeId, user?.id]);

  // --- WebSocket: QR Updates Logic (The "Brain") ---
  const handleQrUpdate = useCallback(
    (data: LastQrScanData) => {
      console.groupCollapsed(
        `[handleQrUpdate] 📦 Received QR update: ${data.type} - ${data.status}`
      );
      console.log("Raw data:", data);

      // [GATEKEEPER]
      if (data.oeeId !== Number(oeeId)) {
        console.log(
          `[handleQrUpdate] Ignoring event for oeeId ${data.oeeId} (this page is ${oeeId})`
        );
        console.groupEnd();
        return;
      }

      let displayText = data.scannedText;
      if (data.type === "START" && displayText.startsWith("start_"))
        displayText = displayText.substring(6);
      if (data.type === "STOP" && displayText.startsWith("stop_"))
        displayText = displayText.substring(5);

      console.log("Cleaned text:", displayText);

      if (
        data.type === "SKU" &&
        data.status === "FOUND" &&
        data.productInfo?.productId
      ) {
        console.log(
          `[handleQrUpdate] Setting LastScannedProductId: ${data.productInfo.productId}`
        );
        setLastScannedProductId(parseInt(data.productInfo.productId));
      }

      setOeeData((currentOeeData) => {
        if (!currentOeeData) {
          console.log(
            "[handleQrUpdate] Skipping state update, currentOeeData is null."
          );
          console.groupEnd();
          return null;
        }

        const currentStatus = currentOeeData.status;
        const isEnded =
          currentStatus === "ended" || currentStatus === "no plan";

        console.log(
          `[handleQrUpdate] Current Status: ${currentStatus} (isEnded: ${isEnded})`
        );

        // CASE 1: Machine is ENDED
        if (isEnded) {
          console.log("[handleQrUpdate] Logic path: Machine is ENDED.");
          if (data.status === "FOUND") {
            console.log(`[handleQrUpdate] ENDED path, type: ${data.type}`);
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
                      throw new Error(
                        "API did not return a new batch ID after creation."
                      );
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
            console.log(
              `[handleQrUpdate] ENDED path, status: NOT_FOUND, type: ${data.type}`
            );
            showAlert(
              `Invalid Scan (${data.type}): "${displayText}" not found.`
            );
          }
        }

        // CASE 2: Machine is RUNNING
        else {
          console.log(
            "[handleQrUpdate] Logic path: Machine is RUNNING/BREAKDOWN."
          );
          if (data.status === "FOUND") {
            console.log(`[handleQrUpdate] RUNNING path, type: ${data.type}`);
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
            console.log(
              `[handleQrUpdate] RUNNING path, status: NOT_FOUND, type: ${data.type}`
            );
            showAlert(
              `Invalid Scan (${data.type}): "${displayText}" not found.`
            );
          }
        }

        console.groupEnd();
        return currentOeeData;
      });
    },
    [oeeId, fetchOeeDetail, currentBatchId, lastScannedProductId]
  );

  // --- WebSocket: QR (Subscribe) ---
  useEffect(() => {
    // [GATEKEEPER] ถ้าไม่ได้เลือกโหมด WEBSOCKET, หรือ socket ไม่พร้อม, ให้ออกจากฟังก์ชัน
    if (!socketQr || !socketQr.connected || !oeeId) {
      if (!socketQr || !socketQr.connected) {
        console.log(
          "[WebSocketQr] Skipping subscription: Socket not connected."
        );
      }
      if (!oeeId) {
        console.log("[WebSocketQr] Skipping subscription: OEE ID not ready.");
      }
      return;
    }

    const roomName = `site_1`;
    console.log(`[WebSocketQr] Emitting 'join_room' to join: '${roomName}'`);
    socketQr.emit("join_room", roomName);

    const eventName = `qr_update_${oeeId}`;
    console.log(
      `[WebSocketQr] Subscribing to: '${eventName}' (Mode: WEBSOCKET)`
    );
    socketQr.on(eventName, handleQrUpdate);

    return () => {
      console.log(`[WebSocketQr] Unsubscribing from: '${eventName}'`);
      socketQr.off(eventName, handleQrUpdate);
    };
  }, [socketQr, oeeId, handleQrUpdate, oeeData?.scanSource]);

  // --- Handlers ---

  // ✨ --- [START] อัปเดต Logic การสแกน USB ---
  const processScanInput = async (text: string) => {
    if (!text) return;

    console.groupCollapsed(`[USB Scan] Sending to BE: "${text}"`);

    try {
      // 1. สร้าง Payload ที่จะส่งให้ Backend
      const payload = {
        text: text,
        oeeId: Number(oeeId),
      };
      console.log("Sending payload:", payload);

      // 2. ยิง API POST ไปยัง Backend (Endpoint: /oees/scan-usb)
      // Backend จะรับค่านี้ไปประมวลผล (ค้นหา SKU, PD, ฯลฯ)
      // แล้วยิง WebSocket `qr_update_${oeeId}` กลับมา
      await api_qr.post("/oee/scan-usb", payload);

      console.log("[USB Scan] Sent to BE successfully.");

      // 3. [สำคัญมาก] เราจะไม่เรียก handleQrUpdate(fakeData) ที่นี่
      // เราจะรอให้ Server ส่ง WebSocket กลับมา แล้ว handleQrUpdate จะทำงานเอง
    } catch (error) {
      console.error("[USB Scan] Failed to send scan to BE:", error);
      showAlert("Error: Failed to send USB scan data to server.");
    } finally {
      console.groupEnd();
    }
  };
  // ✨ --- [END] อัปเดต Logic การสแกน USB ---

  const handleUsbScan = (event: KeyboardEvent<HTMLInputElement>) => {
    // ✨ [แก้ไข] ตรวจสอบทั้ง key และ keyCode
    if (event.key === "Enter" || event.keyCode === 13) {
      console.log("[USB Scan] 'Enter' pressed in text field.");
      event.preventDefault();
      const text = usbScanInput.trim();
      processScanInput(text); // เรียกฟังก์ชัน `async` (ไม่ต้อง await)
      setUsbScanInput("");
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      // --- Filters ---
      if (!oeeData) return;
      if (oeeData.scanSource !== "USB") {
        return;
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // --- Buffer Logic ---
      if (scanTimer) clearTimeout(scanTimer);

      // ✨ [แก้ไข] ตรวจสอบทั้ง key และ keyCode
      if (event.key === "Enter" || event.keyCode === 13) {
        if (globalScanBuffer.length > 0) {
          console.log(
            `[Global Scan] 'Enter' pressed. Processing buffer: "${globalScanBuffer}"`
          );
          processScanInput(globalScanBuffer); // เรียกฟังก์ชัน `async` (ไม่ต้อง await)
          setGlobalScanBuffer("");
        }
      } else if (event.key.length === 1) {
        // console.debug(`[Global Scan] Key buffered: ${event.key}`);
        const newBuffer = globalScanBuffer + event.key;
        setGlobalScanBuffer(newBuffer);
      }

      setScanTimer(
        setTimeout(() => {
          setGlobalScanBuffer("");
        }, 100)
      );
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      if (scanTimer) clearTimeout(scanTimer);
    };
  }, [oeeData, globalScanBuffer, scanTimer, processScanInput]);

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

      <main className="p-4 md:p-6 flex justify-center">
        <Box className="w-full max-w-lg space-y-6">
          {/* --- Main OEE Detail Card --- */}
          <Paper elevation={3} className="rounded-lg overflow-hidden w-full">
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
                <Box sx={{ display: "flex", gap: 2 }}>
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
                    label="Product ID"
                    value={oeeData.productId ?? "-"}
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      readOnly: true,
                      sx: {
                        input: {
                          textAlign: "center", // จัด text ให้อยู่ตรงกลางแนวนอน
                        },
                      },
                    }}
                    sx={{
                      width: 120,
                      "& .MuiInputBase-input": {
                        backgroundColor: "#f0f0f0",
                      },
                    }}
                  />
                </Box>

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
