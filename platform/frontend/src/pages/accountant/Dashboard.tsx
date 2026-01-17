import React, { useState } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Tabs,
    Tab,
    TextField,
} from '@mui/material';
import {
    AccountBalance,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    Warning,
    CompareArrows,
    Download,
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AccountantDashboard: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const reconciliationData = [
        { month: 'Jul', matched: 95, unmatched: 5 },
        { month: 'Aug', matched: 92, unmatched: 8 },
        { month: 'Sep', matched: 97, unmatched: 3 },
        { month: 'Oct', matched: 94, unmatched: 6 },
        { month: 'Nov', matched: 98, unmatched: 2 },
    ];

    const recentTransactions = [
        { id: 1, date: '2025-11-24', invoice: 'INV-5678', amount: 250000, status: 'reconciled' },
        { id: 2, date: '2025-11-24', invoice: 'INV-1234', amount: 180000, status: 'pending' },
        { id: 3, date: '2025-11-23', invoice: 'INV-9876', amount: 95000, status: 'reconciled' },
        { id: 4, date: '2025-11-23', invoice: 'INV-4567', amount: 120000, status: 'mismatch' },
    ];

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Accounting Dashboard
                </Typography>
                <Box display="flex" gap={1}>
                    <Button variant="outlined" startIcon={<Download />}>
                        Export Report
                    </Button>
                    <Button variant="contained">Reconcile Now</Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <AccountBalance color="primary" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Total Receivables
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                ₹30.7L
                            </Typography>
                            <Box display="flex" alignItems="center" mt={1}>
                                <TrendingUp color="success" fontSize="small" />
                                <Typography variant="caption" color="success.main" ml={0.5}>
                                    +5.2% vs last month
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <CheckCircle color="success" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Reconciled
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                98%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                This month
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Warning color="warning" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Pending
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                12
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Invoices
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <CompareArrows color="primary" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Mismatches
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="error">
                                3
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Need attention
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Reconciliation Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={reconciliationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="matched" fill="#4caf50" name="Matched" />
                                <Bar dataKey="unmatched" fill="#f44336" name="Unmatched" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Payment Collection Rate
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={reconciliationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="matched" stroke="#2196f3" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Transactions */}
            <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Recent Transactions</Typography>
                    <TextField size="small" placeholder="Search..." />
                </Box>

                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab label="All" />
                    <Tab label="Reconciled" />
                    <Tab label="Pending" />
                    <Tab label="Mismatches" />
                </Tabs>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Invoice</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recentTransactions.map((txn) => (
                                <TableRow key={txn.id}>
                                    <TableCell>{txn.date}</TableCell>
                                    <TableCell>{txn.invoice}</TableCell>
                                    <TableCell align="right">
                                        ₹{txn.amount.toLocaleString('en-IN')}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={txn.status}
                                            size="small"
                                            color={
                                                txn.status === 'reconciled'
                                                    ? 'success'
                                                    : txn.status === 'mismatch'
                                                        ? 'error'
                                                        : 'warning'
                                            }
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="outlined">
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default AccountantDashboard;
