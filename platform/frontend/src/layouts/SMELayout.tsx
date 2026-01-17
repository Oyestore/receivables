import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    BottomNavigation,
    BottomNavigationAction,
    Menu,
    MenuItem,
    useMediaQuery,
    useTheme,
    Paper,
} from '@mui/material';
import {
    Notifications,
    AccountCircle,
} from '@mui/icons-material';
import { Home, Users, FileText, Settings, CreditCard, BarChart3, Menu as MenuIcon, X, Target, MessageSquare, GitCompare, Ship, Globe2, Brain, Activity, TrendingUp, DollarSign, Shield, Megaphone, Bell, UserCog } from 'lucide-react';

const SMELayout: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const [value, setValue] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const bottomNavItems = [
        // Core Dashboards
        { path: '/sme/dashboard', label: 'Dashboard', icon: Home },
        { path: '/sme/invoices-new', label: 'Invoices', icon: FileText },
        { path: '/sme/payments-new', label: 'Payments', icon: CreditCard },
        { path: '/sme/analytics-new', label: 'Analytics', icon: TrendingUp },

        // Financial Services
        { path: '/sme/credit-scoring', label: 'Credit Score', icon: Shield },
        { path: '/sme/financing-new', label: 'Financing', icon: DollarSign },

        // Operations
        { path: '/sme/disputes-new', label: 'Disputes', icon: MessageSquare },
        { path: '/sme/marketing-new', label: 'Marketing', icon: Megaphone },
        { path: '/sme/notifications', label: 'Notifications', icon: Bell },

        // Advanced Modules
        { path: '/sme/milestones', label: 'Milestones', icon: Target },
        { path: '/sme/concierge', label: 'Concierge', icon: MessageSquare },
        { path: '/sme/reconciliation', label: 'Reconciliation', icon: GitCompare },
        { path: '/sme/cross-border-trade', label: 'Cross-Border', icon: Ship },
        { path: '/sme/globalization', label: 'Global', icon: Globe2 },
        { path: '/sme/credit-decisioning', label: 'Decisions', icon: Brain },
        { path: '/sme/orchestration', label: 'Orchestration', icon: Activity },

        // Administration
        { path: '/sme/administration', label: 'Admin', icon: UserCog },
    ];

    const handleNavChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
        navigate(bottomNavItems[newValue].path);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Top App Bar */}
            <AppBar position="fixed" sx={{ top: 0, bottom: 'auto' }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Cash Flow
                    </Typography>
                    <IconButton color="inherit">
                        <Notifications />
                    </IconButton>
                    <IconButton
                        color="inherit"
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                    >
                        <AccountCircle />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                    >
                        <MenuItem>Profile</MenuItem>
                        <MenuItem>Settings</MenuItem>
                        <MenuItem>Logout</MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    mt: 7,
                    mb: isMobile ? 7 : 0,
                    bgcolor: 'grey.50',
                }}
            >
                <Outlet />
            </Box>

            {/* Bottom Navigation (Mobile Only) */}
            {isMobile && (
                <Paper
                    sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
                    elevation={3}
                >
                    <BottomNavigation value={value} onChange={handleNavChange} showLabels>
                        {bottomNavItems.map((item, index) => (
                            <BottomNavigationAction
                                key={index}
                                label={item.label}
                                icon={<item.icon />}
                            />
                        ))}
                    </BottomNavigation>
                </Paper>
            )}
        </Box>
    );
};

export default SMELayout;
