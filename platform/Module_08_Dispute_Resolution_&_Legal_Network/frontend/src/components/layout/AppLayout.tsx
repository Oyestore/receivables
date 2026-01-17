import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'background.default',
                }}
            >
                <Header />
                <Box
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        maxWidth: '1400px',
                        width: '100%',
                        mx: 'auto',
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
