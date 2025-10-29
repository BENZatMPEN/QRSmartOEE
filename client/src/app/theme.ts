import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1565c0', // Dark blue for headers and primary actions
      light: '#42a5f5',
      dark: '#0d47a1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4caf50', // Green for success states and status indicators
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336', // Red for errors and delete actions
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800', // Orange for warnings
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3', // Blue for info
      light: '#64b5f6',
      dark: '#1976d2',
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      800: '#1565c0',
    },
    background: {
      default: '#f8f9fa', // Light grey background
      paper: '#ffffff', // White for cards and panels
    },
    text: {
      primary: '#212529', // Dark text
      secondary: '#6c757d', // Medium grey text
    },
    grey: {
      50: '#f8f9fa',
      100: '#f1f3f4',
      200: '#e9ecef',
      300: '#dee2e6',
      400: '#ced4da',
      500: '#adb5bd',
      600: '#6c757d',
      700: '#495057',
      800: '#343a40',
      900: '#212529',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#212529',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      color: '#212529',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#212529',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#212529',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#212529',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#212529',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#495057',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#6c757d',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#212529',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #e9ecef',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: 12,
          border: '1px solid #e9ecef',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#dee2e6',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: '#1565c0',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1565c0',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#6c757d',
            '&.Mui-focused': {
              color: '#1565c0',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            backgroundColor: '#1565c0',
            color: '#ffffff',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: '#4caf50',
            color: '#ffffff',
          },
          '&.MuiChip-colorError': {
            backgroundColor: '#f44336',
            color: '#ffffff',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: '#ff9800',
            color: '#ffffff',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e9ecef',
        },
        elevation1: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        },
        elevation3: {
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.04)',
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: '#e9ecef',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
  },
});

