import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '', rememberMe: false } });

  const onSubmit = async (values) => {
    setServerError('');
    setSubmitting(true);
    try {
      const user = await login(values.email, values.password, values.rememberMe);
      if (user.mustChangePassword) {
        navigate('/reset-password?forced=true');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Unable to log in. Please check your credentials.'
      );
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
          Publisher Operations Portal
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Sign in with your company account
        </Typography>

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            autoComplete="username"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />
          <FormControlLabel
            control={<Checkbox {...register('rememberMe')} />}
            label="Remember me"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ mt: 1 }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
          <Box mt={2} textAlign="center">
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot password?
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
