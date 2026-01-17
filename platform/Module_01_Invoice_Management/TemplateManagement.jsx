import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';

function TemplateManagement({ organizationId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [openCodeDialog, setOpenCodeDialog] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    content: '',
    channel: 'EMAIL',
    organizationId: organizationId
  });
  const [previewData, setPreviewData] = useState({
    recipientName: 'John Doe',
    invoiceNumber: 'INV-2025-001',
    amount: 1250.00,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    companyName: 'ACME Corporation'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, [organizationId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be an API call
      // For now, we'll use mock data
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Payment Reminder Template',
          description: 'A gentle reminder for upcoming invoice payment',
          subject: 'Reminder: Invoice {invoiceNumber} Payment Due Soon',
          content: `<p>Dear {recipientName},</p>
<p>We hope this email finds you well. This is a friendly reminder that payment for invoice <strong>{invoiceNumber}</strong> in the amount of <strong>${'{amount}'}</strong> is due on <strong>{dueDate}</strong>.</p>
<p>If you have already made the payment, please disregard this message. If not, we would appreciate your prompt attention to this matter.</p>
<p>Thank you for your business!</p>
<p>Best regards,<br>{companyName}</p>`,
          channel: 'EMAIL',
          organizationId: organizationId,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'template-2',
          name: 'Due Date Template',
          description: 'Notification on the due date of an invoice',
          subject: 'Invoice {invoiceNumber} Payment Due Today',
          content: `<p>Dear {recipientName},</p>
<p>This is a reminder that payment for invoice <strong>{invoiceNumber}</strong> in the amount of <strong>${'{amount}'}</strong> is due today.</p>
<p>Please ensure that payment is made promptly to avoid any late fees.</p>
<p>Thank you for your business!</p>
<p>Best regards,<br>{companyName}</p>`,
          channel: 'EMAIL',
          organizationId: organizationId,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'template-3',
          name: 'Overdue Notice Template',
          description: 'Notice for overdue invoice payment',
          subject: 'OVERDUE: Invoice {invoiceNumber} Payment',
          content: `<p>Dear {recipientName},</p>
<p>Our records indicate that payment for invoice <strong>{invoiceNumber}</strong> in the amount of <strong>${'{amount}'}</strong> is now overdue.</p>
<p>Please arrange for payment as soon as possible. If you have already made the payment, please disregard this message.</p>
<p>If you are experiencing any difficulties with the payment, please contact our accounts department to discuss possible arrangements.</p>
<p>Thank you for your prompt attention to this matter.</p>
<p>Best regards,<br>{companyName}</p>`,
          channel: 'EMAIL',
          organizationId: organizationId,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'template-4',
          name: 'WhatsApp Payment Reminder',
          description: 'Short reminder for WhatsApp',
          subject: '',
          content: `Hello {recipientName}, this is a reminder that invoice {invoiceNumber} for ${'{amount}'} is due on {dueDate}. Please arrange payment. Thank you, {companyName}`,
          channel: 'WHATSAPP',
          organizationId: organizationId,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'template-5',
          name: 'SMS Payment Reminder',
          description: 'Short reminder for SMS',
          subject: '',
          content: `{companyName}: Invoice {invoiceNumber} for ${'{amount}'} is due on {dueDate}. Please arrange payment.`,
          channel: 'SMS',
          organizationId: organizationId,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setTemplates(mockTemplates);
      setError(null);
    } catch (err) {
      setError('Failed to fetch templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setCurrentTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        subject: template.subject || '',
        content: template.content,
        channel: template.channel,
        organizationId: organizationId
      });
    } else {
      setCurrentTemplate(null);
      setFormData({
        name: '',
        description: '',
        subject: '',
        content: '',
        channel: 'EMAIL',
        organizationId: organizationId
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenPreviewDialog = (template) => {
    setCurrentTemplate(template);
    setOpenPreviewDialog(true);
  };

  const handleClosePreviewDialog = () => {
    setOpenPreviewDialog(false);
  };

  const handleOpenCodeDialog = (template) => {
    setCurrentTemplate(template);
    setOpenCodeDialog(true);
  };

  const handleCloseCodeDialog = () => {
    setOpenCodeDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePreviewDataChange = (e) => {
    const { name, value } = e.target;
    setPreviewData({
      ...previewData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      if (currentTemplate) {
        // Update existing template
        // In a real implementation, this would be an API call
        const updatedTemplates = templates.map(t => 
          t.id === currentTemplate.id ? { 
            ...t, 
            ...formData,
            updatedAt: new Date().toISOString()
          } : t
        );
        setTemplates(updatedTemplates);
        setSnackbar({
          open: true,
          message: 'Template updated successfully',
          severity: 'success'
        });
      } else {
        // Create new template
        // In a real implementation, this would be an API call
        const newTemplate = {
          id: `template-${Date.now()}`,
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setTemplates([...templates, newTemplate]);
        setSnackbar({
          open: true,
          message: 'Template created successfully',
          severity: 'success'
        });
      }
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleDuplicateTemplate = (template) => {
    const duplicatedTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setTemplates([...templates, duplicatedTemplate]);
    setSnackbar({
      open: true,
      message: 'Template duplicated successfully',
      severity: 'success'
    });
  };

  const handleDeleteTemplate = async (id) => {
    try {
      // In a real implementation, this would be an API call
      const updatedTemplates = templates.filter(t => t.id !== id);
      setTemplates(updatedTemplates);
      setSnackbar({
        open: true,
        message: 'Template deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const getChannelChipColor = (channel) => {
    switch (channel) {
      case 'EMAIL':
        return 'primary';
      case 'WHATSAPP':
        return 'success';
      case 'SMS':
        return 'info';
      default:
        return 'default';
    }
  };

  const renderPreview = () => {
    if (!currentTemplate) return null;
    
    // Replace template variables with preview data
    let previewContent = currentTemplate.content;
    let previewSubject = currentTemplate.subject;
    
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      previewContent = previewContent.replace(regex, previewData[key]);
      if (previewSubject) {
        previewSubject = previewSubject.replace(regex, previewData[key]);
      }
    });
    
    return (
      <Box>
        {previewSubject && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Subject:</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
              <Typography>{previewSubject}</Typography>
            </Paper>
          </Box>
        )}
        
        <Typography variant="subtitle1" fontWeight="bold">Content:</Typography>
        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
          {currentTemplate.channel === 'EMAIL' ? (
            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
          ) : (
            <Typography>{previewContent}</Typography>
          )}
        </Paper>
      </Box>
    );
  };

  const filterTemplatesByChannel = (channel) => {
    return templates.filter(template => template.channel === channel);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Message Templates</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Template
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="template channel tabs">
          <Tab label="All Templates" />
          <Tab label="Email" />
          <Tab label="WhatsApp" />
          <Tab label="SMS" />
        </Tabs>
      </Box>

      <Grid container spacing={2}>
        {(tabValue === 0 ? templates : filterTemplatesByChannel(
          tabValue === 1 ? 'EMAIL' : tabValue === 2 ? 'WHATSAPP' : 'SMS'
        )).map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                    {template.name}
                  </Typography>
                  <Chip 
                    label={template.channel} 
                    color={getChannelChipColor(template.channel)}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {template.description}
                </Typography>
                
                {template.subject && (
                  <Typography variant="body2" noWrap sx={{ mb: 1 }}>
                    <strong>Subject:</strong> {template.subject}
                  </Typography>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => handleOpenPreviewDialog(template)}>
                  <VisibilityIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleOpenCodeDialog(template)}>
                  <CodeIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleDuplicateTemplate(template)}>
                  <ContentCopyIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleOpenDialog(template)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteTemplate(template.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
        
        {(tabValue === 0 ? templates.length === 0 : filterTemplatesByChannel(
          tabValue === 1 ? 'EMAIL' : tabValue === 2 ? 'WHATSAPP' : 'SMS'
        ).length === 0) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">No templates found</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Template Edit/Create Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentTemplate ? 'Edit Template' : 'Create Template'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              name="name"
              label="Template Name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <TextField
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={2}
            />
            
            <FormControl fullWidth>
              <InputLabel>Channel</InputLabel>
              <Select
                name="channel"
                value={formData.channel}
                onChange={handleInputChange}
                required
              >
                <MenuItem value="EMAIL">Email</MenuItem>
                <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                <MenuItem value="SMS">SMS</MenuItem>
              </Select>
            </FormControl>
            
            {formData.channel === 'EMAIL' && (
              <TextField
                name="subject"
                label="Subject Line"
                value={formData.subject}
                onChange={handleInputChange}
                fullWidth
                required
              />
            )}
            
            <TextField
              name="content"
              label="Content"
              value={formData.content}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={10}
              required
              helperText="Use {recipientName}, {invoiceNumber}, {amount}, {dueDate}, {companyName} as placeholders"
            />
            
            <Box sx={{ bgcolor: 'info.light', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Available Variables:</strong> {'{recipientName}'}, {'{invoiceNumber}'}, {'{amount}'}, {'{dueDate}'}, {'{companyName}'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.name || !formData.content}
          >
            {currentTemplate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={openPreviewDialog} onClose={handleClosePreviewDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Template Preview: {currentTemplate?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Typography variant="subtitle1">Preview Data:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="recipientName"
                  label="Recipient Name"
                  value={previewData.recipientName}
                  onChange={handlePreviewDataChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="invoiceNumber"
                  label="Invoice Number"
                  value={previewData.invoiceNumber}
                  onChange={handlePreviewDataChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  name="amount"
                  label="Amount"
                  value={previewData.amount}
                  onChange={handlePreviewDataChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  name="dueDate"
                  label="Due Date"
                  type="date"
                  value={previewData.dueDate}
                  onChange={handlePreviewDataChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  name="companyName"
                  label="Company Name"
                  value={previewData.companyName}
                  onChange={handlePreviewDataChange}
                  fullWidth
                />
              </Grid>
            </Grid>
            
            <Divider />
            
            <Typography variant="subtitle1">Preview:</Typography>
            {renderPreview()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreviewDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Code Dialog */}
      <Dialog open={openCodeDialog} onClose={handleCloseCodeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Template Code: {currentTemplate?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', fontFamily: 'monospace', overflowX: 'auto' }}>
              <pre>{currentTemplate?.content}</pre>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCodeDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TemplateManagement;
