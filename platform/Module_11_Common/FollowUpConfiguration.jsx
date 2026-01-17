import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';
import { TriggerType } from '../../follow-up/entities/follow-up-rule.entity';

function FollowUpConfiguration({ organizationId }) {
  const [tabValue, setTabValue] = useState(0);
  const [rules, setRules] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openRuleDialog, setOpenRuleDialog] = useState(false);
  const [openSequenceDialog, setOpenSequenceDialog] = useState(false);
  const [openStepDialog, setOpenStepDialog] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);
  const [currentSequence, setCurrentSequence] = useState(null);
  const [currentSequenceForStep, setCurrentSequenceForStep] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    name: '',
    description: '',
    triggerType: 'BEFORE_DUE',
    daysOffset: 3,
    templateId: '',
    channel: 'EMAIL',
    organizationId: organizationId
  });
  const [sequenceFormData, setSequenceFormData] = useState({
    name: '',
    description: '',
    organizationId: organizationId
  });
  const [stepFormData, setStepFormData] = useState({
    sequenceId: '',
    stepNumber: 1,
    ruleId: '',
    organizationId: organizationId
  });
  const [templates, setTemplates] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchRules();
    fetchSequences();
    fetchTemplates();
  }, [organizationId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be an API call
      // For now, we'll use mock data
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Payment Reminder - 3 Days Before',
          description: 'Send a gentle reminder 3 days before the invoice is due',
          triggerType: 'BEFORE_DUE',
          daysOffset: 3,
          templateId: 'template-1',
          channel: 'EMAIL',
          organizationId: organizationId,
          template: {
            id: 'template-1',
            name: 'Payment Reminder Template'
          }
        },
        {
          id: 'rule-2',
          name: 'Due Date Notification',
          description: 'Notify the customer on the due date',
          triggerType: 'ON_DUE',
          daysOffset: 0,
          templateId: 'template-2',
          channel: 'WHATSAPP',
          organizationId: organizationId,
          template: {
            id: 'template-2',
            name: 'Due Date Template'
          }
        },
        {
          id: 'rule-3',
          name: 'Overdue Notice - 7 Days',
          description: 'Send an overdue notice 7 days after the due date',
          triggerType: 'AFTER_DUE',
          daysOffset: 7,
          templateId: 'template-3',
          channel: 'EMAIL',
          organizationId: organizationId,
          template: {
            id: 'template-3',
            name: 'Overdue Notice Template'
          }
        }
      ];
      
      setRules(mockRules);
      setError(null);
    } catch (err) {
      setError('Failed to fetch rules: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSequences = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be an API call
      const mockSequences = [
        {
          id: 'seq-1',
          name: 'Standard Follow-up Sequence',
          description: 'A standard sequence of follow-ups for invoices',
          organizationId: organizationId,
          steps: [
            {
              id: 'step-1',
              sequenceId: 'seq-1',
              stepNumber: 1,
              ruleId: 'rule-1',
              organizationId: organizationId,
              rule: {
                id: 'rule-1',
                name: 'Payment Reminder - 3 Days Before',
                triggerType: 'BEFORE_DUE',
                daysOffset: 3,
                channel: 'EMAIL'
              }
            },
            {
              id: 'step-2',
              sequenceId: 'seq-1',
              stepNumber: 2,
              ruleId: 'rule-2',
              organizationId: organizationId,
              rule: {
                id: 'rule-2',
                name: 'Due Date Notification',
                triggerType: 'ON_DUE',
                daysOffset: 0,
                channel: 'WHATSAPP'
              }
            },
            {
              id: 'step-3',
              sequenceId: 'seq-1',
              stepNumber: 3,
              ruleId: 'rule-3',
              organizationId: organizationId,
              rule: {
                id: 'rule-3',
                name: 'Overdue Notice - 7 Days',
                triggerType: 'AFTER_DUE',
                daysOffset: 7,
                channel: 'EMAIL'
              }
            }
          ]
        },
        {
          id: 'seq-2',
          name: 'Aggressive Collection Sequence',
          description: 'A more aggressive sequence for high-value invoices',
          organizationId: organizationId,
          steps: [
            {
              id: 'step-4',
              sequenceId: 'seq-2',
              stepNumber: 1,
              ruleId: 'rule-2',
              organizationId: organizationId,
              rule: {
                id: 'rule-2',
                name: 'Due Date Notification',
                triggerType: 'ON_DUE',
                daysOffset: 0,
                channel: 'WHATSAPP'
              }
            },
            {
              id: 'step-5',
              sequenceId: 'seq-2',
              stepNumber: 2,
              ruleId: 'rule-3',
              organizationId: organizationId,
              rule: {
                id: 'rule-3',
                name: 'Overdue Notice - 7 Days',
                triggerType: 'AFTER_DUE',
                daysOffset: 7,
                channel: 'EMAIL'
              }
            }
          ]
        }
      ];
      
      setSequences(mockSequences);
      setError(null);
    } catch (err) {
      setError('Failed to fetch sequences: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      // In a real implementation, this would be an API call
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Payment Reminder Template'
        },
        {
          id: 'template-2',
          name: 'Due Date Template'
        },
        {
          id: 'template-3',
          name: 'Overdue Notice Template'
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  // Rule Dialog Handlers
  const handleOpenRuleDialog = (rule = null) => {
    if (rule) {
      setCurrentRule(rule);
      setRuleFormData({
        name: rule.name,
        description: rule.description || '',
        triggerType: rule.triggerType,
        daysOffset: rule.daysOffset,
        templateId: rule.templateId,
        channel: rule.channel,
        organizationId: organizationId
      });
    } else {
      setCurrentRule(null);
      setRuleFormData({
        name: '',
        description: '',
        triggerType: 'BEFORE_DUE',
        daysOffset: 3,
        templateId: '',
        channel: 'EMAIL',
        organizationId: organizationId
      });
    }
    setOpenRuleDialog(true);
  };

  const handleCloseRuleDialog = () => {
    setOpenRuleDialog(false);
  };

  const handleRuleInputChange = (e) => {
    const { name, value } = e.target;
    setRuleFormData({
      ...ruleFormData,
      [name]: name === 'daysOffset' ? parseInt(value, 10) : value
    });
  };

  const handleRuleSubmit = async () => {
    try {
      if (currentRule) {
        // Update existing rule
        // In a real implementation, this would be an API call
        const updatedRules = rules.map(r => 
          r.id === currentRule.id ? { 
            ...r, 
            ...ruleFormData,
            template: templates.find(t => t.id === ruleFormData.templateId)
          } : r
        );
        setRules(updatedRules);
        setSnackbar({
          open: true,
          message: 'Rule updated successfully',
          severity: 'success'
        });
      } else {
        // Create new rule
        // In a real implementation, this would be an API call
        const newRule = {
          id: `rule-${Date.now()}`,
          ...ruleFormData,
          template: templates.find(t => t.id === ruleFormData.templateId)
        };
        setRules([...rules, newRule]);
        setSnackbar({
          open: true,
          message: 'Rule created successfully',
          severity: 'success'
        });
      }
      handleCloseRuleDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      // In a real implementation, this would be an API call
      const updatedRules = rules.filter(r => r.id !== id);
      setRules(updatedRules);
      setSnackbar({
        open: true,
        message: 'Rule deleted successfully',
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

  // Sequence Dialog Handlers
  const handleOpenSequenceDialog = (sequence = null) => {
    if (sequence) {
      setCurrentSequence(sequence);
      setSequenceFormData({
        name: sequence.name,
        description: sequence.description || '',
        organizationId: organizationId
      });
    } else {
      setCurrentSequence(null);
      setSequenceFormData({
        name: '',
        description: '',
        organizationId: organizationId
      });
    }
    setOpenSequenceDialog(true);
  };

  const handleCloseSequenceDialog = () => {
    setOpenSequenceDialog(false);
  };

  const handleSequenceInputChange = (e) => {
    const { name, value } = e.target;
    setSequenceFormData({
      ...sequenceFormData,
      [name]: value
    });
  };

  const handleSequenceSubmit = async () => {
    try {
      if (currentSequence) {
        // Update existing sequence
        // In a real implementation, this would be an API call
        const updatedSequences = sequences.map(s => 
          s.id === currentSequence.id ? { 
            ...s, 
            ...sequenceFormData
          } : s
        );
        setSequences(updatedSequences);
        setSnackbar({
          open: true,
          message: 'Sequence updated successfully',
          severity: 'success'
        });
      } else {
        // Create new sequence
        // In a real implementation, this would be an API call
        const newSequence = {
          id: `seq-${Date.now()}`,
          ...sequenceFormData,
          steps: []
        };
        setSequences([...sequences, newSequence]);
        setSnackbar({
          open: true,
          message: 'Sequence created successfully',
          severity: 'success'
        });
      }
      handleCloseSequenceDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteSequence = async (id) => {
    try {
      // In a real implementation, this would be an API call
      const updatedSequences = sequences.filter(s => s.id !== id);
      setSequences(updatedSequences);
      setSnackbar({
        open: true,
        message: 'Sequence deleted successfully',
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

  // Step Dialog Handlers
  const handleOpenStepDialog = (sequence) => {
    setCurrentSequenceForStep(sequence);
    setStepFormData({
      sequenceId: sequence.id,
      stepNumber: sequence.steps ? sequence.steps.length + 1 : 1,
      ruleId: '',
      organizationId: organizationId
    });
    setOpenStepDialog(true);
  };

  const handleCloseStepDialog = () => {
    setOpenStepDialog(false);
  };

  const handleStepInputChange = (e) => {
    const { name, value } = e.target;
    setStepFormData({
      ...stepFormData,
      [name]: name === 'stepNumber' ? parseInt(value, 10) : value
    });
  };

  const handleStepSubmit = async () => {
    try {
      // In a real implementation, this would be an API call
      const newStep = {
        id: `step-${Date.now()}`,
        ...stepFormData,
        rule: rules.find(r => r.id === stepFormData.ruleId)
      };
      
      const updatedSequences = sequences.map(s => {
        if (s.id === stepFormData.sequenceId) {
          return {
            ...s,
            steps: [...(s.steps || []), newStep]
          };
        }
        return s;
      });
      
      setSequences(updatedSequences);
      setSnackbar({
        open: true,
        message: 'Step added successfully',
        severity: 'success'
      });
      
      handleCloseStepDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteStep = async (sequenceId, stepId) => {
    try {
      // In a real implementation, this would be an API call
      const updatedSequences = sequences.map(s => {
        if (s.id === sequenceId) {
          return {
            ...s,
            steps: s.steps.filter(step => step.id !== stepId)
          };
        }
        return s;
      });
      
      setSequences(updatedSequences);
      setSnackbar({
        open: true,
        message: 'Step removed successfully',
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

  const getTriggerTypeLabel = (triggerType, daysOffset) => {
    switch (triggerType) {
      case 'BEFORE_DUE':
        return `${daysOffset} days before due date`;
      case 'ON_DUE':
        return 'On due date';
      case 'AFTER_DUE':
        return `${daysOffset} days after due date`;
      case 'ON_EVENT':
        return 'On event';
      default:
        return triggerType;
    }
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

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="follow-up configuration tabs">
          <Tab label="Follow-up Rules" />
          <Tab label="Follow-up Sequences" />
        </Tabs>
      </Box>

      {/* Rules Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Follow-up Rules</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenRuleDialog()}
          >
            Add Rule
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{getTriggerTypeLabel(rule.triggerType, rule.daysOffset)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={rule.channel} 
                      color={getChannelChipColor(rule.channel)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{rule.template?.name || rule.templateId}</TableCell>
                  <TableCell>{rule.description}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenRuleDialog(rule)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteRule(rule.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No rules found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Sequences Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Follow-up Sequences</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenSequenceDialog()}
          >
            Add Sequence
          </Button>
        </Box>

        {sequences.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">No sequences found</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {sequences.map((sequence) => (
              <Card key={sequence.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{sequence.name}</Typography>
                    <Box>
                      <IconButton onClick={() => handleOpenSequenceDialog(sequence)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteSequence(sequence.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {sequence.description}
                  </Typography>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Steps:</Typography>
                  
                  {sequence.steps && sequence.steps.length > 0 ? (
                    <List>
                      {sequence.steps.sort((a, b) => a.stepNumber - b.stepNumber).map((step) => (
                        <ListItem key={step.id} sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 1 }}>
                          <DragIndicatorIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <ListItemText 
                            primary={`Step ${step.stepNumber}: ${step.rule?.name || step.ruleId}`}
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                <Chip 
                                  label={getTriggerTypeLabel(step.rule?.triggerType, step.rule?.daysOffset)}
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip 
                                  label={step.rule?.channel}
                                  color={getChannelChipColor(step.rule?.channel)}
                                  size="small"
                                />
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleDeleteStep(sequence.id, step.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No steps defined yet
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenStepDialog(sequence)}
                  >
                    Add Step
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                    disabled={!sequence.steps || sequence.steps.length === 0}
                  >
                    Apply to Invoice
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
      </TabPanel>

      {/* Rule Dialog */}
      <Dialog open={openRuleDialog} onClose={handleCloseRuleDialog}>
        <DialogTitle>
          {currentRule ? 'Edit Follow-up Rule' : 'Add Follow-up Rule'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, minWidth: '400px' }}>
            <TextField
              name="name"
              label="Rule Name"
              value={ruleFormData.name}
              onChange={handleRuleInputChange}
              fullWidth
              required
            />
            
            <TextField
              name="description"
              label="Description"
              value={ruleFormData.description}
              onChange={handleRuleInputChange}
              fullWidth
              multiline
              rows={2}
            />
            
            <FormControl fullWidth>
              <InputLabel>Trigger Type</InputLabel>
              <Select
                name="triggerType"
                value={ruleFormData.triggerType}
                onChange={handleRuleInputChange}
                required
              >
                <MenuItem value="BEFORE_DUE">Before Due Date</MenuItem>
                <MenuItem value="ON_DUE">On Due Date</MenuItem>
                <MenuItem value="AFTER_DUE">After Due Date</MenuItem>
                <MenuItem value="ON_EVENT">On Event</MenuItem>
              </Select>
            </FormControl>
            
            {ruleFormData.triggerType !== 'ON_DUE' && ruleFormData.triggerType !== 'ON_EVENT' && (
              <TextField
                name="daysOffset"
                label="Days Offset"
                type="number"
                value={ruleFormData.daysOffset}
                onChange={handleRuleInputChange}
                fullWidth
                required
              />
            )}
            
            <FormControl fullWidth>
              <InputLabel>Template</InputLabel>
              <Select
                name="templateId"
                value={ruleFormData.templateId}
                onChange={handleRuleInputChange}
                required
              >
                {templates.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Channel</InputLabel>
              <Select
                name="channel"
                value={ruleFormData.channel}
                onChange={handleRuleInputChange}
                required
              >
                <MenuItem value="EMAIL">Email</MenuItem>
                <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                <MenuItem value="SMS">SMS</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRuleDialog}>Cancel</Button>
          <Button 
            onClick={handleRuleSubmit} 
            variant="contained"
            disabled={!ruleFormData.name || !ruleFormData.templateId}
          >
            {currentRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sequence Dialog */}
      <Dialog open={openSequenceDialog} onClose={handleCloseSequenceDialog}>
        <DialogTitle>
          {currentSequence ? 'Edit Follow-up Sequence' : 'Add Follow-up Sequence'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, minWidth: '400px' }}>
            <TextField
              name="name"
              label="Sequence Name"
              value={sequenceFormData.name}
              onChange={handleSequenceInputChange}
              fullWidth
              required
            />
            
            <TextField
              name="description"
              label="Description"
              value={sequenceFormData.description}
              onChange={handleSequenceInputChange}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSequenceDialog}>Cancel</Button>
          <Button 
            onClick={handleSequenceSubmit} 
            variant="contained"
            disabled={!sequenceFormData.name}
          >
            {currentSequence ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step Dialog */}
      <Dialog open={openStepDialog} onClose={handleCloseStepDialog}>
        <DialogTitle>
          Add Step to Sequence
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, minWidth: '400px' }}>
            <Typography variant="subtitle1">
              Sequence: {currentSequenceForStep?.name}
            </Typography>
            
            <TextField
              name="stepNumber"
              label="Step Number"
              type="number"
              value={stepFormData.stepNumber}
              onChange={handleStepInputChange}
              fullWidth
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Rule</InputLabel>
              <Select
                name="ruleId"
                value={stepFormData.ruleId}
                onChange={handleStepInputChange}
                required
              >
                {rules.map(rule => (
                  <MenuItem key={rule.id} value={rule.id}>
                    {rule.name} ({getTriggerTypeLabel(rule.triggerType, rule.daysOffset)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStepDialog}>Cancel</Button>
          <Button 
            onClick={handleStepSubmit} 
            variant="contained"
            disabled={!stepFormData.ruleId}
          >
            Add Step
          </Button>
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
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

export default FollowUpConfiguration;
