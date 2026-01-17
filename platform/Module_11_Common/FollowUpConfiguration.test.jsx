import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUpConfiguration from '../FollowUpConfiguration';

// Mock data
const mockRules = [
  {
    id: 'rule-1',
    name: 'Payment Reminder - 3 Days Before',
    description: 'Send a gentle reminder 3 days before the invoice is due',
    triggerType: 'BEFORE_DUE',
    daysOffset: 3,
    templateId: 'template-1',
    channel: 'EMAIL',
    organizationId: 'org-123',
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
    organizationId: 'org-123',
    template: {
      id: 'template-2',
      name: 'Due Date Template'
    }
  }
];

const mockSequences = [
  {
    id: 'seq-1',
    name: 'Standard Follow-up Sequence',
    description: 'A standard sequence of follow-ups for invoices',
    organizationId: 'org-123',
    steps: [
      {
        id: 'step-1',
        sequenceId: 'seq-1',
        stepNumber: 1,
        ruleId: 'rule-1',
        organizationId: 'org-123',
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
        organizationId: 'org-123',
        rule: {
          id: 'rule-2',
          name: 'Due Date Notification',
          triggerType: 'ON_DUE',
          daysOffset: 0,
          channel: 'WHATSAPP'
        }
      }
    ]
  }
];

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

// Mock API calls
jest.mock('../../api/followUpApi', () => ({
  getRules: jest.fn(() => Promise.resolve(mockRules)),
  getSequences: jest.fn(() => Promise.resolve(mockSequences)),
  createRule: jest.fn((data) => Promise.resolve({ id: 'new-rule-id', ...data })),
  updateRule: jest.fn((id, data) => Promise.resolve({ id, ...data })),
  deleteRule: jest.fn((id) => Promise.resolve({ success: true })),
  createSequence: jest.fn((data) => Promise.resolve({ id: 'new-seq-id', ...data, steps: [] })),
  updateSequence: jest.fn((id, data) => Promise.resolve({ id, ...data })),
  deleteSequence: jest.fn((id) => Promise.resolve({ success: true })),
  addStepToSequence: jest.fn((data) => Promise.resolve({ id: 'new-step-id', ...data })),
  deleteStep: jest.fn((sequenceId, stepId) => Promise.resolve({ success: true }))
}));

jest.mock('../../api/templateApi', () => ({
  getTemplates: jest.fn(() => Promise.resolve(mockTemplates))
}));

describe('FollowUpConfiguration Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders follow-up configuration component', async () => {
    render(<FollowUpConfiguration organizationId="org-123" />);
    
    // Check if the component tabs are rendered
    expect(screen.getByText('Follow-up Rules')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Sequences')).toBeInTheDocument();
    
    // Check if the "Add Rule" button is rendered
    expect(screen.getByText('Add Rule')).toBeInTheDocument();
    
    // Wait for the table to be populated with mock data
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder - 3 Days Before')).toBeInTheDocument();
      expect(screen.getByText('Due Date Notification')).toBeInTheDocument();
    });
  });

  test('switches between tabs', async () => {
    render(<FollowUpConfiguration organizationId="org-123" />);
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder - 3 Days Before')).toBeInTheDocument();
    });
    
    // Click on the Sequences tab
    fireEvent.click(screen.getByText('Follow-up Sequences'));
    
    // Check if sequences are displayed
    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up Sequence')).toBeInTheDocument();
      expect(screen.getByText('Steps:')).toBeInTheDocument();
    });
    
    // Click back on the Rules tab
    fireEvent.click(screen.getByText('Follow-up Rules'));
    
    // Check if rules are displayed again
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder - 3 Days Before')).toBeInTheDocument();
    });
  });

  test('opens add rule dialog when button is clicked', async () => {
    render(<FollowUpConfiguration organizationId="org-123" />);
    
    // Click the "Add Rule" button
    fireEvent.click(screen.getByText('Add Rule'));
    
    // Check if the dialog is opened
    await waitFor(() => {
      expect(screen.getByText('Add Follow-up Rule')).toBeInTheDocument();
      expect(screen.getByLabelText('Rule Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Trigger Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Channel')).toBeInTheDocument();
    });
  });

  test('creates a new rule when form is submitted', async () => {
    render(<FollowUpConfiguration organizationId="org-123" />);
    
    // Click the "Add Rule" button
    fireEvent.click(screen.getByText('Add Rule'));
    
    // Wait for the dialog to open
    await waitFor(() => {
      expect(screen.getByText('Add Follow-up Rule')).toBeInTheDocument();
    });
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Rule Name'), { 
      target: { value: 'New Rule' } 
    });
    
    fireEvent.change(screen.getByLabelText('Description'), { 
      target: { value: 'A new follow-up rule' } 
    });
    
    // Select template and channel
    fireEvent.mouseDown(screen.getByLabelText('Template'));
    fireEvent.click(screen.getByText('Overdue Notice Template'));
    
    fireEvent.mouseDown(screen.getByLabelText('Channel'));
    fireEvent.click(screen.getByText('Email'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Create'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Rule created successfully')).toBeInTheDocument();
    });
  });

  test('opens add sequence dialog when button is clicked', async () => {
    render(<FollowUpConfiguration organizationId="org-123" />);
    
    // Click on the Sequences tab
    fireEvent.click(screen.getByText('Follow-up Sequences'));
    
    // Wait for sequences to load
    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up Sequence')).toBeInTheDocument();
    });
    
    // Click the "Add Sequence" button
    fireEvent.click(screen.getByText('Add Sequence'));
    
    // Check if the dialog is opened
    await waitFor(() => {
      expect(screen.getByText('Add Follow-up Sequence')).toBeInTheDocument();
      expect(screen.getByLabelText('Sequence Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
  });

  test('creates a new sequence when form is submitted', async () => {
    render(<FollowUpConfiguration organizationId="org-123" />);
    
    // Click on the Sequences tab
    fireEvent.click(screen.getByText('Follow-up Sequences'));
    
    // Wait for sequences to load
    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up Sequence')).toBeInTheDocument();
    });
    
    // Click the "Add Sequence" button
    fireEvent.click(screen.getByText('Add Sequence'));
    
    // Wait for the dialog to open
    await waitFor(() => {
      expect(screen.getByText('Add Follow-up Sequence')).toBeInTheDocument();
    });
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Sequence Name'), { 
      target: { value: 'New Sequence' } 
    });
    
    fireEvent.change(screen.getByLabelText('Description'), { 
      target: { value: 'A new follow-up sequence' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Sequence created successfully')).toBeInTheDocument();
    });
  });

  test('adds a step to a sequence', async () => {
    render(<FollowUpConfiguration organizationId="org-123" />);
    
    // Click on the Sequences tab
    fireEvent.click(screen.getByText('Follow-up Sequences'));
    
    // Wait for sequences to load
    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up Sequence')).toBeInTheDocument();
    });
    
    // Click the "Add Step" button
    const addStepButtons = screen.getAllByText('Add Step');
    fireEvent.click(addStepButtons[0]);
    
    // Check if the dialog is opened
    await waitFor(() => {
      expect(screen.getByText('Add Step to Sequence')).toBeInTheDocument();
      expect(screen.getByLabelText('Step Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Rule')).toBeInTheDocument();
    });
    
    // Select a rule
    fireEvent.mouseDown(screen.getByLabelText('Rule'));
    fireEvent.click(screen.getByText(/Payment Reminder - 3 Days Before/));
    
    // Submit the form
    fireEvent.click(screen.getByText('Add Step'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Step added successfully')).toBeInTheDocument();
    });
  });
});
