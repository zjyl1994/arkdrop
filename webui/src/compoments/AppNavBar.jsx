import Cookies from 'js-cookie';
import { Drawer, ListItemButton } from '@mui/material';
import ClearAllRounded from '@mui/icons-material/ClearAllRounded';
import GridView from '@mui/icons-material/GridView';
import HomeRounded from '@mui/icons-material/HomeRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import ViewList from '@mui/icons-material/ViewList';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePageActions } from '../contexts/PageActionsContext';

export default function AppNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { pageActions } = usePageActions();
    const isAuthenticated = !!Cookies.get('droptoken');
    const showAppShell = isAuthenticated && location.pathname !== '/login';
    const showPageActions = showAppShell && pageActions.hasPageActions;
    const currentTab = location.pathname === '/favorites' ? '/favorites' : '/';
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navItems = [
        { label: '内容主页', value: '/', icon: <HomeRounded /> },
        { label: '收藏视图', value: '/favorites', icon: <StarRounded /> },
    ];
    const pageActionItems = [
        {
            label: pageActions.viewMode === 'list' ? '切换为图库' : '切换为列表',
            icon: pageActions.viewMode === 'list' ? <GridView /> : <ViewList />,
            onClick: pageActions.onToggleView,
        },
        {
            label: pageActions.cleanLabel || '清空列表',
            icon: <ClearAllRounded />,
            onClick: pageActions.onClean,
        },
    ];
    const drawerWidth = 'min(82vw, 248px)';

    const handleDrawerOpen = () => {
        setDrawerOpen(true);
    };

    const handleDrawerClose = () => {
        setDrawerOpen(false);
    };

    const handleNavigate = (value) => {
        navigate(value);
        handleDrawerClose();
    };

    const handleLogout = async () => {
        handleDrawerClose();
        Cookies.remove('droptoken');
        navigate('/login');
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
                <Toolbar sx={{ minHeight: { xs: 54, sm: 56 }, px: { xs: 1, sm: 1.5 } }}>
                    {showAppShell && (
                        <Tooltip title="打开导航">
                            <IconButton
                                color="inherit"
                                aria-label="打开导航抽屉"
                                onClick={handleDrawerOpen}
                                size="small"
                                sx={{
                                    mr: 0.5,
                                    p: { xs: 0.75, sm: 0.6 },
                                    color: 'rgba(255, 255, 255, 0.82)',
                                    '& .MuiSvgIcon-root': {
                                        fontSize: { xs: '1.2rem', sm: '1.1rem' },
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        color: '#fff',
                                    },
                                }}
                            >
                                <MenuRounded />
                            </IconButton>
                        </Tooltip>
                    )}

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
                                fontSize: { xs: '0.95rem', sm: '0.98rem' },
                                flexShrink: 0,
                            }}
                        >
                            ArkDrop
                        </Typography>
                    </Box>

                    {showPageActions && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.125,
                            }}
                        >
                            {pageActionItems.map((item) => (
                                <Tooltip key={item.label} title={item.label}>
                                    <IconButton
                                        color="inherit"
                                        aria-label={item.label}
                                        onClick={item.onClick}
                                        size="small"
                                        disabled={!item.onClick}
                                        sx={{
                                            p: { xs: 0.75, sm: 0.6 },
                                            color: 'rgba(255, 255, 255, 0.56)',
                                            '& .MuiSvgIcon-root': {
                                                fontSize: { xs: '1.15rem', sm: '1.08rem' },
                                            },
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                color: 'rgba(255, 255, 255, 0.88)',
                                            },
                                            '&.Mui-disabled': {
                                                color: 'rgba(255, 255, 255, 0.32)',
                                            },
                                        }}
                                    >
                                        {item.icon}
                                    </IconButton>
                                </Tooltip>
                            ))}
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            {showAppShell && (
                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    onClose={handleDrawerClose}
                    transitionDuration={{ enter: 180, exit: 120 }}
                    PaperProps={{
                        sx: {
                            width: drawerWidth,
                            maxWidth: 'calc(100vw - 12px)',
                            backgroundImage: 'none',
                            backgroundColor: 'background.paper',
                            boxShadow: '0 14px 36px rgba(15, 23, 42, 0.18)',
                        },
                    }}
                >
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ px: 2, pt: 2.25, pb: 1.75 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    letterSpacing: '0.02em',
                                    lineHeight: 1,
                                }}
                            >
                                ArkDrop
                            </Typography>
                        </Box>

                        <Divider />

                        <List sx={{ px: 1, py: 1 }}>
                            {navItems.map((item) => {
                                const selected = currentTab === item.value;
                                return (
                                    <ListItemButton
                                        key={item.value}
                                        selected={selected}
                                        onClick={() => handleNavigate(item.value)}
                                        sx={{
                                            minHeight: 44,
                                            px: 1.5,
                                            borderRadius: 2,
                                            mb: 0.5,
                                            transition: 'background-color 0.18s ease, color 0.18s ease',
                                            '&.Mui-selected': {
                                                backgroundColor: 'rgba(63, 81, 181, 0.16)',
                                                color: 'primary.main',
                                                boxShadow: 'inset 0 0 0 1px rgba(63, 81, 181, 0.1)',
                                            },
                                            '&.Mui-selected:hover': {
                                                backgroundColor: 'rgba(63, 81, 181, 0.2)',
                                            },
                                            '&:hover': {
                                                backgroundColor: 'rgba(63, 81, 181, 0.06)',
                                            },
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36, color: selected ? 'primary.main' : 'text.secondary' }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{
                                                fontSize: '0.95rem',
                                                fontWeight: selected ? 700 : 500,
                                            }}
                                        />
                                    </ListItemButton>
                                );
                            })}
                        </List>

                        <Box sx={{ flexGrow: 1 }} />

                        <Divider />

                        <List sx={{ px: 1, py: 1, pb: 'calc(8px + env(safe-area-inset-bottom))' }}>
                            <ListItemButton
                                onClick={handleLogout}
                                sx={{
                                    minHeight: 44,
                                    borderRadius: 2,
                                    color: 'text.secondary',
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                                    <LogoutRounded />
                                </ListItemIcon>
                                <ListItemText
                                    primary="退出登录"
                                    primaryTypographyProps={{
                                        fontSize: '0.95rem',
                                        fontWeight: 500,
                                    }}
                                />
                            </ListItemButton>
                        </List>
                    </Box>
                </Drawer>
            )}
        </Box>
    )
}
