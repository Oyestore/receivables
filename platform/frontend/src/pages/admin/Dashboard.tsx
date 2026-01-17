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
    LinearProgress,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
} from '@mui/material';
import {
    SupervisorAccount,
    Business,
    TrendingUp,
    Warning,
    CheckCircle,
    Block,
    Settings,
    Notifications,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdminDashboard: React.FC = () => {
    const [systemHealth] = useState({
        api: 98,
        database: 99,
        storage: 95,
        cache: 97,
    });

    const tenantData = [
        { name: 'Active', value: 145, color: '#4caf50' },
        { name: 'Trial', value: 28, color: '#2196f3' },
        { name: 'Suspended', value: 5, color: '#ff9800' },
        { name: 'Cancelled', value: 12, color: '#f44336' },
    ];

    const usageData = [
        { month: 'Jul', users: 450, api: 2500 },
        { month: 'Aug', users: 520, api: 2800 },
        { month: 'Sep', users: 580, api: 3100 },
        { month: 'Oct', users: 640, api: 3500 },
        { month: 'Nov', users: 720, api: 4000 },
    ];

    const recentActivity = [
        { id: 1, action: 'New user registered', user: 'john@acme.com', time: '5 min ago', type: 'success' },
        { id: 2, action: 'Failed login attempt', user: 'admin@test.com', time: '12 min ago', type: 'warning' },
        { id: 3, action: 'Tenant upgraded to Premium', user: 'Tech Solutions Ltd', time: '1 hour ago', type: 'success' },
        { id: 4, action: 'System backup completed', user: 'System', time: '2 hours ago', type: 'info' },
    ];

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Admin Dashboard
                </Typography>
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Settings />}
                        onClick={() => console.log("Navigate to /admin/global-trade")} // Mock Navigation
                    >
                        Global Trade Config
                    </Button>
                    <Button variant="contained" color="error" startIcon={<Warning />}>
                        View Alerts (3)
                    </Button>
                </Box>
            </Box>

            {/* Stats Row */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <SupervisorAccount color="primary" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Total Users
                                </Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                720
                            </Typography>
                            <Box display="flex" alignItems="center" mt={1}>
                                <TrendingUp color="success" fontSize="small" />
                                <Typography variant="caption" color="success.main" ml={0.5}>
                                    +12% this month
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Business color="primary" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Active Tenants
                                </Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                145
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                28 in trial
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <TrendingUp color="success" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Revenue (MRR)
                                </Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                ₹12.5L
                            </Typography>
                            <Typography variant="caption" color="success.main">
                                +8.3% growth
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <CheckCircle color="success" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    System Health
                                </Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold" color="success.main">
                                98%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                All systems operational
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* System Health */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    System Health Metrics
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                API Server
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress
                                    variant="determinate"
                                    value={systemHealth.api}
                                    sx={{ flex: 1 }}
                                    color="success"
                                />
                                <Typography variant="body2">{systemHealth.api}%</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Database
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress
                                    variant="determinate"
                                    value={systemHealth.database}
                                    sx={{ flex: 1 }}
                                    color="success"
                                />
                                <Typography variant="body2">{systemHealth.database}%</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Storage
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress
                                    variant="determinate"
                                    value={systemHealth.storage}
                                    sx={{ flex: 1 }}
                                    color="success"
                                />
                                <Typography variant="body2">{systemHealth.storage}%</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Cache
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress
                                    variant="determinate"
                                    value={systemHealth.cache}
                                    sx={{ flex: 1 }}
                                    color="success"
                                />
                                <Typography variant="body2">{systemHealth.cache}%</Typography>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Charts Row */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Tenant Distribution
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={tenantData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    dataKey="value"
                                    label
                                >
                                    {tenantData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Platform Usage Trends
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={usageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="users" stroke="#2196f3" name="Users" strokeWidth={2} />
                                <Line yAxisId="right" type="monotone" dataKey="api" stroke="#4caf50" name="API Calls (k)" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Activity */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Recent Activity
                </Typography>
                <List>
                    {recentActivity.map((activity) => (
                        <ListItem key={activity.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                            <ListItemAvatar>
                                <Avatar>
                                    {activity.type === 'success' ? (
                                        <CheckCircle color="success" />
                                    ) : activity.type === 'warning' ? (
                                        <Warning color="warning" />
                                    ) : (
                                        <Notifications color="primary" />
                                    )}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={activity.action}
                                secondary={`${activity.user} • ${activity.time}`}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default AdminDashboard;
