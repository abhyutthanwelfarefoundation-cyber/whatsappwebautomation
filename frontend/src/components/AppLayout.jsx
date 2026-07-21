import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useAuth } from '../context/AuthContext';
import GlobalSearchBar from './GlobalSearchBar';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', permission: 'dashboard.view' },
  { label: 'Customers', to: '/customers', permission: 'customers.view' },
  { label: 'Orders', to: '/orders', permission: 'orders.view' },
  { label: 'WhatsApp', to: '/whatsapp', permission: 'whatsapp.view' },
];

export default function AppLayout({ children }) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box bgcolor="background.default" minHeight="100vh">
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ whiteSpace: 'nowrap' }}>
              Navbodh Prakashan
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navItems
              .filter((item) => hasPermission(item.permission))
              .map((item) => (
                <Button key={item.to} component={RouterLink} to={item.to} color="inherit">
                  {item.label}
                </Button>
              ))}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <GlobalSearchBar />
          </Box>
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            {user?.fullName} · {user?.role}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box p={4}>{children}</Box>
      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 2,
          color: 'text.secondary',
          fontSize: 13,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        Navbodh Prakashan — All Rights Reserved | Developed by Naman Jain
      </Box>
    </Box>
  );
} 
