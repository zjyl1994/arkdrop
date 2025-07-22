import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

export default function AppNavBar() {
    const handleLogout = async () => {
        Cookies.remove('droptoken');
        useNavigate('/login');
    }
    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        ArkDrop
                    </Typography>
                    {Cookies.get('droptoken') && <Button color="inherit" onClick={handleLogout}>Logout</Button>}
                </Toolbar>
            </AppBar>
        </Box>
    )
}
