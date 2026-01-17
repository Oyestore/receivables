import { AppBar, Toolbar, Typography, Box, IconButton, Avatar } from '@mui/material';
import { Notifications as NotificationsIcon, Settings as SettingsIcon } from '@mui/icons-material';

export default function Header() {
    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                backgroundColor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
                    {/* Page title will be handled by individual pages */}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton color="inherit" sx={{ color: 'text.secondary' }}>
                        <NotificationsIcon />
                    </IconButton>
                    <IconButton color="inherit" sx={{ color: 'text.secondary' }}>
                        <SettingsIcon />
                    </IconButton>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, ml: 1 }}>
                        U
                    </Avatar>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
