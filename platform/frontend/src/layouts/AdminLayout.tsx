import React from 'react';
import { Outlet } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Divider,
} from '@mui/material';
import {
    Notifications,
    AccountCircle,
    Dashboard,
    SupervisorAccount,
    Business,
    SettingsApplications,
    ListAlt,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 260;

const AdminLayout: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, path: '/admin/dashboard' },
        { text: 'User Management', icon: <SupervisorAccount />, path: '/admin/users' },
        { text: 'Tenant Management', icon: <Business />, path: '/admin/tenants' },
        { text: 'System Config', icon: <SettingsApplications />, path: '/admin/system' },
        { text: 'System Logs', icon: <ListAlt />, path: '/admin/logs' },
    ];

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Platform Administration
                    </Typography>
                    <IconButton color="inherit">
                        <Notifications />
                    </IconButton>
                    <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <AccountCircle />
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                        <MenuItem>Profile</MenuItem>
                        <MenuItem>Settings</MenuItem>
                        <MenuItem>Logout</MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto', mt: 2 }}>
                    <List>
                        {menuItems.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <ListItemButton onClick={() => navigate(item.path)}>
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>
                        System Status
                    </Typography>
                    <List dense>
                        <ListItem>
                            <ListItemText
                                primary="API Server"
                                secondary="Operational (98%)"
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Database"
                                secondary="Healthy (99%)"
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                            />
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout;
