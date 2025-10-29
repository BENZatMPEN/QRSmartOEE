"use client";

import { useState, useEffect, FormEvent } from "react";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  DeleteOutline as DeleteIcon,
  Save as SaveIcon,
  ErrorOutline as ErrorIcon,
} from "@mui/icons-material";
import { api_oee, api_qr } from "../../../lib/axios";

// --- Interfaces ---
interface OEEConfiguration {
  id: string;
  mcCode: string;
  oeeName: string;
  oeeId: string;
  modbusAddressLock: string;
  qrStartFormat: string;
  qrStopFormat: string;
  siteId: number;
}
interface QRProduct {
  id: string;
  qrFormatSku: string;
  specialFactor: string;
  productId: string;
  productName: string;
}
interface ProductSelectItem {
  id: string;
  name: string;
}
interface FormErrors {
  modbusAddressLock?: string;
  qrStartFormat?: string;
  qrStopFormat?: string;
  qrProducts?: {
    [index: number]: { qrFormatSku?: string; productId?: string };
  };
}

const FormField = ({
  label,
  className,
  ...props
}: {
  label: string;
  className?: string;
  [key: string]: any;
}) => (
  <div className={className}>
    <TextField
      label={label}
      size="small"
      fullWidth
      variant="outlined"
      {...props}
      value={props.value ?? ""}
      sx={{
        "& .MuiOutlinedInput-root": {
          backgroundColor: props.disabled
            ? "#eff6ff"
            : props.value
            ? "white"
            : "#f8fafc",
          "&:hover fieldset": {
            borderColor: props.disabled ? "transparent" : "primary.main",
          },
        },
      }}
    />
  </div>
);

