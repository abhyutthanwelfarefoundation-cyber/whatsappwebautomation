import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import axiosClient from '../api/axiosClient';

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '' } });

  const onSubmit = async (values) => {
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/auth/forgot-password', values);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      display="flex"
      minHeight="100vh"
      alignItems="center"
      justifyContent="center"
      bgcolor="background.default"
    >
      <Paper elevation={3} sx={{ p: 5, width: 400 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={700}>
          Forgot password
        </Typography>

        {submitted ? (
          <Alert severity="success">
            If an account exists for that email, a reset link has been sent.
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter your account email and we'll send you a reset link.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email', { required: 'Email is required' })}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={submitting}
                sx={{ mt: 1 }}
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </Box>
          </>
        )}

        <Box mt={2} textAlign="center">
          <Link component={RouterLink} to="/login" variant="body2">
            Back to login
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}
