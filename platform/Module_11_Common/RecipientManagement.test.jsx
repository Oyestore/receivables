import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipientManagement from '../RecipientManagement';

// Mock data
const mockRecipients = [
  {
    id: 'rec-1',
    recipientName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    whatsappNumber: '+1234567890',
    preferredChannel: 'EMAIL',
    organizationId: 'org-123'
  },
  {
    id: 'rec-2',
    recipientName: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+0987654321',
    whatsappNumber: '+0987654321',
    preferredChannel: 'WHATSAPP',
    organizationId: 'org-123'
  }
];

// Mock API calls
jest.mock('../../api/recipientApi', () => ({
  getRecipients: jest.fn(() => Promise.resolve(mockRecipients)),
  createRecipient: jest.fn((data) => Promise.resolve({ id: 'new-id', ...data })),
  updateRecipient: jest.fn((id, data) => Promise.resolve({ id, ...data })),
  deleteRecipient: jest.fn((id) => Promise.resolve({ success: true }))
}));

describe('RecipientManagement Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders recipient management component', async () => {
    render(<RecipientManagement organizationId="org-123" />);
    
    // Check if the component title is rendered
    expect(screen.getByText('Recipient Management')).toBeInTheDocument();
    
    // Check if the "Add Recipient" button is rendered
    expect(screen.getByText('Add Recipient')).toBeInTheDocument();
    
    // Wait for the table to be populated with mock data
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  test('opens add recipient dialog when button is clicked', async () => {
    render(<RecipientManagement organizationId="org-123" />);
    
    // Click the "Add Recipient" button
    fireEvent.click(screen.getByText('Add Recipient'));
    
    // Check if the dialog is opened
    await waitFor(() => {
      expect(screen.getByText('Add Recipient')).toBeInTheDocument();
      expect(screen.getByLabelText('Recipient Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('WhatsApp Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Preferred Channel')).toBeInTheDocument();
    });
  });

  test('adds a new recipient when form is submitted', async () => {
    render(<RecipientManagement organizationId="org-123" />);
    
    // Click the "Add Recipient" button
    fireEvent.click(screen.getByText('Add Recipient'));
    
    // Fill in the form
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('Recipient Name'), { target: { value: 'New Recipient' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new.recipient@example.com' } });
      fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '+1122334455' } });
      fireEvent.change(screen.getByLabelText('WhatsApp Number'), { target: { value: '+1122334455' } });
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Recipient created successfully')).toBeInTheDocument();
    });
  });

  test('edits an existing recipient', async () => {
    render(<RecipientManagement organizationId="org-123" />);
    
    // Wait for the table to be populated
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Click the edit button for the first recipient
    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);
    
    // Check if the dialog is opened with the recipient's data
    await waitFor(() => {
      expect(screen.getByText('Edit Recipient')).toBeInTheDocument();
      expect(screen.getByLabelText('Recipient Name').value).toBe('John Doe');
      expect(screen.getByLabelText('Email').value).toBe('john.doe@example.com');
    });
    
    // Change the recipient's name
    fireEvent.change(screen.getByLabelText('Recipient Name'), { target: { value: 'John Doe Updated' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Update'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Recipient updated successfully')).toBeInTheDocument();
    });
  });

  test('deletes a recipient', async () => {
    render(<RecipientManagement organizationId="org-123" />);
    
    // Wait for the table to be populated
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Click the delete button for the first recipient
    const deleteButtons = screen.getAllByTestId('delete-button');
    fireEvent.click(deleteButtons[0]);
    
    // Check if confirmation dialog is shown
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete this recipient?')).toBeInTheDocument();
    });
    
    // Confirm deletion
    fireEvent.click(screen.getByText('Confirm'));
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Recipient deleted successfully')).toBeInTheDocument();
    });
  });
});
