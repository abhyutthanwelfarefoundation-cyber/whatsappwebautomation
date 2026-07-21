import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = searchParams.get('token');
  const userId = searchParams.get('uid');
  const isForced = searchParams.get('forced') === 'true';
  const isTokenFlow = Boolean(token && userId);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const newPassword = watch('newPassword');

  const onSubmit = async (values) => {
    setError('');
    setSubmitting(true);
    try {
      if (isTokenFlow) {
        await axiosClient.post('/auth/reset-password', {
          userId: Number(userId),
          token,
          newPassword: values.newPassword,
        });
        navigate('/login');
      } else {
        await axiosClient.post('/auth/change-password', {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isTokenFlow && !isForced) {
    return (
      <Box display="flex" minHeight="100vh" alignItems="center" justifyContent="center">
        <Alert severity="error">This reset link is invalid. Please request a new one.</Alert>
      </Box>
    );
  }

  if (isForced && !user) {
    navigate('/login');
    return null;
  }

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
          {isForced ? 'Set a new password to continue' : 'Set a new password'}
        </Typography>
        {isForced && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            Your account requires a password change before you can continue.
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {isForced && (
            <TextField
              label="Current password"
              type="password"
              fullWidth
              margin="normal"
              autoComplete="current-password"
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
              {...register('currentPassword', { required: 'Current password is required' })}
            />
          )}
          <TextField
            label="New password"
            type="password"
            fullWidth
            margin="normal"
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message}
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
          />
          <TextField
            label="Confirm new password"
            type="password"
            fullWidth
            margin="normal"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              validate: (value) => value === newPassword || 'Passwords do not match',
            })}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ mt: 1 }}
          >
            {submitting ? 'Saving…' : 'Save new password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}