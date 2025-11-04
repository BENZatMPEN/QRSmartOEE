"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Typography,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  TablePagination,
  CircularProgress,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import {
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { api_qr } from "../../lib/axios";
import QrProductModal from "./QrProductModal";
import {
  QRProduct,
  ProductSelectItem,
} from "../../interfaces/oee-config.interfaces";

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface QrProductTableProps {
  dbOeeId: number;
  masterOeeId: number;
  productList: ProductSelectItem[];
  refetchTrigger: number;
}

export default function QrProductTable({
  dbOeeId,
  masterOeeId,
  productList,
  refetchTrigger,
}: QrProductTableProps) {
  const [qrProducts, setQrProducts] = useState<QRProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Partial<QRProduct> | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null
  );

  const fetchQrProducts = useCallback(
    async (page: number, limit: number) => {
      if (!dbOeeId) {
        setIsLoading(false);
        setQrProducts([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
        return;
      }
      setIsLoading(true);
      try {
        const response = await api_qr.get(`/oee/${dbOeeId}/qr-products`, {
          params: { page, limit },
        });
        const { data, total, page: currentPage, totalPages } = response.data;
        setQrProducts(data);
        setPagination({ page: currentPage, limit, total, totalPages });
      } catch (error) {
        console.error("Failed to fetch QR products:", error);
        setQrProducts([]);
      } finally {
        setIsLoading(false);
      }
    },
    [dbOeeId]
  );

  useEffect(() => {
    if (dbOeeId) {
      console.log(`Fetching data, Trigger: ${refetchTrigger}`);
      fetchQrProducts(pagination.page, pagination.limit);
    } else {
      setIsLoading(false);
      setQrProducts([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
    }
  }, [
    fetchQrProducts,
    pagination.page,
    pagination.limit,
    dbOeeId,
    refetchTrigger,
  ]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage + 1 }));
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 1,
    }));
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: QRProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingProductId(id);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingProductId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProductId) return;

    try {
      await api_qr.delete(`/oee/qr-products/${deletingProductId}`);
      fetchQrProducts(pagination.page, pagination.limit);
      handleCloseDeleteModal();
    } catch (error) {
      console.error("Failed to delete QR product:", error);
      alert("Failed to delete product.");
      handleCloseDeleteModal();
    }
  };

  const handleSaveProduct = async (formData: Partial<QRProduct>) => {
    try {
      if (editingProduct && editingProduct.id) {
        const payload = {
          qrFormatSku: formData.qrFormatSku,
          specialFactor: Number(formData.specialFactor) || 1.0,
          productId: formData.productId,
          productName: formData.productName,
        };
        await api_qr.patch(`/oee/qr-products/${editingProduct.id}`, payload);
      } else {
        const payload = {
          ...formData,
          specialFactor: Number(formData.specialFactor) || 1.0,
          oeeId: dbOeeId,
          masterOeeId: masterOeeId,
        };
        await api_qr.post("/oee/qr-products", payload);
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      const pageToFetch = editingProduct ? pagination.page : 1;
      fetchQrProducts(pageToFetch, pagination.limit);
    } catch (error: any) {
      console.error("Failed to save QR product:", error);
      throw new Error(
        error.response?.data?.message || "Failed to save product."
      );
    }
  };

  return (
    <>
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
            onClick={handleAddNew}
            size="small"
            disabled={!dbOeeId}
          >
            New
          </Button>
        </div>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>QR Text / SKU</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Special Factor</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Product Name</TableCell>
                <TableCell sx={{ width: 120, textAlign: "center" }}>
                  Product ID
                </TableCell>
                <TableCell sx={{ width: 100, textAlign: "right" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} sx={{ m: 4 }} />
                  </TableCell>
                </TableRow>
              ) : qrProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography sx={{ p: 4, color: "text.secondary" }}>
                      No QR items found. Click 'New' to add one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                qrProducts.map((qr) => (
                  <TableRow key={qr.id} hover>
                    <TableCell>{qr.qrFormatSku}</TableCell>
                    <TableCell>{qr.specialFactor}</TableCell>
                    <TableCell>{qr.productName}</TableCell>
                    <TableCell align="center">{qr.productId || "-"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEdit(qr)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(qr.id)}
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 500]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page - 1}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {isModalOpen && (
        <QrProductModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          product={editingProduct}
          productList={productList}
        />
      )}

      <Dialog open={isDeleteModalOpen} onClose={handleCloseDeleteModal}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this QR product? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