export default function OEEConfigurationPage() {
  const router = useRouter();
  const params = useParams();
  const oeeIdFromUrl = params.id as string;

  // --- States ---
  const [config, setConfig] = useState<OEEConfiguration>({
    id: "",
    mcCode: "",
    oeeName: "",
    oeeId: "",
    modbusAddressLock: "",
    qrStartFormat: "",
    qrStopFormat: "",
    siteId: 1,
  });
  const [qrProducts, setQrProducts] = useState<QRProduct[]>([]);
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
  // ✨ 1. เพิ่ม State เพื่อติดตามว่าเคยกด Submit แล้วหรือยัง
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // ... (ส่วน useEffect ไม่มีการเปลี่ยนแปลง)
    if (!oeeIdFromUrl) {
      setError("OEE ID not found in the URL.");
      setIsLoading(false);
      return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const oeePromise = api_oee.get(`/oees/${oeeIdFromUrl}`, {
          params: { siteId: 1 },
        });
        const qrPromise = api_qr.get(`/oee/${oeeIdFromUrl}`);
        const [oeeResult, qrResult] = await Promise.allSettled([
          oeePromise,
          qrPromise,
        ]);
        if (oeeResult.status === "fulfilled") {
          const oeeData = oeeResult.value.data;
          setConfig((prev) => ({
            ...(prev || {
              modbusAddressLock: "",
              qrStartFormat: "",
              qrStopFormat: "",
            }),
            id: oeeData.id.toString(),
            oeeName: oeeData.productionName || "N/A",
            mcCode: oeeData.oeeCode || "N/A",
            oeeId: oeeData.id.toString() || "N/A",
          }));
          const availableProducts: ProductSelectItem[] =
            oeeData.oeeProducts?.map((p: any) => ({
              id: p.product.id.toString(),
              name: p.product.name,
            })) || [];
          setProductList(availableProducts);
        } else {
          throw new Error("Failed to fetch essential OEE data.");
        }
        if (qrResult.status === "fulfilled" && qrResult.value.data) {
          const qrData = qrResult.value.data;
          if (qrData.id) {
            setExistingQrConfigId(qrData.id.toString());
          } else {
            setExistingQrConfigId(null);
          }
          setConfig((prev) => ({
            ...prev!,
            modbusAddressLock: qrData.modbusAddress || "",
            qrStartFormat: qrData.qrStartFormat || "",
            qrStopFormat: qrData.qrStopFormat || "",
          }));
          const fetchedQRProducts: QRProduct[] =
            qrData.qrProducts?.map((p: any) => ({
              id: p.id.toString(),
              qrFormatSku: p.qrFormatSku || "",
              specialFactor: p.specialFactor || "1.0000",
              productId: p.productId.toString() || "",
              productName: p.productName || "",
            })) || [];
          fetchedQRProducts.sort((a, b) => parseInt(a.id) - parseInt(b.id));
          setQrProducts(fetchedQRProducts);
        } else {
          setConfig((prev) => ({
            ...prev!,
            modbusAddressLock: "",
            qrStartFormat: "",
            qrStopFormat: "",
          }));
          setQrProducts([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch configuration:", err);
        setError(
          err.message || "Failed to load configuration. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [oeeIdFromUrl]);

  const validateForm = (): boolean => {
    const errors: FormErrors = { qrProducts: {} };
    let isValid = true;

    if (!config.modbusAddressLock.trim()) {
      errors.modbusAddressLock = "Required";
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

    qrProducts.forEach((product, index) => {
      if (!product.qrFormatSku.trim()) {
        if (!errors.qrProducts) errors.qrProducts = {};
        errors.qrProducts[index] = {
          ...errors.qrProducts?.[index],
          qrFormatSku: "Required",
        };
        isValid = false;
      }
      if (!product.productId) {
        if (!errors.qrProducts) errors.qrProducts = {};
        errors.qrProducts[index] = {
          ...errors.qrProducts?.[index],
          productId: "Required",
        };
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  // ✨ 2. เพิ่ม useEffect เพื่อ re-validate หลังจาก submit ครั้งแรก
  useEffect(() => {
    // ถ้ายังไม่เคยกด submit เลย ให้ข้ามไป
    if (!isSubmitted) {
      return;
    }
    // ถ้าเคยกดแล้ว ให้ validate ใหม่ทุกครั้งที่ข้อมูลเปลี่ยน
    validateForm();
  }, [config, qrProducts, isSubmitted]); // Dependency array

  // --- Handlers ---
  const handleInputChange =
    (field: keyof OEEConfiguration) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value;

      // ✨ UX Improvement: บังคับให้มี Prefix เสมอ
      if (field === "qrStartFormat" && !value.startsWith("START_")) {
        // ดึงเฉพาะส่วนที่ผู้ใช้พิมพ์ตามหลัง Prefix
        const userInput = value.startsWith("START")
          ? value.substring(5)
          : value;
        value = "START_" + userInput;
      }
      if (field === "qrStopFormat" && !value.startsWith("STOP_")) {
        const userInput = value.startsWith("STOP") ? value.substring(4) : value;
        value = "STOP_" + userInput;
      }

      setConfig((prev) => ({ ...prev, [field]: value }));
    };

  const handleQRInputChange =
    (
      index: number,
      field: keyof Omit<QRProduct, "productId" | "productName" | "id">
    ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newProducts = [...qrProducts];
      newProducts[index] = {
        ...newProducts[index],
        [field]: event.target.value,
      };
      setQrProducts(newProducts);
    };

  const handleProductSelectChange = (
    qrIndex: number,
    selectedProductId: string
  ) => {
    const selectedProduct = productList.find((p) => p.id === selectedProductId);
    const newProducts = [...qrProducts];
    newProducts[qrIndex] = {
      ...newProducts[qrIndex],
      productId: selectedProduct ? selectedProduct.id : "",
      productName: selectedProduct ? selectedProduct.name : "",
    };
    setQrProducts(newProducts);
  };

  const handleAddNewQR = () => {
    const newQR: QRProduct = {
      id: `new-${Date.now()}`,
      qrFormatSku: "",
      specialFactor: "1.0000",
      productId: "",
      productName: "",
    };
    setQrProducts((prev) => [...prev, newQR]);
  };

  const handleDeleteQR = (idToDelete: string) => {
    setQrProducts((prevProducts) =>
      prevProducts.filter((qr) => qr.id !== idToDelete)
    );
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // ✨ 3. ตั้งค่า isSubmitted เป็น true เมื่อกด Save
    setIsSubmitted(true);

    if (validateForm()) {
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
    let response;

    try {
      const payload = {
        ...(!isUpdate && {
          oeeId: Number(config.oeeId),
          machineCode: config.mcCode,
          oeeName: config.oeeName,
          siteId: config.siteId,
        }),
        qrStartFormat: config.qrStartFormat,
        qrStopFormat: config.qrStopFormat,
        modbusAddress: config.modbusAddressLock,
        qrProducts: qrProducts.map((qr) => ({
          ...(qr.id && !qr.id.startsWith("new-")
            ? { id: parseInt(qr.id) }
            : {}),
          productId: qr.productId,
          productName: qr.productName,
          qrFormatSku: qr.qrFormatSku,
          specialFactor: parseFloat(qr.specialFactor) || 1.0,
        })),
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
      // ✨ 3. แก้ไข catch block ให้เปิด Error Modal แทน alert
      const apiErrorMessage =
        err.response?.data?.message || "An unknown error occurred.";
      setErrorMessage(`Failed to save configuration: ${apiErrorMessage}`);
      setIsErrorModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

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
          <Paper elevation={0} variant="outlined" className="p-6 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <FormField label="OEE Name" value={config.oeeName} disabled />
              <FormField label="M/C Code" value={config.mcCode} disabled />
              <FormField label="OEE ID" value={config.oeeId} disabled />
              <FormField
                label="Modbus Address Lock"
                value={config.modbusAddressLock}
                onChange={handleInputChange("modbusAddressLock")}
                error={!!formErrors.modbusAddressLock}
                helperText={formErrors.modbusAddressLock}
              />
            </div>
          </Paper>

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

          <Paper
            elevation={0}
            variant="outlined"
            className="overflow-hidden rounded-lg"
          >
            <div className="flex items-center p-4">
              <Typography className="grow font-extrabold text-slate-800 tracking-wide">
                QR List / SKU
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNewQR}
                size="small"
              >
                New
              </Button>
            </div>
            <div className="divide-y divide-slate-200">
              <div className="hidden md:flex items-center p-2 px-4 gap-4 bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                <div className="w-20 text-center">No.</div>
                <div className="flex-1">QR Text / SKU</div>
                <div className="w-36">Special Factor</div>
                <div className="w-48">Product Name</div>
                <div className="w-24 text-center">Product ID</div>
                <div className="w-12"></div>
              </div>
              {qrProducts.map((qr, index) => (
                <div
                  key={qr.id}
                  className="grid grid-cols-2 md:flex items-center p-2 px-4 gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="md:w-20 flex justify-center items-center h-full">
                    <Typography
                      variant="body2"
                      className="font-semibold text-slate-600"
                    >
                      {index + 1}
                    </Typography>
                  </div>

                  <FormField
                    label=""
                    className="flex-1"
                    value={qr.qrFormatSku}
                    onChange={handleQRInputChange(index, "qrFormatSku")}
                    error={!!formErrors.qrProducts?.[index]?.qrFormatSku}
                    helperText={formErrors.qrProducts?.[index]?.qrFormatSku}
                  />

                  <FormField
                    label=""
                    className="md:w-36"
                    value={qr.specialFactor}
                    onChange={handleQRInputChange(index, "specialFactor")}
                  />

                  <FormControl
                    size="small"
                    className="md:w-48"
                    error={!!formErrors.qrProducts?.[index]?.productId}
                  >
                    <Select
                      value={qr.productId}
                      label=""
                      onChange={(e) =>
                        handleProductSelectChange(index, e.target.value)
                      }
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {productList.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formErrors.qrProducts?.[index]?.productId && (
                      <FormHelperText>
                        {formErrors.qrProducts[index].productId}
                      </FormHelperText>
                    )}
                  </FormControl>

                  <div className="md:w-24 flex justify-center items-center h-full">
                    <Typography variant="body2" className="text-slate-500">
                      {qr.productId || "-"}
                    </Typography>
                  </div>
                  <div className="md:w-12 flex justify-center items-end h-full">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteQR(qr.id)}
                      title="Remove item"
                      sx={{ color: "error.main" }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </div>
              ))}
              {qrProducts.length === 0 && (
                <div className="text-center p-8 text-slate-500">
                  No QR items found. Click 'New' to add one.
                </div>
              )}
            </div>
          </Paper>
        </main>
      </form>

      {/* --- Modals --- */}
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
