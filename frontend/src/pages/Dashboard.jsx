import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getInvoicesSentList } from '../api/dashboard';
import Chip from '@mui/material/Chip';

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-2px)' } : {},
      }}
    >
      <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}.light`, color: `${color}.dark`, flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Paper>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoicesDialogOpen, setInvoicesDialogOpen] = useState(false);
  const [invoicesList, setInvoicesList] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDashboardStats();
        setStats(data.stats);
        setActivity(data.recentActivity);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openInvoicesDialog = async () => {
    setInvoicesDialogOpen(true);
    setInvoicesLoading(true);
    try {
      const list = await getInvoicesSentList();
      setInvoicesList(list);
    } finally {
      setInvoicesLoading(false);
    }
  };

  return (
    <AppLayout>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Welcome back, {user?.fullName?.split(' ')[0]}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Here's what's happening across the business today.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<PeopleIcon />} label="Total Customers" value={stats.TotalCustomers} color="primary" onClick={() => navigate('/customers')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<ReceiptLongIcon />} label="Orders Today" value={stats.OrdersToday} color="info" onClick={() => navigate('/orders')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<PendingActionsIcon />} label="Pending Orders" value={stats.PendingOrders} color="warning" onClick={() => navigate('/orders')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<LocalShippingIcon />} label="Pending Dispatch" value={stats.PendingDispatch} color="warning" onClick={() => navigate('/orders')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<WhatsAppIcon />} label="Messages Sent Today" value={stats.MessagesSentToday} color="success" onClick={() => navigate('/whatsapp')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<DoneAllIcon />} label="Messages Delivered" value={stats.MessagesDelivered} color="success" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<ErrorOutlineIcon />} label="Failed Messages" value={stats.MessagesFailed} color="error" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<CurrencyRupeeIcon />} label="Total Outstanding" value={`₹${Number(stats.TotalOutstanding).toLocaleString('en-IN')}`} color="primary" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard icon={<ReceiptLongIcon />} label="Invoices Sent (WhatsApp)" value={stats.InvoicesSentCount} color="info" onClick={openInvoicesDialog} />
            </Grid>
          </Grid>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Recent Activity</Typography>
            {activity.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No activity recorded yet.</Typography>
            ) : (
              activity.map((a, i) => (
                <Box key={i} display="flex" justifyContent="space-between" py={0.75} sx={{ borderBottom: i < activity.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Typography variant="body2"><strong>{a.FullName || 'System'}</strong> — {a.EventType.replace(/_/g, ' ').toLowerCase()}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(a.CreatedAt).toLocaleString()}</Typography>
                </Box>
              ))
            )}
          </Paper>
        </>
      )}

      <Dialog open={invoicesDialogOpen} onClose={() => setInvoicesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invoices Sent via WhatsApp</DialogTitle>
        <DialogContent>
          {invoicesLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
          ) : invoicesList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No invoices sent yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoicesList.map((r) => (
                  <TableRow key={r.OrderId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${r.OrderId}`)}>
                    <TableCell>{r.CustomerName} · {r.Mobile}</TableCell>
                    <TableCell>{r.InvoiceNumber || r.Pub5OrderNumber}</TableCell>
                    <TableCell>{new Date(r.SentAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.DeliveryStatus}
                        size="small"
                        color={
                          r.DeliveryStatus === 'Read' ? 'success' :
                          r.DeliveryStatus === 'Delivered' ? 'primary' :
                          r.DeliveryStatus === 'Failed' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoicesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}