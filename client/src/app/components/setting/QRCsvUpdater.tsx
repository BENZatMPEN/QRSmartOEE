import React, { useState } from "react";
import {
  Button,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import * as XLSX from "xlsx";
import { api_qr } from "../../lib/axios";

export interface ProductItem {
  id: string;
  name: string;
}

export interface QRCsvUpdaterProps {
  oeeId: string | number;
  productList: ProductItem[];
  onUploadSuccess: () => void;
}

export interface QRProduct {
  id: string;
  qrFormatSku: string;
  specialFactor: string;
  productId: string;
  productName: string;
}

export default function QRCsvUpdater({
  oeeId,
  productList,
  onUploadSuccess,
}: QRCsvUpdaterProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [errorRows, setErrorRows] = useState<
    { index: number; reason: string; row: any }[]
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownloadTemplate = (): void => {
    if (!productList || productList.length === 0) {
      alert("No products found to generate template.");
      return;
    }

    const data = productList.map((p) => ({
      "QR Text / SKU": `SKU_${p.name.toUpperCase().replace(/\s/g, "_")}`,
      "Special Factor": "1.0000",
      "Product Name": p.name,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QR_Template");
    XLSX.writeFile(wb, `QR_Update_Template_${oeeId}.csv`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    setErrorRows([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("masterOeeId", String(oeeId));
      formData.append("productList", JSON.stringify(productList));

      const response = await api_qr.post("/oee/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { successCount, failCount, failedRows } = response.data;

      // 1. แสดง Modal หากมีแถวที่ล้มเหลว
      if (failedRows && failedRows.length > 0) {
        setErrorRows(failedRows);
        setIsModalOpen(true);
      }

      if (successCount > 0) {
        onUploadSuccess();

        if (failCount > 0) {
          setMessage(
            `⚠️ Import complete: ${successCount} succeeded, ${failCount} failed.`
          );
        } else {
          setMessage(`✅ Import success! ${successCount} rows imported.`);
        }
      } else if (failCount > 0) {
        setMessage(
          `❌ Import failed. ${failCount} rows could not be processed.`
        );
      } else {
        setMessage("❌ No valid data rows found in the uploaded file.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage(
        `❌ Upload failed: ${
          err.response?.data?.message || "Server error occurred"
        }`
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <Paper className="p-8 space-y-4 " variant="outlined">
        <Typography
          variant="h6"
          className="font-bold text-slate-700 flex justify-center items-center"
        >
          Update QR Product Data via CSV
        </Typography>

        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Button
            variant="outlined"
            color="primary"
            onClick={handleDownloadTemplate}
          >
            Download CSV Template
          </Button>

          <Button variant="contained" component="label" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload CSV to Import"}
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileUpload}
            />
          </Button>
        </div>

        {message && (
          <Typography
            className={
              message.startsWith("✅")
                ? "text-green-600"
                : message.startsWith("⚠️")
                ? "text-yellow-600"
                : "text-red-600"
            }
          >
            {message}
          </Typography>
        )}
      </Paper>

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>⚠️ Import Warning</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Some rows could not be imported:
          </Typography>
          <List dense>
            {errorRows.map((err, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={err.reason}
                  secondary={`(Row: ${err.index + 1} - Data: ${JSON.stringify(
                    err.row
                  )})`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
