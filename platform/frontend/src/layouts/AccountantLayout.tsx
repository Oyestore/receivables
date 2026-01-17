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
    useMediaQuery,
    useTheme,
    Divider,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Notifications,
    AccountCircle,
    AccountBalance,
    CompareArrows,
    Assessment,
    Upload,
    Settings,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

const AccountantLayout: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    const menuItems = [
        { text: 'Dashboard', icon: <AccountBalance />, path: '/accounting/dashboard' },
        { text: 'Reconciliation', icon: <CompareArrows />, path: '/accounting/reconciliation' },
        { text: 'Reports', icon: <Assessment />, path: '/accounting/reports' },
        { text: 'Bulk Upload', icon: <Upload />, path: '/accounting/bulk' },
        { text: 'Settings', icon: <Settings />, path: '/accounting/settings' },
    ];

    const drawer = (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap>
                    Accounting
                </Typography>
            </Toolbar>
            <Divider />
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
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    {isMobile && (
                        <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Accounting & Reconciliation
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
                variant={isMobile ? 'temporary' : 'permanent'}
                open={isMobile ? mobileOpen : true}
                onClose={() => setMobileOpen(false)}
                sx={{
                    width: drawerWidth,
                    '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                {drawer}
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default AccountantLayout;
