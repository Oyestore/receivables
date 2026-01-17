import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Divider,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Refresh as RefreshIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
  CreditCard as CreditCardIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { formatCurrency, formatDate } from '../utils/formatters';

const PaymentManagement = ({ organizationId }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data states
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentGateways, setPaymentGateways] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  
  // Dialog states
  const [gatewayDialogOpen, setGatewayDialogOpen] = useState(false);
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  
  // Pagination states
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionPageSize, setTransactionPageSize] = useState(10);
  const [transactionTotal, setTransactionTotal] = useState(0);
  
  // Filter states
  const [transactionFilters, setTransactionFilters] = useState({
    status: '',
    type: '',
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    fetchPaymentGateways();
    fetchPaymentMethods();
    fetchTransactions();
  }, [organizationId]);

  useEffect(() => {
    fetchTransactions();
  }, [transactionPage, transactionPageSize, transactionFilters]);

  const fetchPaymentGateways = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/payment/gateways`, {
        params: { organizationId }
      });
      setPaymentGateways(response.data);
    } catch (err) {
      setError('Failed to fetch payment gateways');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/payment/methods`, {
        params: { organizationId }
      });
      setPaymentMethods(response.data);
    } catch (err) {
      setError('Failed to fetch payment methods');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/payment/transactions`, {
        params: {
          organizationId,
          page: transactionPage + 1,
          limit: transactionPageSize,
          ...transactionFilters
        }
      });
      setTransactions(response.data.transactions);
      setTransactionTotal(response.data.total);
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGatewayDialogOpen = (gateway = null) => {
    setSelectedGateway(gateway);
    setGatewayDialogOpen(true);
  };

  const handleMethodDialogOpen = (method = null) => {
    setSelectedMethod(method);
    setMethodDialogOpen(true);
  };

  const handleGatewaySubmit = async (formData) => {
    setLoading(true);
    try {
      if (selectedGateway) {
        await axios.put(`${API_BASE_URL}/payment/gateways/${selectedGateway.id}`, formData);
        setSuccess('Payment gateway updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/payment/gateways`, {
          ...formData,
          organizationId
        });
        setSuccess('Payment gateway created successfully');
      }
      fetchPaymentGateways();
      setGatewayDialogOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payment gateway');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSubmit = async (formData) => {
    setLoading(true);
    try {
      if (selectedMethod) {
        await axios.put(`${API_BASE_URL}/payment/methods/${selectedMethod.id}`, formData);
        setSuccess('Payment method updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/payment/methods`, {
          ...formData,
          organizationId
        });
        setSuccess('Payment method created successfully');
      }
      fetchPaymentMethods();
      setMethodDialogOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payment method');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (transactionId) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/payment/transactions/${transactionId}/verify`);
      setSuccess('Payment verification initiated');
      fetchTransactions();
    } catch (err) {
      setError('Failed to verify payment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundPayment = async (transactionId, amount, reason) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/payment/transactions/${transactionId}/refund`, {
        amount,
        reason
      });
      setSuccess('Refund processed successfully');
      fetchTransactions();
    } catch (err) {
      setError('Failed to process refund');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters) => {
    setTransactionFilters(filters);
    setTransactionPage(0);
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  const getStatusChip = (status) => {
    let color = 'default';
    let icon = null;
    
    switch (status) {
      case 'completed':
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'failed':
        color = 'error';
        icon = <ErrorIcon fontSize="small" />;
        break;
      case 'processing':
        color = 'primary';
        icon = <CircularProgress size={14} />;
        break;
      case 'initiated':
        color = 'warning';
        break;
      case 'refunded':
        color = 'secondary';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        size="small" 
        color={color} 
        label={status.toUpperCase()} 
        icon={icon}
      />
    );
  };

  const transactionColumns = [
    { field: 'transactionReference', headerName: 'Reference', width: 180 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      renderCell: (params) => getStatusChip(params.value)
    },
    { 
      field: 'amount', 
      headerName: 'Amount', 
      width: 120,
      renderCell: (params) => formatCurrency(params.value, params.row.currency)
    },
    { field: 'customerName', headerName: 'Customer', width: 180 },
    { 
      field: 'createdAt', 
      headerName: 'Date', 
      width: 180,
      renderCell: (params) => formatDate(params.value)
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          {params.row.status === 'initiated' && (
            <Tooltip title="Verify Payment">
              <IconButton 
                size="small" 
                onClick={() => handleVerifyPayment(params.row.id)}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {params.row.status === 'completed' && (
            <Tooltip title="Refund">
              <IconButton 
                size="small" 
                onClick={() => handleRefundDialogOpen(params.row)}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  const gatewayColumns = [
    { field: 'name', headerName: 'Gateway Name', width: 180 },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 150 
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => getStatusChip(params.value)
    },
    { 
      field: 'isEnabled', 
      headerName: 'Enabled', 
      width: 100,
      renderCell: (params) => (
        params.value ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit Gateway">
            <IconButton 
              size="small" 
              onClick={() => handleGatewayDialogOpen(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Check Health">
            <IconButton 
              size="small" 
              onClick={() => handleCheckGatewayHealth(params.row.id)}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const methodColumns = [
    { field: 'name', headerName: 'Method Name', width: 180 },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 150,
      renderCell: (params) => {
        let icon = <PaymentIcon />;
        switch (params.value) {
          case 'credit_card':
          case 'debit_card':
            icon = <CreditCardIcon />;
            break;
          case 'upi':
          case 'wallet':
            icon = <PhoneAndroidIcon />;
            break;
          case 'netbanking':
          case 'bank_transfer':
            icon = <AccountBalanceIcon />;
            break;
        }
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {icon}
            <Typography sx={{ ml: 1 }}>
              {params.value.replace('_', ' ').toUpperCase()}
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'isEnabled', 
      headerName: 'Enabled', 
      width: 100,
      renderCell: (params) => (
        params.value ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />
      )
    },
    { 
      field: 'transactionFeePercentage', 
      headerName: 'Fee %', 
      width: 100,
      renderCell: (params) => `${params.value}%`
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit Method">
            <IconButton 
              size="small" 
              onClick={() => handleMethodDialogOpen(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Transactions
            </Typography>
            <Typography variant="h4">
              {transactionTotal}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Active Payment Methods
            </Typography>
            <Typography variant="h4">
              {paymentMethods.filter(m => m.isEnabled).length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Active Gateways
            </Typography>
            <Typography variant="h4">
              {paymentGateways.filter(g => g.isEnabled).length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Success Rate
            </Typography>
            <Typography variant="h4">
              {transactions.length > 0 
                ? `${Math.round((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100)}%` 
                : 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recent Transactions
          </Typography>
          <DataGrid
            rows={transactions.slice(0, 5)}
            columns={transactionColumns}
            disableRowSelectionOnClick
            autoHeight
            hideFooter
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="text" 
              endIcon={<HistoryIcon />}
              onClick={() => setTabValue(1)}
            >
              View All Transactions
            </Button>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderTransactions = () => (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Transactions
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={fetchTransactions}
        >
          Refresh
        </Button>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        {/* Transaction filters would go here */}
      </Box>
      
      <DataGrid
        rows={transactions}
        columns={transactionColumns}
        disableRowSelectionOnClick
        pagination
        paginationMode="server"
        rowCount={transactionTotal}
        pageSizeOptions={[5, 10, 25, 50]}
        page={transactionPage}
        pageSize={transactionPageSize}
        onPageChange={setTransactionPage}
        onPageSizeChange={setTransactionPageSize}
        loading={loading}
        autoHeight
      />
    </Paper>
  );

  const renderPaymentMethods = () => (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Payment Methods
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleMethodDialogOpen()}
        >
          Add Method
        </Button>
      </Box>
      
      <DataGrid
        rows={paymentMethods}
        columns={methodColumns}
        disableRowSelectionOnClick
        autoHeight
        loading={loading}
      />
    </Paper>
  );

  const renderPaymentGateways = () => (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'cen
(Content truncated due to size limit. Use line ranges to read in chunks)