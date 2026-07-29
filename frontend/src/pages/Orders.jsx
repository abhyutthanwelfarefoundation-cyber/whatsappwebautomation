import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AppLayout from '../components/AppLayout';
import { listOrders, importOrders } from '../api/orders';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = { Pending: 'default', Invoiced: 'info', Dispatched: 'primary', Completed: 'success', Cancelled: 'error' };
const DISPATCH_COLORS = { Pending: 'default', Packed: 'info', Dispatched: 'primary', Delivered: 'success' };

export default function Orders() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [status, setStatus] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrders({ status: status || undefined, dispatchStatus: dispatchStatus || undefined, page: page + 1, pageSize });
      setRows(data.rows);
      setTotalCount(data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [status, dispatchStatus, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const result = await importOrders(file);
      setImportResult(result);
      fetchData();
    } catch (err) {
      setImportError(err.response?.data?.message || 'Import failed. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Orders</Typography>
        {hasPermission('orders.manage') && (
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import from Excel'}
          </Button>
        )}
        <input type="file" hidden ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileSelected} />
      </Box>

      <Box display="flex" gap={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}>
            <MenuItem value="">All</MenuItem>
            {['Pending', 'Invoiced', 'Dispatched', 'Completed', 'Cancelled'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Dispatch</InputLabel>
          <Select label="Dispatch" value={dispatchStatus} onChange={(e) => { setPage(0); setDispatchStatus(e.target.value); }}>
            <MenuItem value="">All</MenuItem>
            {['Pending', 'Packed', 'Dispatched', 'Delivered'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Invoice / Order #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Dispatch</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No orders found.</Typography></TableCell></TableRow>
            ) : (
              rows.map((o) => (
                <TableRow key={o.OrderId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.OrderId}`)}>
                  <TableCell>{o.InvoiceNumber || o.Pub5OrderNumber}</TableCell>
                  <TableCell>{o.CustomerName} · {o.Mobile}</TableCell>
                  <TableCell align="right">₹{Number(o.Amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell><Chip label={o.Status} size="small" color={STATUS_COLORS[o.Status] || 'default'} /></TableCell>
                  <TableCell><Chip label={o.DispatchStatus} size="small" color={DISPATCH_COLORS[o.DispatchStatus] || 'default'} /></TableCell>
                  <TableCell>{new Date(o.OrderDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={totalCount} page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>

      <Dialog open={Boolean(importResult) || Boolean(importError)} onClose={() => { setImportResult(null); setImportError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Import Result</DialogTitle>
        <DialogContent>
          {importError && <Alert severity="error">{importError}</Alert>}
          {importResult && (
            <>
              <Alert severity={importResult.errors.length > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                {importResult.totalRows} rows processed — {importResult.inserted} added, {importResult.updated} updated
                {importResult.errors.length > 0 ? `, ${importResult.errors.length} skipped` : ''}.
              </Alert>
              {importResult.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Rows skipped:</Typography>
                  {importResult.errors.map((e, i) => <Typography variant="body2" color="text.secondary" key={i}>Row {e.row}: {e.reason}</Typography>)}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportResult(null); setImportError(''); }}>Close</Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}