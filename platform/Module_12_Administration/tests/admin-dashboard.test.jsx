import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../admin-dashboard';

// Mock the component imports
jest.mock('../components/RecipientManagement', () => {
  return function MockRecipientManagement() {
    return <div data-testid="recipient-management">Recipient Management Component</div>;
  };
});

jest.mock('../components/DistributionDashboard', () => {
  return function MockDistributionDashboard() {
    return <div data-testid="distribution-dashboard">Distribution Dashboard Component</div>;
  };
});

jest.mock('../components/FollowUpConfiguration', () => {
  return function MockFollowUpConfiguration() {
    return <div data-testid="follow-up-configuration">Follow-up Configuration Component</div>;
  };
});

jest.mock('../components/TemplateManagement', () => {
  return function MockTemplateManagement() {
    return <div data-testid="template-management">Template Management Component</div>;
  };
});

describe('AdminDashboard Component', () => {
  test('renders admin dashboard with correct title', () => {
    render(<AdminDashboard />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Invoice Distribution & Follow-up Management')).toBeInTheDocument();
  });

  test('renders all tabs correctly', () => {
    render(<AdminDashboard />);
    
    // Check if all tabs are rendered
    expect(screen.getByText('Recipients')).toBeInTheDocument();
    expect(screen.getByText('Distributions')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Rules')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  test('shows recipient management component by default', () => {
    render(<AdminDashboard />);
    
    // Check if the recipient management component is visible by default
    expect(screen.getByTestId('recipient-management')).toBeInTheDocument();
    
    // Check that other components are not visible
    expect(screen.queryByTestId('distribution-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('follow-up-configuration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-management')).not.toBeInTheDocument();
  });

  test('switches to distribution dashboard when tab is clicked', () => {
    render(<AdminDashboard />);
    
    // Click on the Distributions tab
    fireEvent.click(screen.getByText('Distributions'));
    
    // Check if the distribution dashboard component is now visible
    expect(screen.getByTestId('distribution-dashboard')).toBeInTheDocument();
    
    // Check that other components are not visible
    expect(screen.queryByTestId('recipient-management')).not.toBeInTheDocument();
    expect(screen.queryByTestId('follow-up-configuration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-management')).not.toBeInTheDocument();
  });

  test('switches to follow-up configuration when tab is clicked', () => {
    render(<AdminDashboard />);
    
    // Click on the Follow-up Rules tab
    fireEvent.click(screen.getByText('Follow-up Rules'));
    
    // Check if the follow-up configuration component is now visible
    expect(screen.getByTestId('follow-up-configuration')).toBeInTheDocument();
    
    // Check that other components are not visible
    expect(screen.queryByTestId('recipient-management')).not.toBeInTheDocument();
    expect(screen.queryByTestId('distribution-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-management')).not.toBeInTheDocument();
  });

  test('switches to template management when tab is clicked', () => {
    render(<AdminDashboard />);
    
    // Click on the Templates tab
    fireEvent.click(screen.getByText('Templates'));
    
    // Check if the template management component is now visible
    expect(screen.getByTestId('template-management')).toBeInTheDocument();
    
    // Check that other components are not visible
    expect(screen.queryByTestId('recipient-management')).not.toBeInTheDocument();
    expect(screen.queryByTestId('distribution-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('follow-up-configuration')).not.toBeInTheDocument();
  });

  test('handles error state correctly', () => {
    // Create a component with error state
    const { rerender } = render(<AdminDashboard />);
    
    // Simulate an error
    rerender(<AdminDashboard error="Test error message" />);
    
    // Check if error message is displayed
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('handles loading state correctly', () => {
    // Create a component with loading state
    render(<AdminDashboard loading={true} />);
    
    // Check if loading indicator is displayed
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
