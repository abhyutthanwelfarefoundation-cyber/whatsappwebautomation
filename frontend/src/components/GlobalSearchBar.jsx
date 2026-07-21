import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { globalSearch } from '../api/search';

const DEBOUNCE_MS = 350;

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const runSearch = useCallback(async (value) => {
    if (!value.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await globalSearch(value.trim());
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasAnyResults =
    results &&
    (results.customers.length ||
      results.orders.length ||
      results.books.length ||
      results.messages.length);

  return (
    <Box ref={containerRef} sx={{ position: 'relative', maxWidth: 480 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="Search customers, invoices, books, mobile numbers…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {open && query.trim() && (
        <Paper sx={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 20, maxHeight: 420, overflowY: 'auto' }} elevation={4}>
          {loading && (
            <Box p={2} display="flex" justifyContent="center">
              <CircularProgress size={20} />
            </Box>
          )}

          {!loading && !hasAnyResults && (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary">
                No matches found.
              </Typography>
            </Box>
          )}

          {!loading && results?.customers?.length > 0 && (
            <>
              <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block' }} color="text.secondary">
                CUSTOMERS
              </Typography>
              {results.customers.map((c) => (
                <MenuItem
                  key={`c-${c.CustomerId}`}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/customers/${c.CustomerId}`);
                  }}
                >
                  {c.Name} · {c.Mobile}
                </MenuItem>
              ))}
            </>
          )}

          {!loading && results?.orders?.length > 0 && (
            <>
              <Divider />
              <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block' }} color="text.secondary">
                ORDERS
              </Typography>
              {results.orders.map((o) => (
                <MenuItem
                  key={`o-${o.OrderId}`}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/orders/${o.OrderId}`);
                  }}
                >
                  {o.InvoiceNumber || o.Pub5OrderNumber} · {o.CustomerName} · {o.Status}
                </MenuItem>
              ))}
            </>
          )}

          {!loading && results?.books?.length > 0 && (
            <>
              <Divider />
              <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block' }} color="text.secondary">
                BOOKS
              </Typography>
              {results.books.map((b) => (
                <MenuItem key={`b-${b.BookId}`} disabled>
                  {b.Title} {b.Author ? `· ${b.Author}` : ''}
                </MenuItem>
              ))}
            </>
          )}

          {!loading && results?.messages?.length > 0 && (
            <>
              <Divider />
              <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block' }} color="text.secondary">
                MESSAGES
              </Typography>
              {results.messages.map((m) => (
                <MenuItem
                  key={`m-${m.MessageId}`}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/customers/${m.CustomerId}`);
                  }}
                >
                  {m.CustomerName}: {m.Content?.slice(0, 60)}
                </MenuItem>
              ))}
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
