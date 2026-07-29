import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box bgcolor="background.default" minHeight="100vh">
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ whiteSpace: 'nowrap' }}>
           Navbodh Prakashan
          </Typography>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {navItems
              .filter((item) => hasPermission(item.permission))
              .map((item) => (
                <Button key={item.to} component={RouterLink} to={item.to} color="inherit">
                  {item.label}
                </Button>
              ))}
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
            <GlobalSearchBar />
          </Box>

          <Typography variant="body2" sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
            {user?.fullName} · {user?.role}
          </Typography>
          <Button color="inherit" onClick={handleLogout} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            Logout
          </Button>
        </Toolbar>

        <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
          <Box sx={{ width: 240, p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              {user?.fullName} · {user?.role}
            </Typography>
            <List>
              {navItems
                .filter((item) => hasPermission(item.permission))
                .map((item) => (
                  <ListItemButton
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </List>
          </Box>
        </Drawer>
      </AppBar>
      <Box p={{ xs: 2, sm: 3, md: 4 }}>{children}</Box>
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