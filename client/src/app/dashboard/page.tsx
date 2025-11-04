"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  CardActionArea,
  Stack,
  Divider,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { api_oee } from "@/app/lib/axios";
import { OEEItem } from "@/app/types/api.dashboard";
import { fNumber } from "@/app/lib/utils/formatNumber";
import useWebSocket from "@/app/contexts/WebSocketContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface OEEData {
  id: string;
  name: string;
  lotNumber: string | null;
  startTime: string;
  endTime: string;
  oee: number;
  actual: number;
  plan: number;
  target: number;
  status: "running" | "breakdown" | "ended";
}

const transformApiData = (apiItem: OEEItem): OEEData => {
  const mapStatus = (batchStatus: string | null): OEEData["status"] => {
    if (!batchStatus) return "ended";
    switch (batchStatus.toLowerCase()) {
      case "running":
        return "running";
      case "breakdown":
        return "breakdown";
      case "ended":
        return "ended";
      default:
        return "ended";
    }
  };

  const formatTime = (isoDate: string | null): string => {
    if (!isoDate) return "N/A";
    return new Date(isoDate).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return {
    id: apiItem.id.toString(),
    name: `${apiItem.productionName} - ${apiItem.productName}`,
    lotNumber: apiItem.lotNumber,
    startTime: formatTime(apiItem.startDate),
    endTime: formatTime(apiItem.endDate),
    oee: apiItem.oeePercent,
    actual: apiItem.actual,
    plan: apiItem.plan || 0,
    target: apiItem.target,
    status: mapStatus(apiItem.batchStatus),
  };
};

export default function App() {
  const { socket } = useWebSocket();
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();

  const [oeeData, setOeeData] = useState<OEEData[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const url = `/oees/status?userId=${user?.id}&siteId=1`;
        const response = await api_oee.get(url);

        if (response.data && Array.isArray(response.data.oees)) {
          const transformedData = response.data.oees
            .map(transformApiData)
            .sort((a: OEEData, b: OEEData) => a.name.localeCompare(b.name));
          setOeeData(transformedData);
        } else {
          console.error("Invalid data structure from API:", response.data);
          setOeeData([]);
        }
      } catch (error) {
        console.error("Error fetching OEE data:", error);
      }
    };
    if (isAuthenticated && user?.id) {
      fetchInitialData();
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const siteId = 1;
    const eventName = `dashboard_${siteId}_${user?.id}`;

    const handleDashboardUpdate = (stats: any) => {
      if (stats && Array.isArray(stats.oees)) {
        const transformedData = stats.oees
          .map(transformApiData)
          .sort((a: OEEData, b: OEEData) => a.name.localeCompare(b.name));

        setOeeData(transformedData);
      } else {
        console.warn(
          "Received WebSocket data with unexpected structure:",
          stats
        );
      }
    };

    socket.on(eventName, handleDashboardUpdate);

    return () => {
      socket.off(eventName, handleDashboardUpdate);
    };
  }, [socket]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "success";
      case "breakdown":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return "Running";
      case "breakdown":
        return "breakdown";
      default:
        return "ended";
    }
  };

  const getOEEColor = (oee: number) => {
    if (oee >= 80) return "success";
    if (oee >= 60) return "warning";
    return "error";
  };

  const handleOeeCardClick = (oeeId: string) => {
    router.push(`/dashboard/oee/${oeeId}`);
  };

  const OEECard = ({ data }: { data: OEEData }) => (
    <Card
      sx={{
        borderRadius: 4,
        transition: "all 0.3s ease-in-out",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <CardActionArea
        onClick={() => handleOeeCardClick(data.id)}
        sx={{ p: 2.5 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={2}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              lineHeight: 1.3,
              display: "-webkit-box",
              overflow: "hidden",
              textOverflow: "ellipsis",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {data.name}
          </Typography>
          <Chip
            label={getStatusText(data.status)}
            color={getStatusColor(data.status)}
            size="small"
            sx={{
              fontWeight: 600,
              ml: 1,
              mt: 0.5,
              minWidth: "90px",
              textAlign: "center",
            }}
          />
        </Stack>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ color: "text.secondary", mb: 3 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Lot: <strong>{data.lotNumber}</strong>
          </Typography>
          <Typography variant="caption">
            {data.startTime} - {data.endTime}
          </Typography>
        </Stack>
        <Box
          sx={{
            bgcolor: `${getOEEColor(data.oee)}.main`,
            color: "white",
            borderRadius: 3,
            p: 2,
            mb: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            OEE
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            {data.oee.toFixed(1)}
            <span style={{ fontSize: "1.2rem" }}>%</span>
          </Typography>
        </Box>
        <Stack
          direction="row"
          justifyContent="space-around"
          divider={<Divider orientation="vertical" flexItem />}
          spacing={2}
        >
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Actual
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {fNumber(data.actual)}
              </Typography>
            </Stack>
          </Stack>
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Plan
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {fNumber(data.plan)}
              </Typography>
            </Stack>
          </Stack>
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Target
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {fNumber(data.target)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: 3 }}>
          <Typography
            variant="h5"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700 }}
          >
            OEE Dashboard
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" sx={{ color: "white" }}>
              Welcome, {user?.username}
            </Typography>
            <IconButton
              onClick={() => router.push("/settings")}
              color="inherit"
              sx={{ p: 1 }}
            >
              <SettingsIcon />
            </IconButton>
            <IconButton onClick={logout} color="inherit" sx={{ p: 1 }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 3, pb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
            mt: 3,
          }}
        >
          {oeeData.map((data) => (
            <OEECard key={data.id} data={data} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
