import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

export default function AppNavBar() {
    const navigate = useNavigate();
    const handleLogout = async () => {
        Cookies.remove('droptoken');
        navigate('/login');
    }
    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="fixed">
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
