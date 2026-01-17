import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Typography,
    Divider,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Gavel as GavelIcon,
    MonetizationOn as MoneyIcon,
    People as PeopleIcon,
    Assessment as AnalyticsIcon,
    CheckCircle as ApprovalIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Disputes', icon: <GavelIcon />, path: '/disputes' },
    { text: 'Collections', icon: <MoneyIcon />, path: '/collections' },
    { text: 'Approvals', icon: <ApprovalIcon />, path: '/approvals' },
    { text: 'Legal Network', icon: <PeopleIcon />, path: '/legal/directory' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Logo/Brand */}
            <Box sx={{ p: 3 }}>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, hsl(210, 100%, 56%), hsl(280, 100%, 65%))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Dispute Resolver
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Legal Network Platform
                </Typography>
            </Box>

            <Divider sx={{ borderColor: 'divider' }} />

            {/* Navigation Menu */}
            <List sx={{ flexGrow: 1, pt: 2 }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <ListItem key={item.text} disablePadding sx={{ px: 2, mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => handleNavigation(item.path)}
                                sx={{
                                    borderRadius: 2,
                                    py: 1.5,
                                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                                    color: isActive ? 'primary.contrastText' : 'text.primary',
                                    '&:hover': {
                                        backgroundColor: isActive ? 'primary.dark' : 'background.paper',
                                    },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: isActive ? 'primary.contrastText' : 'text.secondary',
                                        minWidth: 40,
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: isActive ? 600 : 400,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                    Module 08 v1.0.0
                </Typography>
            </Box>
        </Box>
    );

    return (
        <Drawer
            variant={isMobile ? 'temporary' : 'permanent'}
            open={isMobile ? mobileOpen : true}
            onClose={() => setMobileOpen(false)}
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    backgroundColor: 'background.paper',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                },
            }}
        >
            {drawerContent}
        </Drawer>
    );
}
