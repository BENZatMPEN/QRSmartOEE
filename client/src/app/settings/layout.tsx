'use client';

import { ProtectedRoute } from '../contexts/AuthContext';
import { Container, Box } from '@mui/material';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {children}
        </Container>
      </Box>
    </ProtectedRoute>
  );
}


