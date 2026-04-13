import Cookies from 'js-cookie';
import HomeRounded from '@mui/icons-material/HomeRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AppNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = !!Cookies.get('droptoken');
    const showNavActions = isAuthenticated && location.pathname !== '/login';
    const currentTab = location.pathname === '/favorites' ? '/favorites' : '/';
    const navItems = [
        { label: '内容主页', value: '/', icon: <HomeRounded /> },
        { label: '收藏视图', value: '/favorites', icon: <StarRounded /> },
    ];

    const handleLogout = async () => {
        Cookies.remove('droptoken');
        navigate('/login');
    }

    const handleTabChange = (_, nextValue) => {
        navigate(nextValue);
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar
                position="fixed"
                color="transparent"
                elevation={0}
                sx={{
                    color: '#fff',
                    backdropFilter: 'blur(18px)',
                    backgroundColor: 'rgba(63, 81, 181, 0.86)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                }}
            >
                <Toolbar sx={{ minHeight: { xs: 48, sm: 52 }, px: { xs: 1, sm: 1.5 } }}>
                    <Box
                        sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            mr: 0.5,
                            overflow: 'hidden',
                        }}
                    >
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1,
                                fontSize: { xs: '0.9rem', sm: '0.95rem' },
                                flexShrink: 0,
                            }}
                        >
                            ArkDrop
                        </Typography>
                    </Box>

                    {showNavActions && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.125,
                                mr: 0.125,
                            }}
                        >
                            {navItems.map((item) => (
                                <Tooltip key={item.value} title={item.label}>
                                    <IconButton
                                        color="inherit"
                                        aria-label={item.label}
                                        size="small"
                                        onClick={() => handleTabChange(null, item.value)}
                                        sx={{
                                            p: 0.5,
                                            color: currentTab === item.value
                                                ? '#fff'
                                                : 'rgba(255, 255, 255, 0.68)',
                                            transition: 'color 0.2s ease, transform 0.2s ease',
                                            '& .MuiSvgIcon-root': {
                                                fontSize: { xs: '1rem', sm: '1.05rem' },
                                            },
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                                transform: 'translateY(-1px)',
                                            },
                                        }}
                                    >
                                        {item.icon}
                                    </IconButton>
                                </Tooltip>
                            ))}
                        </Box>
                    )}

                    {isAuthenticated && (
                        <Tooltip title="退出登录">
                            <IconButton
                                color="inherit"
                                aria-label="退出登录"
                                onClick={handleLogout}
                                size="small"
                                sx={{
                                    p: 0.5,
                                    color: 'rgba(255, 255, 255, 0.72)',
                                    '& .MuiSvgIcon-root': {
                                        fontSize: { xs: '1rem', sm: '1.05rem' },
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        color: '#fff',
                                    },
                                }}
                            >
                                <LogoutRounded />
                            </IconButton>
                        </Tooltip>
                    )}
                </Toolbar>
            </AppBar>
        </Box>
    )
}
