"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormHelperText,
  Alert,
} from "@mui/material";

interface QRProduct {
  id: string;
  qrFormatSku: string;
  specialFactor: string;
  productId: string;
  productName: string;
  oeeId: number;
  masterOeeId: number;
}
interface ProductSelectItem {
  id: string;
  name: string;
}

interface QrProductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (formData: Partial<QRProduct>) => Promise<void>;
  product: Partial<QRProduct> | null;
  productList: ProductSelectItem[];
}

const defaultFormData: Partial<QRProduct> = {
  qrFormatSku: "",
  specialFactor: "1.0000",
  productId: "",
  productName: "",
};

interface ModalFormErrors {
  qrFormatSku?: string;
  specialFactor?: string;
  productId?: string;
}

export default function QrProductModal({
  open,
  onClose,
  onSave,
  product,
  productList,
}: QrProductModalProps) {
  const [formData, setFormData] = useState<Partial<QRProduct>>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ModalFormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (product) {
        setFormData(product);
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
      setApiError(null);
    }
  }, [product, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name as string]: value,
    }));
    if (errors[name as keyof ModalFormErrors]) {
      setErrors((prev) => ({ ...prev, [name as string]: undefined }));
    }
  };

  const handleProductSelect = (selectedProductId: string) => {
    const selectedProduct = productList.find((p) => p.id === selectedProductId);
    setFormData((prev) => ({
      ...prev,
      productId: selectedProduct ? selectedProduct.id : "",
      productName: selectedProduct ? selectedProduct.name : "",
    }));
    if (errors.productId) {
      setErrors((prev) => ({ ...prev, productId: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ModalFormErrors = {};
    if (!formData.qrFormatSku || formData.qrFormatSku.trim() === "") {
      newErrors.qrFormatSku = "QR Text / SKU is required.";
    }
    if (!formData.specialFactor || isNaN(Number(formData.specialFactor))) {
      newErrors.specialFactor = "Special Factor must be a valid number.";
    } else if (Number(formData.specialFactor) <= 0) {
      newErrors.specialFactor = "Special Factor must be greater than 0.";
    }
    if (!formData.productId || formData.productId.trim() === "") {
      newErrors.productId = "Product Name is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setApiError(null);
    try {
      await onSave(formData);
    } catch (error: any) {
      setApiError(error.message || "An unknown error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {product ? "Edit QR Product" : "Add New QR Product"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}

          <TextField
            name="qrFormatSku"
            label="QR Text / SKU"
            fullWidth
            variant="outlined"
            size="small"
            value={formData.qrFormatSku}
            onChange={handleChange}
            error={!!errors.qrFormatSku}
            helperText={errors.qrFormatSku}
            required
          />

          <TextField
            name="specialFactor"
            label="Special Factor"
            type="number"
            fullWidth
            variant="outlined"
            size="small"
            value={formData.specialFactor}
            onChange={handleChange}
            error={!!errors.specialFactor}
            helperText={errors.specialFactor}
            required
          />

          <FormControl
            size="small"
            fullWidth
            error={!!errors.productId}
            required
          >
            <InputLabel>Product Name</InputLabel>
            <Select
              name="productId"
              value={formData.productId}
              label="Product Name"
              onChange={(e) => handleProductSelect(e.target.value as string)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {productList.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
            {errors.productId && (
              <FormHelperText>{errors.productId}</FormHelperText>
            )}
          </FormControl>

          <TextField
            label="Product ID (Read-only)"
            fullWidth
            variant="outlined"
            size="small"
            value={formData.productId || "-"}
            disabled
            InputProps={{ readOnly: true }}
            sx={{
              "& .MuiInputBase-input[readOnly]": {
                backgroundColor: "#f5f5f5",
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
