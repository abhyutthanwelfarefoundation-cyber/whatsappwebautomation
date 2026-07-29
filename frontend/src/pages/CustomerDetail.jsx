import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import AppLayout from "../components/AppLayout";
import { getCustomerProfile } from "../api/customers";
import { useAuth } from "../context/AuthContext";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import { createOrder } from '../api/orders';

export default function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ invoiceNumber: '', amount: '', challanNumber: '' });
  const [savingOrder, setSavingOrder] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getCustomerProfile(customerId);
        setProfile(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load customer");
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId]);

  const handleAddOrder = async () => {
    setSavingOrder(true);
    try {
      await createOrder({
        customerId: Number(customerId),
        invoiceNumber: newOrder.invoiceNumber,
        challanNumber: newOrder.challanNumber,
        amount: Number(newOrder.amount) || 0,
      });
      setAddOrderOpen(false);
      setNewOrder({ invoiceNumber: '', amount: '', challanNumber: '' });
      const data = await getCustomerProfile(customerId);
      setProfile(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add order');
    } finally {
      setSavingOrder(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <Typography color="error">{error || "Customer not found"}</Typography>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/customers")}>
          Back to Customers
        </Button>
        {hasPermission("whatsapp.view") && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<WhatsAppIcon />}
            onClick={() => navigate(`/whatsapp?customerId=${customerId}`)}
          >
            Message on WhatsApp
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              {profile.Name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {profile.Pub5CustomerCode}
            </Typography>
            <Box mt={2}>
              <Typography variant="body2">
                <strong>Mobile:</strong> {profile.Mobile}
              </Typography>
              {profile.AltMobile && (
                <Typography variant="body2">
                  <strong>Alt Mobile:</strong> {profile.AltMobile}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Email:</strong> {profile.Email || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>Address:</strong> {profile.Address || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>City/State:</strong> {profile.City || "—"}, {profile.State || "—"}
              </Typography>
            </Box>
            <Box mt={2}>
              {profile.OutstandingBalance > 0 ? (
                <Chip
                  label={`Outstanding: ₹${Number(profile.OutstandingBalance).toLocaleString("en-IN")}`}
                  color="warning"
                />
              ) : (
                <Chip label="No outstanding balance" color="success" variant="outlined" />
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                Order History
              </Typography>
              {hasPermission('orders.manage') && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOrderOpen(true)}>
                  Add Order
                </Button>
              )}
            </Box>
            {profile.orderHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No orders yet.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 500 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Dispatch</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profile.orderHistory.map((o) => (
                      <TableRow
                        key={o.OrderId}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`/orders/${o.OrderId}`)}
                      >
                        <TableCell>{o.InvoiceNumber || o.Pub5OrderNumber}</TableCell>
                        <TableCell>₹{Number(o.Amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell>{o.Status}</TableCell>
                        <TableCell>{o.DispatchStatus}</TableCell>
                        <TableCell>{new Date(o.OrderDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Books Purchased
            </Typography>
            {profile.booksPurchased.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No purchase history yet.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 450 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Author</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Total Spent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profile.booksPurchased.map((b) => (
                      <TableRow key={b.BookId}>
                        <TableCell>{b.Title}</TableCell>
                        <TableCell>{b.Author || "—"}</TableCell>
                        <TableCell align="right">{b.TotalQuantity}</TableCell>
                        <TableCell align="right">₹{Number(b.TotalSpent).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              WhatsApp History
            </Typography>
            {profile.whatsAppHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No messages yet — the WhatsApp module arrives in Phase 3.
              </Typography>
            ) : (
              profile.whatsAppHistory.map((m) => (
                <Box key={m.MessageId} mb={1}>
                  <Typography variant="body2">
                    <strong>{m.Direction === "Outgoing" ? "Sent" : "Received"}:</strong>{" "}
                    {m.Content || m.FileName || `[${m.MessageType}]`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(m.CreatedAt).toLocaleString()} · {m.Status}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={addOrderOpen} onClose={() => setAddOrderOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Order for {profile.Name}</DialogTitle>
        <DialogContent>
          <TextField
            label="Invoice Number"
            fullWidth
            size="small"
            sx={{ mb: 2, mt: 1 }}
            value={newOrder.invoiceNumber}
            onChange={(e) => setNewOrder({ ...newOrder, invoiceNumber: e.target.value })}
          />
          <TextField
            label="Challan Number"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={newOrder.challanNumber}
            onChange={(e) => setNewOrder({ ...newOrder, challanNumber: e.target.value })}
          />
          <TextField
            label="Amount"
            type="number"
            fullWidth
            size="small"
            value={newOrder.amount}
            onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOrderOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddOrder} disabled={!newOrder.amount || savingOrder}>
            {savingOrder ? 'Saving…' : 'Add Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}