import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Tab,
  Tabs,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Google,
  Phone,
  Email,
  Visibility,
  VisibilityOff,
  ArrowBack,
  Send,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import OTPVerification from '../../components/auth/OTPVerification';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInWithSocial, sendOTP, isLoading, error, clearError } = useAuth();
  
  const [tabValue, setTabValue] = useState(0);
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    clearError();
    setOtpSent(false);
    setDevOtp('');
  };

  const handleSendOTP = async () => {
    if (!mobile) {
      return;
    }

    try {
      const result = await sendOTP(mobile);
      
      if (result.success) {
        setOtpSent(true);
        setOtpSentMessage(result.message);
        
        // In development, show the OTP
        if (result.otp) {
          setDevOtp(result.otp);
        }
      }
    } catch (error) {
      console.error('Send OTP error:', error);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    const success = await signIn(mobile, otp);
    
    if (success) {
      navigate('/sme/dashboard');
    }
  };

  const handleSocialSignIn = (provider: string) => {
    signInWithSocial(provider);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For demo purposes, simulate email login
    // In production, this would call your email authentication API
    const mockSuccess = await signIn('+1234567890', '123456');
    
    if (mockSuccess) {
      navigate('/sme/dashboard');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%' }}
      >
        <Card elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Sign in to your SME Platform account
              </Typography>
            </Box>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert severity="error" sx={{ m: 2 }}>
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<Phone />} label="Quick Login" />
              <Tab icon={<Google />} label="Social Login" />
              <Tab icon={<Email />} label="Email" />
            </Tabs>

            {/* Tab Panels */}
            <TabPanel value={tabValue} index={0}>
              {/* Mobile OTP Login */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Enter your mobile number to receive a one-time password
                </Typography>
                
                <TextField
                  fullWidth
                  label="Mobile Number"
                  placeholder="+1234567890"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={otpSent}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone /></InputAdornment>,
                  }}
                />

                {!otpSent ? (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSendOTP}
                    disabled={!mobile || isLoading}
                    startIcon={<Send />}
                    sx={{ py: 1.5 }}
                  >
                    {isLoading ? <CircularProgress size={24} /> : 'Send OTP'}
                  </Button>
                ) : (
                  <Box>
                    <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
                      {otpSentMessage}
                    </Typography>
                    
                    {devOtp && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Development OTP: <strong>{devOtp}</strong>
                      </Alert>
                    )}
                    
                    <OTPVerification onComplete={handleOTPComplete} />
                  </Box>
                )}

                {otpSent && (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setOtpSent(false);
                      setDevOtp('');
                    }}
                    startIcon={<ArrowBack />}
                  >
                    Back to Mobile Number
                  </Button>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Social Login */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Choose your preferred social login provider
                </Typography>
                
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => handleSocialSignIn('google')}
                  startIcon={<Google />}
                  sx={{ py: 1.5 }}
                >
                  Continue with Google
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => handleSocialSignIn('microsoft')}
                  disabled // Not implemented yet
                  sx={{ py: 1.5 }}
                >
                  Continue with Microsoft
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => handleSocialSignIn('linkedin')}
                  disabled // Not implemented yet
                  sx={{ py: 1.5 }}
                >
                  Continue with LinkedIn
                </Button>

                <Alert severity="info">
                  Microsoft and LinkedIn login will be available in the next update
                </Alert>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {/* Email/Password Login */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Enter your email and password to sign in
                </Typography>
                
                <form onSubmit={handleEmailSignIn}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    margin="normal"
                    required
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    type="submit"
                    disabled={isLoading}
                    sx={{ py: 1.5, mt: 2 }}
                  >
                    {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                  </Button>
                </form>

                <Alert severity="info">
                  Email login is currently in demo mode. Use mobile OTP for full functionality.
                </Alert>
              </Box>
            </TabPanel>

            {/* Footer */}
            <Box sx={{ p: 2, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default SignIn;
