import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileApp from '../components/MobileApp';
import { UserContext } from '../contexts/UserContext';

// Mock the recharts library
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    Bar: () => <div data-testid="bar" />,
    Pie: () => <div data-testid="pie" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    Cell: () => <div data-testid="cell" />,
  };
});

// Mock the AdvancedAnalyticsDashboard component
jest.mock('../components/AdvancedAnalyticsDashboard', () => {
  return function MockAdvancedAnalyticsDashboard() {
    return <div data-testid="analytics-dashboard">Analytics Dashboard Content</div>;
  };
});

// Mock user context
const mockUserContext = {
  admin: { user: { id: '1', name: 'Admin User', role: 'admin' } },
  financeManager: { user: { id: '2', name: 'Finance Manager', role: 'financeManager' } },
  arSpecialist: { user: { id: '3', name: 'AR Specialist', role: 'arSpecialist' } },
  executive: { user: { id: '4', name: 'Executive', role: 'executive' } },
};

describe('MobileApp', () => {
  // Test loading state
  test('displays loading state initially', () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  // Test dashboard tab rendering
  test('renders dashboard tab correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Should be on dashboard tab by default
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Invoice Summary')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });
  
  // Test invoices tab
  test('switches to invoices tab correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Click on invoices tab
    fireEvent.click(screen.getByText('Invoices'));
    
    // Should show invoices content
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getAllByText('View').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Send Follow-up').length).toBeGreaterThan(0);
  });
  
  // Test notifications tab
  test('switches to notifications tab correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Click on notifications tab
    fireEvent.click(screen.getByText('Notifications'));
    
    // Should show notifications content
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getAllByText('Mark as read').length).toBeGreaterThan(0);
  });
  
  // Test analytics tab
  test('switches to analytics tab correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Click on analytics tab
    fireEvent.click(screen.getByText('Analytics'));
    
    // Should show analytics content
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics Dashboard Content')).toBeInTheDocument();
  });
  
  // Test drawer menu
  test('opens and closes drawer menu correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Open drawer menu
    fireEvent.click(screen.getByLabelText('menu'));
    
    // Drawer should be visible with user info and navigation options
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Close drawer by clicking on an item
    fireEvent.click(screen.getByText('Settings'));
    
    // Drawer should be closed
    await waitFor(() => {
      expect(screen.queryByText('admin')).not.toBeInTheDocument();
    });
  });
  
  // Test invoice filtering
  test('filters invoices correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Go to invoices tab
    fireEvent.click(screen.getByText('Invoices'));
    
    // Open filter drawer
    fireEvent.click(screen.getByLabelText('filter'));
    
    // Select overdue filter
    fireEvent.click(screen.getByText('Overdue'));
    
    // Apply filters
    fireEvent.click(screen.getByText('Apply'));
    
    // Should only show overdue invoices
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Paid')).not.toBeInTheDocument();
    
    // Open filter drawer again
    fireEvent.click(screen.getByLabelText('filter'));
    
    // Reset filters
    fireEvent.click(screen.getByText('Reset'));
    
    // Apply filters
    fireEvent.click(screen.getByText('Apply'));
    
    // Should show all invoices again
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
  });
  
  // Test invoice actions
  test('handles invoice actions correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Go to invoices tab
    fireEvent.click(screen.getByText('Invoices'));
    
    // Click view button on first invoice
    fireEvent.click(screen.getAllByText('View')[0]);
    
    // Should show action message
    expect(screen.getByText(/View details action triggered for invoice/)).toBeInTheDocument();
    
    // Click send follow-up button on first invoice
    fireEvent.click(screen.getAllByText('Send Follow-up')[0]);
    
    // Should show action message
    expect(screen.getByText(/Send follow-up action triggered for invoice/)).toBeInTheDocument();
  });
  
  // Test notification actions
  test('handles notification actions correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Go to notifications tab
    fireEvent.click(screen.getByText('Notifications'));
    
    // Get initial count of "Mark as read" buttons
    const initialMarkAsReadCount = screen.getAllByText('Mark as read').length;
    
    // Click mark as read button on first notification
    fireEvent.click(screen.getAllByText('Mark as read')[0]);
    
    // Should show success message
    expect(screen.getByText('Notification marked as read')).toBeInTheDocument();
    
    // Should have one less "Mark as read" button
    expect(screen.getAllByText('Mark as read').length).toBe(initialMarkAsReadCount - 1);
  });
  
  // Test refresh functionality
  test('refreshes data correctly', async () => {
    render(
      <UserContext.Provider value={mockUserContext.admin}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Go to invoices tab
    fireEvent.click(screen.getByText('Invoices'));
    
    // Click refresh button
    fireEvent.click(screen.getByLabelText('refresh'));
    
    // Should show loading indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Wait for refresh to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Should show success message
    expect(screen.getByText('Data refreshed successfully')).toBeInTheDocument();
  });
  
  // Test role-based content
  test('displays role-appropriate content', async () => {
    // Render for AR specialist role
    render(
      <UserContext.Provider value={mockUserContext.arSpecialist}>
        <MobileApp />
      </UserContext.Provider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Open drawer menu
    fireEvent.click(screen.getByLabelText('menu'));
    
    // Should show AR specialist role
    expect(screen.getByText('arSpecialist')).toBeInTheDocument();
    
    // Close drawer
    fireEvent.click(screen.getByText('Dashboard'));
    
    // Go to analytics tab
    fireEvent.click(screen.getByText('Analytics'));
    
    // Should show analytics dashboard with appropriate content
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
  });
});
