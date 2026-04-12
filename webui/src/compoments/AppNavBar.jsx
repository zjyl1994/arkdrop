import Cookies from 'js-cookie';
import {
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    Tab,
    Tabs,
} from '@mui/material';
import HomeRounded from '@mui/icons-material/HomeRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AppNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const useBottomNav = useMediaQuery(theme.breakpoints.down('sm'));
    const isAuthenticated = !!Cookies.get('droptoken');
    const showNavTabs = isAuthenticated && location.pathname !== '/login';
    const currentTab = location.pathname === '/favorites' ? '/favorites' : '/';
    const navItems = [
        { label: '全部内容', value: '/', icon: <HomeRounded /> },
        { label: '星标内容', value: '/favorites', icon: <StarRounded /> },
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
                <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 2, sm: 3 } }}>
                    <Box
                        sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            mr: { sm: 3 },
                            overflow: 'hidden',
                        }}
                    >
                        <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.2, flexShrink: 0 }}>
                            ArkDrop
                        </Typography>
                    </Box>

                    {showNavTabs && !useBottomNav && (
                        <Tabs
                            value={currentTab}
                            onChange={handleTabChange}
                            textColor="inherit"
                            indicatorColor="secondary"
                            sx={{
                                flexGrow: 1,
                                color: '#fff',
                                minHeight: 72,
                                '& .MuiTabs-flexContainer': {
                                    gap: 1,
                                },
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderRadius: 999,
                                },
                                '& .MuiTab-root': {
                                    color: 'rgba(255, 255, 255, 0.54)',
                                    minHeight: 72,
                                    minWidth: 120,
                                    fontWeight: 700,
                                    opacity: 1,
                                    transition: 'color 0.2s ease',
                                },
                                '& .Mui-selected': {
                                    color: '#fff',
                                },
                            }}
                        >
                            {navItems.map((item) => (
                                <Tab
                                    key={item.value}
                                    icon={item.icon}
                                    iconPosition="start"
                                    label={item.label}
                                    value={item.value}
                                />
                            ))}
                        </Tabs>
                    )}

                    {isAuthenticated && (
                        <Button
                            color="inherit"
                            onClick={handleLogout}
                            startIcon={<LogoutRounded />}
                            sx={{ borderRadius: 999, ml: { sm: 2 }, color: '#fff' }}
                        >
                            退出
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            {showNavTabs && useBottomNav && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: theme.zIndex.appBar,
                        overflow: 'hidden',
                        color: '#fff',
                        backgroundColor: 'rgba(63, 81, 181, 0.94)',
                        backdropFilter: 'blur(18px)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                    }}
                >
                    <BottomNavigation
                        value={currentTab}
                        onChange={handleTabChange}
                        showLabels
                        sx={{
                            color: '#fff',
                            height: 60,
                            bgcolor: 'transparent',
                            pb: 'env(safe-area-inset-bottom)',
                            '& .MuiBottomNavigationAction-root': {
                                color: 'rgba(255, 255, 255, 0.56)',
                                minWidth: 0,
                                maxWidth: 'none',
                                minHeight: 60,
                                transition: 'color 0.2s ease, transform 0.2s ease',
                            },
                            '& .MuiBottomNavigationAction-root .MuiSvgIcon-root': {
                                color: 'inherit',
                                opacity: 1,
                                fontSize: '1.35rem',
                            },
                            '& .MuiBottomNavigationAction-label': {
                                color: 'inherit',
                                opacity: 1,
                                fontSize: '0.72rem',
                            },
                            '& .Mui-selected': {
                                color: '#fff',
                                transform: 'translateY(-1px)',
                            },
                            '& .Mui-selected .MuiSvgIcon-root': {
                                color: '#fff',
                            },
                        }}
                    >
                        {navItems.map((item) => (
                            <BottomNavigationAction
                                key={item.value}
                                label={item.label}
                                value={item.value}
                                icon={item.icon}
                            />
                        ))}
                    </BottomNavigation>
                </Paper>
            )}
        </Box>
    )
}
