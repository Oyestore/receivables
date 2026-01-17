import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Phone,
  Send,
  Refresh,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface OTPVerificationProps {
  mobile?: string;
  onComplete: (otp: string) => void;
  onVerified?: (success: boolean) => void;
  onBack?: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = (props) => {
  const { mobile, onComplete, onVerified, onBack } = props;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (newOtp.every(digit => digit !== '')) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp);
      
      // Focus the next empty input
      const nextEmptyIndex = newOtp.findIndex(digit => digit === '');
      if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
        inputRefs.current[nextEmptyIndex]?.focus();
      }
      
      // Auto-submit if complete
      if (newOtp.every(digit => digit !== '')) {
        handleSubmit(newOtp.join(''));
      }
    }
  };

  const handleSubmit = async (otpCode: string) => {
    if (!mobile) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile,
          otp: otpCode
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('OTP verified successfully!');
        const otpString = otp.join('');
        setTimeout(() => {
          if (onComplete) {
            onComplete(otpString);
          }
          if (onVerified) {
            onVerified(true);
          }
        }, 1000);
      } else {
        setError(data.message || 'Invalid OTP');
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
      console.error('OTP verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!mobile || otpTimer > 0 || resendCount >= 3) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        setOtpTimer(60); // 60 seconds cooldown
        setResendCount(resendCount + 1);
        setSuccess('OTP resent successfully!');
        
        // Clear existing OTP
        setOtp(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
      console.error('Resend OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Phone sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Verify Your Mobile Number
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We've sent a 6-digit OTP to {mobile || 'your mobile number'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 3, justifyContent: 'center' }}>
          {otp.map((digit, index) => (
            <TextField
              key={index}
              inputRef={(el) => (inputRefs.current[index] = el)}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              variant="outlined"
              inputProps={{
                maxLength: 1,
                style: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' },
                autoComplete: 'off',
              }}
              sx={{ width: 50 }}
              disabled={loading}
            />
          ))}
        </Box>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          {onBack && (
            <Button
              variant="outlined"
              onClick={onBack}
              disabled={loading}
              startIcon={<Phone />}
            >
              Back
            </Button>
          )}

          <Button
            variant="text"
            onClick={handleResend}
            disabled={loading || otpTimer > 0 || resendCount >= 3}
            startIcon={<Refresh />}
            sx={{ ml: 'auto' }}
          >
            {otpTimer > 0 ? `Resend (${otpTimer}s)` : 'Resend OTP'}
          </Button>
        </Box>

        {resendCount >= 2 && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Maximum resend attempts reached. Please try again later.
          </Typography>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </motion.div>
    </Box>
  );
};

export default OTPVerification;
