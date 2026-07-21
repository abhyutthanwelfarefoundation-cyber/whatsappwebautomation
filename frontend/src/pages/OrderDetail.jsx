import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppLayout from '../components/AppLayout';
import { getOrderDetail, updateOrderStatus } from '../api/orders';
import { uploadAttachment, sendInvoiceTemplate } from '../api/whatsapp';
import { useAuth } from '../context/AuthContext';

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [dispatchDraft, setDispatchDraft] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceReference, setInvoiceReference] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateResult, setTemplateResult] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrderDetail(orderId);
      setOrder(data);
      setStatusDraft(data.Status);
      setDispatchDraft(data.DispatchStatus);
      setInvoiceReference(data.InvoiceNumber || data.Pub5OrderNumber || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrderStatus(orderId, { status: statusDraft, dispatchStatus: dispatchDraft });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvoiceTemplate = async () => {
    if (!invoiceFile || !invoiceReference.trim()) return;
    setSendingTemplate(true);
    setTemplateResult('');
    try {
      const attachment = await uploadAttachment(invoiceFile, { orderId, fileType: 'Invoice' });
      await sendInvoiceTemplate({
        customerId: order.CustomerId,
        attachmentId: attachment.AttachmentId,
        invoiceReference: invoiceReference.trim(),
      });
      setTemplateResult('success');
      setInvoiceFile(null);
      await load();
    } catch (err) {
      setTemplateResult(err.response?.data?.message || 'Failed to send invoice');
    } finally {
      setSendingTemplate(false);
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

  if (error || !order) {
    return (
      <AppLayout>
        <Typography color="error">{error || 'Order not found'}</Typography>
      </AppLayout>
    );
  }

  const canManage = hasPermission('orders.manage');

  return (
    <AppLayout>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')} sx={{ mb: 2 }}>
        Back to Orders
      </Button>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {order.InvoiceNumber || order.Pub5OrderNumber}
            </Typography>
            <Typography variant="body2"><strong>Customer:</strong> {order.CustomerName}</Typography>
            <Typography variant="body2"><strong>Mobile:</strong> {order.Mobile}</Typography>
            <Typography variant="body2"><strong>Challan #:</strong> {order.ChallanNumber || '—'}</Typography>
            <Typography variant="body2"><strong>Amount:</strong> ₹{Number(order.Amount).toLocaleString('en-IN')}</Typography>
            <Typography variant="body2"><strong>Order Date:</strong> {new Date(order.OrderDate).toLocaleDateString()}</Typography>

            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>Update status</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={!canManage}>
                <InputLabel>Order Status</InputLabel>
                <Select label="Order Status" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                  {['Pending', 'Invoiced', 'Dispatched', 'Completed', 'Cancelled'].map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={!canManage}>
                <InputLabel>Dispatch Status</InputLabel>
                <Select label="Dispatch Status" value={dispatchDraft} onChange={(e) => setDispatchDraft(e.target.value)}>
                  {['Pending', 'Packed', 'Dispatched', 'Delivered'].map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {canManage ? (
                <Button variant="contained" onClick={handleSave} disabled={saving} fullWidth>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              ) : (
                <Alert severity="info">You don't have permission to update orders.</Alert>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Books in this order
            </Typography>
            {order.items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No line items recorded.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Line Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.OrderItemId}>
                      <TableCell>{item.Title}</TableCell>
                      <TableCell align="right">{item.Quantity}</TableCell>
                      <TableCell align="right">₹{Number(item.UnitPrice).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">₹{Number(item.LineTotal).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Attachments
            </Typography>
            {order.attachments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No invoice/challan PDFs uploaded to this order yet.
              </Typography>
            ) : (
              order.attachments.map((a) => (
                <Typography variant="body2" key={a.AttachmentId}>
                  {a.FileType}: {a.FileName}
                </Typography>
              ))
            )}

            {hasPermission('whatsapp.send') && (
              <Box mt={2} pt={2} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Send invoice via WhatsApp
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Uses the approved "invoices" template, so it reaches the
                  customer even if they haven't messaged us in the last 24
                  hours.
                </Typography>

                <TextField
                  size="small"
                  fullWidth
                  label="Invoice / bill reference"
                  value={invoiceReference}
                  onChange={(e) => setInvoiceReference(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <Button component="label" variant="outlined" size="small" sx={{ mb: 1.5 }}>
                  {invoiceFile ? invoiceFile.name : 'Choose PDF file'}
                  <input
                    type="file"
                    hidden
                    accept="application/pdf"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  />
                </Button>

                {templateResult === 'success' && (
                  <Alert severity="success" sx={{ mb: 1.5 }}>
                    Invoice sent via WhatsApp template.
                  </Alert>
                )}
                {templateResult && templateResult !== 'success' && (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {templateResult}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<WhatsAppIcon />}
                  fullWidth
                  disabled={!invoiceFile || !invoiceReference.trim() || sendingTemplate}
                  onClick={handleSendInvoiceTemplate}
                >
                  {sendingTemplate ? 'Sending…' : 'Send invoice via WhatsApp'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
}