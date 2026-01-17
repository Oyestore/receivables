import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    TrendingUp,
    Send,
    CheckCircle,
    Error as ErrorIcon,
    Email,
    Sms,
    WhatsApp,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface DistributionAnalyticsProps {
    tenantId: string;
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

export const DistributionAnalytics: React.FC<DistributionAnalyticsProps> = ({
    tenantId,
}) => {
    const [timeRange, setTimeRange] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [metrics, setMetrics] = useState({
        totalSent: 0,
        deliveryRate: 0,
        avgResponseTime: 0,
        activeFollowUps: 0,
    });

    const [channelData, setChannelData] = useState([
        { name: 'Email', value: 0, color: '#667eea' },
        { name: 'SMS', value: 0, color: '#764ba2' },
        { name: 'WhatsApp', value: 0, color: '#f093fb' },
    ]);

    const [trendData, setTrendData] = useState([]);
    const [successData, setSuccessData] = useState([]);

    useEffect(() => {
        loadAnalytics();
    }, [timeRange, tenantId]);

    const loadAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/v1/distribution/analytics?tenant_id=${tenantId}&range=${timeRange}`,
            );

            if (!response.ok) {
                throw new Error('Failed to load analytics');
            }

            const data = await response.json();

            setMetrics({
                totalSent: data.totalSent || 0,
                deliveryRate: data.deliveryRate || 0,
                avgResponseTime: data.avgResponseTime || 0,
                activeFollowUps: data.activeFollowUps || 0,
            });

            setChannelData([
                { name: 'Email', value: data.byChannel?.email || 0, color: '#667eea' },
                { name: 'SMS', value: data.byChannel?.sms || 0, color: '#764ba2' },
                { name: 'WhatsApp', value: data.byChannel?.whatsapp || 0, color: '#f093fb' },
            ]);

            setTrendData(data.trendData || []);
            setSuccessData(data.successData || []);

            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={600}>
                    Distribution Analytics
                </Typography>
                <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Time Range</InputLabel>
                    <Select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        label="Time Range"
                    >
                        <MenuItem value="24h">Last 24 Hours</MenuItem>
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="30d">Last 30 Days</MenuItem>
                        <MenuItem value="90d">Last 90 Days</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Metric Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                        }}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Total Sent
                                    </Typography>
                                    <Typography variant="h4" fontWeight={700} mt={1}>
                                        {metrics.totalSent.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Send sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                            color: 'white',
                        }}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Delivery Rate
                                    </Typography>
                                    <Typography variant="h4" fontWeight={700} mt={1}>
                                        {metrics.deliveryRate.toFixed(1)}%
                                    </Typography>
                                </Box>
                                <CheckCircle sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                            color: 'white',
                        }}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Avg Response Time
                                    </Typography>
                                    <Typography variant="h4" fontWeight={700} mt={1}>
                                        {metrics.avgResponseTime}h
                                    </Typography>
                                </Box>
                                <TrendingUp sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white',
                        }}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Active Follow-ups
                                    </Typography>
                                    <Typography variant="h4" fontWeight={700} mt={1}>
                                        {metrics.activeFollowUps}
                                    </Typography>
                                </Box>
                                <Email sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
                {/* Distribution Trend */}
                <Grid item xs={12} md={8}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Distribution Trend
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" stroke="#666" />
                                    <YAxis stroke="#666" />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="sent"
                                        stroke="#667eea"
                                        strokeWidth={3}
                                        dot={{ fill: '#667eea', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="delivered"
                                        stroke="#38ef7d"
                                        strokeWidth={3}
                                        dot={{ fill: '#38ef7d', r: 4 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="failed"
                                        stroke="#ff6b6b"
                                        strokeWidth={2}
                                        dot={{ fill: '#ff6b6b', r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Channel Distribution */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Channel Distribution
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={channelData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                    >
                                        {channelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Success Rate by Channel */}
                <Grid item xs={12}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Success Rate by Channel
                            </Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={successData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="channel" stroke="#666" />
                                    <YAxis stroke="#666" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="successRate" fill="#667eea" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="failureRate" fill="#ff6b6b" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};
