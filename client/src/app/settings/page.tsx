"use client";

import { useState, useEffect, useMemo, MouseEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { api_oee } from "../lib/axios";

// Interface สำหรับข้อมูลที่ UI ต้องการ
interface OEESettings {
  id: string;
  name: string; // OEE Code
  mcCode: string;
  machineName: string;
  location: string;
  oeeType: string;
}

// ฟังก์ชันสำหรับแปลง API Response ให้เป็น UI Data
const transformApiResponse = (apiItem: any): OEESettings => {
  const firstMachine =
    apiItem.oeeMachines && apiItem.oeeMachines[0]
      ? apiItem.oeeMachines[0].machine
      : null;
  return {
    id: apiItem.id.toString(),
    name: apiItem.oeeCode || "N/A",
    mcCode: firstMachine ? firstMachine.code : "",
    machineName: firstMachine
      ? firstMachine.name
      : apiItem.productionName || "N/A",
    location: apiItem.location || "N/A",
    oeeType: apiItem.oeeType || "N/A",
  };
};

type Order = "asc" | "desc";
interface HeadCell {
  id: keyof OEESettings;
  label: string;
}
const headCells: readonly HeadCell[] = [
  { id: "name", label: "OEE Code" },
  { id: "mcCode", label: "M/C Code" },
  { id: "id", label: "OEE ID" },
];

// Helper Functions for Sorting
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}
function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort<T>(
  array: readonly T[],
  comparator: (a: T, b: T) => number
) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

export default function OEEListPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [oeeSettings, setOeeSettings] = useState<OEESettings[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // States for Table
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<keyof OEESettings>("name");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState("");

  // State for Action Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentMenuId, setCurrentMenuId] = useState<null | string>(null);

  const fetchOees = useCallback(
    async (searchQuery = "") => {
      setLoading(true);
      const apiOrderBy = orderBy === "name" ? "oeeCode" : orderBy;
      const params = {
        siteId: "1",
        search: searchQuery,
        order: order,
        orderBy: apiOrderBy,
        page: page.toString(),
        rowsPerPage: rowsPerPage.toString(),
      };
      try {
        const response = await api_oee.get("/oees", { params });
        if (response.data && Array.isArray(response.data.list)) {
          const transformedData = response.data.list.map(transformApiResponse);
          setOeeSettings(transformedData);
          setTotalRows(response.data.count || 0);
        } else {
          setOeeSettings([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error("Failed to fetch OEE settings:", error);
        setOeeSettings([]);
        setTotalRows(0);
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, order, orderBy]
  );

  useEffect(() => {
    fetchOees(searchText);
  }, [fetchOees]);

  const handleSearch = () => {
    if (page === 0) fetchOees(searchText);
    else setPage(0);
  };
  const handleReset = () => {
    if (page === 0 && searchText === "") fetchOees("");
    else {
      setPage(0);
      setSearchText("");
    }
  };
  const handleRequestSort = (property: keyof OEESettings) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
    setPage(0);
  };
  const handleChangePage = (event: unknown, newPage: number) =>
    setPage(newPage);
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleMenuOpen = (event: MouseEvent<HTMLElement>, id: string) => {
    event.stopPropagation(); // หยุดไม่ให้ event click ของแถวทำงาน
    setAnchorEl(event.currentTarget);
    setCurrentMenuId(id);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentMenuId(null);
  };

  const handleRowClick = (id: string) => {
    // เมื่อคลิกที่แถว ให้ไปที่หน้า Edit ของรายการนั้นๆ
    console.log(`Navigating to edit page for ID: ${id}`);
    // router.push(`/settings/oee/${id}`); // ยกเลิก comment บรรทัดนี้เมื่อต้องการใช้งานจริง
  };

  const visibleRows = useMemo(
    () => stableSort(oeeSettings, getComparator(order, orderBy)),
    [oeeSettings, order, orderBy]
  );

  const handleEdit = () => {
    if (currentMenuId) {
      // นำทางไปยังหน้า setting ของ oee ตาม ID ที่เลือก
      router.push(`/settings/oee/${currentMenuId}`);
    }
    handleMenuClose(); // ปิดเมนูหลังจากคลิก
  };

  return (
    <Box className="min-h-screen bg-gray-50">
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
          mb: 4,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <IconButton
            onClick={() => router.push("/dashboard")}
            color="inherit"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700 }}
          >
            OEE Settings
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, display: { xs: "none", sm: "block" } }}
            >
              Welcome, {user?.username}
            </Typography>
            <IconButton onClick={logout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box className="p-4 md:p-6 lg:p-8">
        <Paper elevation={0} className="border border-gray-200 rounded-xl">
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              p: 2,
              gap: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              OEE Settings List
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search OEE Code, M/C Code"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", sm: 300 } }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
              <Button variant="contained" onClick={handleSearch}>
                Search
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<ResetIcon />}
              >
                Reset
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  {/* ลบ TableCell ของ Checkbox ออก */}
                  {headCells.map((headCell) => (
                    <TableCell
                      key={headCell.id}
                      sortDirection={orderBy === headCell.id ? order : false}
                      sx={{ fontWeight: "bold", color: "text.secondary" }}
                    >
                      <TableSortLabel
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : "asc"}
                        onClick={() => handleRequestSort(headCell.id)}
                      >
                        {headCell.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", color: "text.secondary" }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress sx={{ my: 4 }} />
                    </TableCell>
                  </TableRow>
                ) : visibleRows.length > 0 ? (
                  visibleRows.map((row) => (
                    <TableRow
                      hover
                      onClick={() => handleRowClick(row.id)}
                      key={row.id}
                      sx={{ cursor: "pointer" }}
                    >
                      {/* ลบ TableCell ของ Checkbox ออก */}
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.mcCode}</TableCell>
                      <TableCell>{row.id}</TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleMenuOpen(e, row.id)}>
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography sx={{ my: 4 }} color="text.secondary">
                        No results found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalRows}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
