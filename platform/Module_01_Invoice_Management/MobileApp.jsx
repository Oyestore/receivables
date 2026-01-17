import React, { useState, useEffect } from 'react';
import { 
  Box, 
  BottomNavigation, 
  BottomNavigationAction,
  Paper,
  Typography,
  CircularProgress,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  AppBar,
  Toolbar,
  Divider,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab
} from '@mui/material';

// Import icons
import HomeIcon from '@mui/icons-material/Home';
import AnalyticsIcon from '@mui/icons-material/BarChart';
import DistributionIcon from '@mui/icons-material/Send';
import TemplatesIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';

// Import chart components from Recharts
import {
  ResponsiveContainer,
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
  Legend
} from 'recharts';

/**
 * Mobile App Component
 * Main container for the mobile interface of the Smart Invoice platform
 */
const MobileApp = () => {
  // State for navigation and UI
  const [value, setValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Mock data for dashboard
  const [dashboardData, setDashboardData] = useState(null);
  
  // Load dashboard data on component mount
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setDashboardData(getMockDashboardData());
      setLoading(false);
    }, 1500);
  }, []);
  
  // Handle navigation change
  const handleNavChange = (event, newValue) => {
    setValue(newValue);
  };
  
  // Handle drawer toggle
  const toggleDrawer = (open) => (event) => {
    if (
      event &&
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Render different screens based on navigation value
  const renderScreen = () => {
    switch (value) {
      case 0:
        return <HomeScreen data={dashboardData} loading={loading} />;
      case 1:
        return <AnalyticsScreen data={dashboardData} loading={loading} activeTab={activeTab} handleTabChange={handleTabChange} />;
      case 2:
        return <DistributionScreen />;
      case 3:
        return <TemplatesScreen />;
      case 4:
        return <SettingsScreen />;
      default:
        return <HomeScreen data={dashboardData} loading={loading} />;
    }
  };
  
  // Drawer content
  const drawerContent = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <img src="images/logo.png" alt="Smart Invoice Logo" style={{ width: 40, marginRight: 10 }} />
        <Typography variant="h6">Smart Invoice</Typography>
      </Box>
      <Divider />
      <List>
        <ListItem button onClick={() => setValue(0)}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItem>
        <ListItem button onClick={() => setValue(1)}>
          <ListItemIcon>
            <AnalyticsIcon />
          </ListItemIcon>
          <ListItemText primary="Analytics" />
        </ListItem>
        <ListItem button onClick={() => setValue(2)}>
          <ListItemIcon>
            <DistributionIcon />
          </ListItemIcon>
          <ListItemText primary="Distribution" />
        </ListItem>
        <ListItem button onClick={() => setValue(3)}>
          <ListItemIcon>
            <TemplatesIcon />
          </ListItemIcon>
          <ListItemText primary="Templates" />
        </ListItem>
        <ListItem button onClick={() => setValue(4)}>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2">
          Logged in as: John Doe
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Organization: Acme Inc.
        </Typography>
      </Box>
    </Box>
  );
  
  return (
    <Box sx={{ pb: 7, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {value === 0 && "Dashboard"}
            {value === 1 && "Analytics"}
            {value === 2 && "Distribution"}
            {value === 3 && "Templates"}
            {value === 4 && "Settings"}
          </Typography>
          <IconButton
            size="large"
            aria-label="notifications"
            color="inherit"
          >
            <NotificationsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {renderScreen()}
      </Box>
      
      {/* Bottom Navigation */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={handleNavChange}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction label="Analytics" icon={<AnalyticsIcon />} />
          <BottomNavigationAction label="Distribution" icon={<DistributionIcon />} />
          <BottomNavigationAction label="Templates" icon={<TemplatesIcon />} />
          <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Paper>
      
      {/* Drawer */}
      <SwipeableDrawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
      >
        {drawerContent}
      </SwipeableDrawer>
    </Box>
  );
};

/**
 * Home Screen Component
 * Dashboard overview for the mobile interface
 */
const HomeScreen = ({ data, loading }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!data) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">No data available</Typography>
      </Box>
    );
  }
  
  // Prepare data for channel distribution chart
  const channelDistributionData = [
    { name: 'Email', value: data.distributionMetrics.volumeByChannel.email.total },
    { name: 'WhatsApp', value: data.distributionMetrics.volumeByChannel.whatsapp.total },
    { name: 'SMS', value: data.distributionMetrics.volumeByChannel.sms.total },
  ];
  
  const channelColors = {
    email: '#8884d8',
    whatsapp: '#82ca9d',
    sms: '#ffc658'
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dashboard Overview
      </Typography>
      
      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {(data.distributionMetrics.volumeByChannel.email.total + 
                  data.distributionMetrics.volumeByChannel.whatsapp.total + 
                  data.distributionMetrics.volumeByChannel.sms.total).toLocaleString()}
              </Typography>
              <Typography variant="body2">Total Distributions</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {(data.distributionMetrics.deliveryRates.overall * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2">Delivery Success Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {(data.followUpMetrics.paymentConversion.overall * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2">Payment Conversion</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {data.followUpMetrics.timeToPayment.average.toFixed(1)}
              </Typography>
              <Typography variant="body2">Avg. Days to Payment</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Distribution by Channel */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Distribution by Channel
          </Typography>
          <Box sx={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {channelDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(channelColors)[index % Object.values(channelColors).length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Invoice #1234 sent to client@example.com" 
                secondary="Today, 10:30 AM" 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Payment received for Invoice #1122" 
                secondary="Yesterday, 3:45 PM" 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Follow-up sent for Invoice #1089" 
                secondary="Yesterday, 11:20 AM" 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="New template 'Friendly Reminder' created" 
                secondary="May 19, 2025" 
              />
            </ListItem>
          </List>
          <Button fullWidth variant="text">View All Activity</Button>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Analytics Screen Component
 * Detailed analytics for the mobile interface
 */
const AnalyticsScreen = ({ data, loading, activeTab, handleTabChange }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!data) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">No data available</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Analytics</Typography>
        <Box>
          <IconButton aria-label="filter">
            <FilterListIcon />
          </IconButton>
          <IconButton aria-label="refresh">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="analytics tabs"
        >
          <Tab label="Overview" />
          <Tab label="Distribution" />
          <Tab label="Follow-up" />
          <Tab label="Templates" />
        </Tabs>
      </Paper>
      
      {/* Tab content */}
      <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <AnalyticsOverviewTab data={data} />
      </Box>
      
      <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <AnalyticsDistributionTab data={data} />
      </Box>
      
      <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
        <AnalyticsFollowUpTab data={data} />
      </Box>
      
      <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
        <AnalyticsTemplatesTab data={data} />
      </Box>
    </Box>
  );
};

/**
 * Analytics Overview Tab Component
 */
const AnalyticsOverviewTab = ({ data }) => {
  // Prepare data for success rates chart
  const successRatesData = [
    { name: 'Email', rate: data.distributionMetrics.deliveryRates.email * 100 },
    { name: 'WhatsApp', rate: data.distributionMetrics.deliveryRates.whatsapp * 100 },
    { name: 'SMS', rate: data.distributionMetrics.deliveryRates.sms * 100 },
  ];
  
  // Prepare data for follow-up effectiveness chart
  const followUpData = [
    { name: '1st', conversion: data.followUpMetrics.paymentConversion.afterFirstFollowUp * 100 },
    { name: '2nd', conversion: data.followUpMetrics.paymentConversion.afterSecondFollowUp * 100 },
    { name: '3rd', conversion: data.followUpMetrics.paymentConversion.afterThirdFollowUp * 100 },
  ];
  
  return (
    <Box>
      {/* Delivery Success Rates */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Delivery Success Rates
          </Typography>
          <Box sx={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={successRatesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Bar dataKey="rate" name="Success Rate (%)" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
      
      {/* Follow-up Effectiveness */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Follow-up Effectiveness
          </Typography>
          <Box sx={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followUpData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Bar dataKey="conversion" name="Payment Conversion (%)" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
      
      {/* System Health Summary */}
      <Card>
        <CardCont
(Content truncated due to size limit. Use line ranges to read in chunks)