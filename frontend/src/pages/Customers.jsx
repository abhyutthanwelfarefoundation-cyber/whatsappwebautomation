import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AppLayout from '../components/AppLayout';
import { searchCustomers, importCustomers } from '../api/customers';
import { useAuth } from '../context/AuthContext';

export default function Customers() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [query, setQuery] = useState('');
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
      const data = await searchCustomers({ query, page: page + 1, pageSize });
      setRows(data.rows);
      setTotalCount(data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const result = await importCustomers(file);
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
        <Typography variant="h5" fontWeight={700}>Customers</Typography>
        {hasPermission('customers.manage') && (
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import from Excel'}
          </Button>
        )}
        <input type="file" hidden ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileSelected} />
      </Box>

      <TextField
        placeholder="Search by name, mobile, email, invoice, or order number…"
        fullWidth size="small" value={query}
        onChange={(e) => { setPage(0); setQuery(e.target.value); }}
        sx={{ mb: 2, maxWidth: 480 }}
      />

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>City / State</TableCell>
              <TableCell align="right">Outstanding Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No customers found.</Typography></TableCell></TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.CustomerId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${c.CustomerId}`)}>
                  <TableCell>{c.Name}</TableCell>
                  <TableCell>{c.Mobile}</TableCell>
                  <TableCell>{c.City || '—'}{c.State ? `, ${c.State}` : ''}</TableCell>
                  <TableCell align="right">
                    {c.OutstandingBalance > 0 ? (
                      <Chip label={`₹${Number(c.OutstandingBalance).toLocaleString('en-IN')}`} color="warning" size="small" />
                    ) : (
                      <Chip label="Clear" color="success" size="small" variant="outlined" />
                    )}
                  </TableCell>
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
                  {importResult.errors.map((e, i) => (
                    <Typography variant="body2" color="text.secondary" key={i}>Row {e.row}: {e.reason}</Typography>
                  ))}
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