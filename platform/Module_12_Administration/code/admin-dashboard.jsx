import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Paper,
  Button,
  CircularProgress
} from '@mui/material';
import RecipientManagement from './components/RecipientManagement';
import DistributionDashboard from './components/DistributionDashboard';
import FollowUpConfiguration from './components/FollowUpConfiguration';
import TemplateManagement from './components/TemplateManagement';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function AdminDashboard() {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [organizationId, setOrganizationId] = useState('org-123'); // Mock organization ID

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Invoice Distribution & Follow-up Management
        </Typography>
        
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="admin dashboard tabs"
            variant="fullWidth"
          >
            <Tab label="Recipients" {...a11yProps(0)} />
            <Tab label="Distributions" {...a11yProps(1)} />
            <Tab label="Follow-up Rules" {...a11yProps(2)} />
            <Tab label="Templates" {...a11yProps(3)} />
          </Tabs>
          
          <TabPanel value={value} index={0}>
            <RecipientManagement organizationId={organizationId} />
          </TabPanel>
          
          <TabPanel value={value} index={1}>
            <DistributionDashboard organizationId={organizationId} />
          </TabPanel>
          
          <TabPanel value={value} index={2}>
            <FollowUpConfiguration organizationId={organizationId} />
          </TabPanel>
          
          <TabPanel value={value} index={3}>
            <TemplateManagement organizationId={organizationId} />
          </TabPanel>
        </Paper>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default AdminDashboard;
