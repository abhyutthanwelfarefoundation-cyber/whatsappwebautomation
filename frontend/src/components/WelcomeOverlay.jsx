import React, { useEffect } from 'react';
import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAuth } from '../context/AuthContext';

const AUTO_DISMISS_MS = 3200;

const fadeInBackdrop = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const cardPop = keyframes`
  0% { opacity: 0; transform: scale(0.85) translateY(12px); }
  60% { opacity: 1; transform: scale(1.03) translateY(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const lineSlideUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const wave = keyframes`
  0%, 100% { transform: rotate(0deg); }
  15% { transform: rotate(18deg); }
  30% { transform: rotate(-8deg); }
  45% { transform: rotate(18deg); }
  60% { transform: rotate(-4deg); }
  75% { transform: rotate(10deg); }
`;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeOverlay() {
  const { user, showWelcome, dismissWelcome } = useAuth();

  useEffect(() => {
    if (!showWelcome) return undefined;
    const timer = setTimeout(dismissWelcome, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [showWelcome, dismissWelcome]);

  if (!showWelcome || !user) return null;

  const firstName = user.fullName?.split(' ')[0] || user.fullName;

  return (
    <Box
      onClick={dismissWelcome}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background:
          'linear-gradient(-45deg, #0f1a30, #1a2b4c, #128c7e, #1a2b4c)',
        backgroundSize: '400% 400%',
        animation: `${fadeInBackdrop} 0.35s ease-out, ${gradientShift} 8s ease-in-out infinite`,
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          animation: `${cardPop} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`,
          px: 4,
        }}
      >
        <Typography
          component="span"
          sx={{
            display: 'inline-block',
            fontSize: { xs: 48, sm: 64 },
            animation: `${wave} 2.2s ease-in-out 0.4s`,
            transformOrigin: '70% 70%',
          }}
        >
          👋
        </Typography>

        <Typography
          variant="h4"
          sx={{
            color: 'white',
            fontWeight: 600,
            mt: 2,
            opacity: 0,
            animation: `${lineSlideUp} 0.5s ease-out 0.5s forwards`,
          }}
        >
          {getGreeting()},
        </Typography>

        <Typography
          variant="h2"
          sx={{
            color: 'white',
            fontWeight: 800,
            letterSpacing: 0.5,
            mt: 0.5,
            opacity: 0,
            animation: `${lineSlideUp} 0.5s ease-out 0.7s forwards`,
            fontSize: { xs: 36, sm: 56 },
          }}
        >
          Welcome back, Naman Sir!
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.75)',
            mt: 2,
            opacity: 0,
            animation: `${lineSlideUp} 0.5s ease-out 0.9s forwards`,
          }}
        >
          {user.role} · Publisher Operations Portal
        </Typography>
      </Box>
    </Box>
  );
}