import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplateManagement from '../TemplateManagement';

// Mock data
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
    organizationId: 'org-123',
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
    organizationId: 'org-123',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock API calls
jest.mock('../../api/templateApi', () => ({
  getTemplates: jest.fn(() => Promise.resolve(mockTemplates)),
  createTemplate: jest.fn((data) => Promise.resolve({ id: 'new-template-id', ...data })),
  updateTemplate: jest.fn((id, data) => Promise.resolve({ id, ...data })),
  deleteTemplate: jest.fn((id) => Promise.resolve({ success: true })),
  duplicateTemplate: jest.fn((id) => Promise.resolve({ 
    id: 'duplicated-id', 
    ...mockTemplates.find(t => t.id === id),
    name: mockTemplates.find(t => t.id === id).name + ' (Copy)'
  }))
}));

describe('TemplateManagement Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders template management component', async () => {
    render(<TemplateManagement organizationId="org-123" />);
    
    // Check if the component title is rendered
    expect(screen.getByText('Message Templates')).toBeInTheDocument();
    
    // Check if the "Create Template" button is rendered
    expect(screen.getByText('Create Template')).toBeInTheDocument();
    
    // Wait for the templates to be populated with mock data
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder Template')).toBeInTheDocument();
      expect(screen.getByText('Due Date Template')).toBeInTheDocument();
    });
    
    // Check if tabs are rendered
    expect(screen.getByText('All Templates')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
  });

  test('switches between tabs', async () => {
    render(<TemplateManagement organizationId="org-123" />);
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder Template')).toBeInTheDocument();
    });
    
    // Click on the Email tab
    fireEvent.click(screen.getByText('Email'));
    
    // Check if only email templates are displayed
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder Template')).toBeInTheDocument();
      expect(screen.getByText('Due Date Template')).toBeInTheDocument();
    });
    
    // Add a WhatsApp template to the mock data
    const whatsappTemplate = {
      id: 'template-3',
      name: 'WhatsApp Reminder',
      description: 'A reminder for WhatsApp',
      subject: '',
      content: 'Hello {recipientName}, your invoice {invoiceNumber} is due soon.',
      channel: 'WHATSAPP',
      organizationId: 'org-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Override the mock implementation for this test
    require('../../api/templateApi').getTemplates.mockImplementation(() => 
      Promise.resolve([...mockTemplates, whatsappTemplate])
    );
    
    // Click on the WhatsApp tab
    fireEvent.click(screen.getByText('WhatsApp'));
    
    // Check if only WhatsApp templates are displayed
    await waitFor(() => {
      expect(screen.getByText('WhatsApp Reminder')).toBeInTheDocument();
      expect(screen.queryByText('Payment Reminder Template')).not.toBeInTheDocument();
    });
  });

  test('opens create template dialog when button is clicked', async () => {
    render(<TemplateManagement organizationId="org-123" />);
    
    // Click the "Create Template" button
    fireEvent.click(screen.getByText('Create Template'));
    
    // Check if the dialog is opened
    await waitFor(() => {
      expect(screen.getByText('Create Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Channel')).toBeInTheDocument();
      expect(screen.getByLabelText('Content')).toBeInTheDocument();
    });
  });

  test('creates a new template when form is submitted', async () => {
    render(<TemplateManagement organizationId="org-123" />);
    
    // Click the "Create Template" button
    fireEvent.click(screen.getByText('Create Template'));
    
    // Wait for the dialog to open
    await waitFor(() => {
      expect(screen.getByText('Create Template')).toBeInTheDocument();
    });
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Template Name'), { 
      target: { value: 'New Template' } 
    });
    
    fireEvent.change(screen.getByLabelText('Description'), { 
      target: { value: 'A new message template' } 
    });
    
    // Select channel
    fireEvent.mouseDown(screen.getByLabelText('Channel'));
    fireEvent.click(screen.getByText('Email'));
    
    // Fill in subject and content
    fireEvent.change(screen.getByLabelText('Subject Line'), { 
      target: { value: 'New Subject {invoiceNumber}' } 
    });
    
    fireEvent.change(screen.getByLabelText('Content'), { 
      target: { value: 'Hello {recipientName}, this is a test template.' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Template created successfully')).toBeInTheDocument();
    });
  });

  test('opens preview dialog when preview button is clicked', async () => {
    render(<TemplateManagement organizationId="org-123" />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder Template')).toBeInTheDocument();
    });
    
    // Find and click the preview button for the first template
    const previewButtons = screen.getAllByTestId('preview-button');
    fireEvent.click(previewButtons[0]);
    
    // Check if the preview dialog is opened
    await waitFor(() => {
      expect(screen.getByText('Template Preview: Payment Reminder Template')).toBeInTheDocument();
      expect(screen.getByText('Preview Data:')).toBeInTheDocument();
      expect(screen.getByText('Preview:')).toBeInTheDocument();
    });
    
    // Check if preview data fields are present
    expect(screen.getByLabelText('Recipient Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Invoice Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
  });

  test('duplicates a template when duplicate button is clicked', async () => {
    render(<TemplateManagement organizationId="org-123" />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder Template')).toBeInTheDocument();
    });
    
    // Find and click the duplicate button for the first template
    const duplicateButtons = screen.getAllByTestId('duplicate-button');
    fireEvent.click(duplicateButtons[0]);
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Template duplicated successfully')).toBeInTheDocument();
    });
  });

  test('deletes a template when delete button is clicked', async () => {
    render(<TemplateManagement organizationId="org-123" />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Payment Reminder Template')).toBeInTheDocument();
    });
    
    // Find and click the delete button for the first template
    const deleteButtons = screen.getAllByTestId('delete-button');
    fireEvent.click(deleteButtons[0]);
    
    // Check if confirmation dialog is shown
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete this template?')).toBeInTheDocument();
    });
    
    // Confirm deletion
    fireEvent.click(screen.getByText('Confirm'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Template deleted successfully')).toBeInTheDocument();
    });
  });
});
