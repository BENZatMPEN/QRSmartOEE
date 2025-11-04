"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  // --- MUI Components ---
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  AppBar,
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  ErrorOutline as ErrorIcon,
} from "@mui/icons-material";
import { api_oee, api_qr } from "../../../lib/axios";
import QrProductTable from "../../../components/setting/QrProductTable";
import {
  OEEConfiguration,
  ProductSelectItem,
  FormErrors,
} from "../../../interfaces/oee-config.interfaces";
import { AxiosResponse } from "axios";
import QRCsvUpdater, {
  QRProduct,
} from "../../../components/setting/QRCsvUpdater";

export default function OEEConfigurationPage() {
  const router = useRouter();
  const params = useParams();
  const oeeIdFromUrl = params.id as string; // นี่คือ Master OEE ID (เช่น 41)

  // --- States ---
  const [config, setConfig] = useState<OEEConfiguration | null>(null);
  const [productList, setProductList] = useState<ProductSelectItem[]>([]);
  const [existingQrConfigId, setExistingQrConfigId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchData = useCallback(async () => {
    if (!oeeIdFromUrl) {
      setError("OEE ID not found in the URL.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    let oeeData: any = null;

    try {
      const oeeResult = await api_oee.get(`/oees/${oeeIdFromUrl}`, {
        params: { siteId: 1 },
      });
      oeeData = oeeResult.data;
      const availableProducts: ProductSelectItem[] =
        oeeData.oeeProducts?.map((p: any) => ({
          id: p.product.id.toString(),
          name: p.product.name,
        })) || [];
      setProductList(availableProducts);

      try {
        const qrResult = await api_qr.get(`/oee/${oeeIdFromUrl}`);
        const qrData = qrResult.data;
        console.log("Retrieved QROEE config:", qrData);
        setExistingQrConfigId(qrData.id.toString());
        setConfig({
          id: qrData.id.toString(), // DB ID
          masterOeeId: qrData.masterOeeId,
          mcCode: qrData.machineCode || "N/A",
          oeeName: qrData.oeeName || "N/A",
          modbusAddress: qrData.modbusAddress || 0,
          qrStartFormat: qrData.qrStartFormat || "",
          qrStopFormat: qrData.qrStopFormat || "",
          tcpIp: qrData.tcpIp || "",
          port: qrData.port || 0,
          siteId: qrData.siteId || 1,
        });
      } catch (qrError: any) {
        try {
          if (qrError.response && qrError.response.status === 404) {
            console.log("No QROEE config found, creating a new one...");
            setExistingQrConfigId(null);

            const payload = {
              masterOeeId: Number(oeeData.id),
              machineCode: oeeData.oeeCode || "N/A",
              oeeName: oeeData.productionName || "N/A",
              siteId: 1,
              qrStartFormat: "",
              qrStopFormat: "",
              modbusAddress: 0,
              tcpIp: "",
              port: 0,
            };

            const createResponse = await api_qr.post("/oee", payload);
            const newQrData = createResponse.data;
            console.log("Created new QROEE config:", newQrData);

            setExistingQrConfigId(newQrData.id.toString());
            setConfig({
              id: newQrData?.id.toString(),
              masterOeeId: newQrData?.masterOeeId,
              mcCode: newQrData?.machineCode,
              oeeName: newQrData?.oeeName,
              modbusAddress: newQrData?.modbusAddress,
              qrStartFormat: newQrData?.qrStartFormat,
              qrStopFormat: newQrData?.qrStopFormat,
              tcpIp: newQrData?.tcpIp,
              port: newQrData?.port,
              siteId: newQrData?.siteId,
            });
          } else {
            window.location.reload();
          }
        } catch {
          window.location.reload();
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch configuration:", err);
      setError(
        err.message || "Failed to load configuration. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [oeeIdFromUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validateConfigFields = useCallback((): boolean => {
    if (!config) return false;
    const errors: FormErrors = {};
    let isValid = true;
    if (!config.modbusAddress) {
      errors.modbusAddress = "Required";
      isValid = false;
    }
    if (!config.qrStartFormat.trim()) {
      errors.qrStartFormat = "Required";
      isValid = false;
    } else if (!config.qrStartFormat.startsWith("START_")) {
      errors.qrStartFormat = "Must start with START_";
      isValid = false;
    }
    if (!config.qrStopFormat.trim()) {
      errors.qrStopFormat = "Required";
      isValid = false;
    } else if (!config.qrStopFormat.startsWith("STOP_")) {
      errors.qrStopFormat = "Must start with STOP_";
      isValid = false;
    }
    if (!config.tcpIp.trim()) {
      errors.tcpIp = "Required";
      isValid = false;
    }
    if (!config.port) {
      errors.port = "Required";
      isValid = false;
    }
    setFormErrors(errors);
    return isValid;
  }, [config]);

  useEffect(() => {
    if (!isSubmitted) return;
    validateConfigFields();
  }, [config, isSubmitted, validateConfigFields]);

  const handleInputChange =
    (field: keyof OEEConfiguration) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!config) return;
      let value = event.target.value;
      if (field === "qrStartFormat" && !value.startsWith("START_")) {
        const userInput = value.startsWith("START")
          ? value.substring(5)
          : value;
        value = "START_" + userInput;
      }
      if (field === "qrStopFormat" && !value.startsWith("STOP_")) {
        const userInput = value.startsWith("STOP") ? value.substring(4) : value;
        value = "STOP_" + userInput;
      }
      setConfig((prev) => ({ ...prev!, [field]: value }));
    };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
    const isConfigValid = validateConfigFields();
    if (isConfigValid) {
      setIsConfirmModalOpen(true);
    } else {
      console.log("Form validation failed.");
    }
  };

  const handleConfirmSave = async () => {
    setIsConfirmModalOpen(false);
    if (!config) return;
    setIsSaving(true);
    setError(null);
    const isUpdate = !!existingQrConfigId;
    let response: AxiosResponse<any, any, {}>;
    try {
      const payload = {
        ...(!isUpdate && {
          oeeId: Number(config.masterOeeId), // Master OEE ID
          machineCode: config.mcCode,
          oeeName: config.oeeName,
          siteId: config.siteId,
        }),
        qrStartFormat: config.qrStartFormat,
        qrStopFormat: config.qrStopFormat,
        modbusAddress: Number(config.modbusAddress),
        tcpIp: config.tcpIp,
        port: Number(config.port),
      };

      if (isUpdate) {
        response = await api_qr.patch(`/oee/${existingQrConfigId}`, payload);
      } else {
        response = await api_qr.post("/oee", payload);
      }

      alert("Configuration saved successfully!");
      router.push("/settings");
    } catch (err: any) {
      console.error("Failed to save configuration:", err);
      const apiErrorMessage =
        err.response?.data?.message || "An unknown error occurred.";
      setErrorMessage(`Failed to save configuration: ${apiErrorMessage}`);
      setIsErrorModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };
  const handleUploadSuccess = () => {
    console.log("CSV Upload successful, triggering table refetch...");
    setRefetchTrigger((prevTrigger) => prevTrigger + 1);
  };
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  if (error || !config) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Alert severity="error">
          {error || "Failed to load configuration data."}
        </Alert>
      </Box>
    );
  }

  // --- Render ---
  return (
    <Box className="min-h-screen bg-slate-100">
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "white",
          color: "black",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Toolbar sx={{ px: 3 }}>
          <IconButton
            onClick={() => router.push("/settings")}
            color="inherit"
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            className="grow font-bold text-slate-800"
          >
            OEE Configuration
          </Typography>
          <Button
            type="submit"
            form="oee-config-form"
            variant="contained"
            color="primary"
            disabled={isSaving}
            startIcon={<SaveIcon />}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </Toolbar>
      </AppBar>

      <form id="oee-config-form" onSubmit={handleSave}>
        <main className="p-4 md:p-6 space-y-6">
          {/* --- OEE Detail Form --- */}
          <Paper elevation={0} variant="outlined" className="p-6 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <TextField
                label="OEE Name"
                value={config.oeeName}
                disabled
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{ readOnly: true }}
                sx={{
                  "& .MuiInputBase-input[readOnly]": {
                    backgroundColor: "#eff6ff",
                  },
                }}
              />
              <TextField
                label="M/C Code"
                value={config.mcCode}
                disabled
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{ readOnly: true }}
                sx={{
                  "& .MuiInputBase-input[readOnly]": {
                    backgroundColor: "#eff6ff",
                  },
                }}
              />
              <TextField
                label="OEE ID"
                value={config.masterOeeId}
                disabled
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{ readOnly: true }}
                sx={{
                  "& .MuiInputBase-input[readOnly]": {
                    backgroundColor: "#eff6ff",
                  },
                }}
              />
              <TextField
                label="Modbus Address (Register)"
                value={config.modbusAddress}
                onChange={handleInputChange("modbusAddress")}
                error={!!formErrors.modbusAddress}
                helperText={formErrors.modbusAddress}
                fullWidth
                size="small"
                variant="outlined"
              />
              <TextField
                label="TCP/IP"
                value={config.tcpIp}
                onChange={handleInputChange("tcpIp")}
                error={!!formErrors.tcpIp}
                helperText={formErrors.tcpIp}
                fullWidth
                size="small"
                variant="outlined"
              />
              <TextField
                label="TCP/IP Port"
                value={config.port}
                onChange={handleInputChange("port")}
                error={!!formErrors.port}
                helperText={formErrors.port}
                fullWidth
                size="small"
                variant="outlined"
              />
            </div>
          </Paper>

          {/* --- QR Format Form --- */}
          <div className="grid grid-cols-1 gap-6">
            <Paper
              elevation={0}
              variant="outlined"
              className="p-6 rounded-lg flex flex-col md:flex-row gap-6"
            >
              <TextField
                label="QR Start Format"
                variant="outlined"
                fullWidth
                value={config.qrStartFormat}
                onChange={handleInputChange("qrStartFormat")}
                error={!!formErrors.qrStartFormat}
                helperText={formErrors.qrStartFormat}
              />
              <TextField
                label="QR Stop Format"
                variant="outlined"
                fullWidth
                value={config.qrStopFormat}
                onChange={handleInputChange("qrStopFormat")}
                error={!!formErrors.qrStopFormat}
                helperText={formErrors.qrStopFormat}
              />
            </Paper>
          </div>
          <div className="flex justify-end">
            <QRCsvUpdater
              oeeId={config.masterOeeId}
              productList={productList}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
          {/* --- QrProductTable Component --- */}
          <QrProductTable
            // ส่ง "DB ID" (เช่น 8) ของ Config ไป
            dbOeeId={Number(config.id)}
            // ส่ง "Master OEE ID" (เช่น 41) ไป
            masterOeeId={Number(config.masterOeeId)}
            productList={productList}
            refetchTrigger={refetchTrigger}
          />
        </main>
      </form>

      <Dialog
        open={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
      >
        <DialogTitle>Confirm Save</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to save these changes?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmSave} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ErrorIcon color="error" />
          Save Failed
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{errorMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsErrorModalOpen(false)}
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
