import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import { authService } from '../services/auth';
import { attendanceService } from '../services/attendanceService';
import styles from './LeftSidebar.module.css';

export default function LeftSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Theme State
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
            document.documentElement.classList.add('dark');
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    const user = authService.getCurrentUser();
    // Admin detection: check role (case-insensitive) or if username is 'admin'
    const isAdmin = user?.role?.toLowerCase().includes('admin') ||
        user?.username?.toLowerCase() === 'admin';

    const navItems = [
        ...(isAdmin ? [{ icon: 'monitoring', label: 'Dashboard', path: '/dashboard' }] : []),
        { icon: 'dynamic_feed', label: 'Bảng tin', path: '/feed' },
        { icon: 'people', label: 'Nhân sự', path: '/staff' },
        { icon: 'folder_shared', label: 'Kho tài liệu', path: '/library' },
        { icon: 'groups', label: 'Nhóm', path: '/groups' },
        { icon: 'videocam', label: 'Họp trực tuyến', path: '/meet' },
        { icon: 'event_available', label: 'Chấm công', path: '/attendance', special: true },
        { icon: 'person', label: 'Cá nhân', path: '/profile' },
    ];

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <aside className={styles.sidebar}>
            {/* Nav */}
            <nav className={styles.nav}>
                {navItems.map(item => {
                    const isActive = location.pathname === item.path ||
                        (item.path === '/feed' && location.pathname === '/');
                    return (
                        <button
                            key={item.path}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            onClick={async () => {
                                if (item.special && item.path === '/attendance') {
                                    try {
                                        const res = await attendanceService.checkCanCheckIn();
                                        if (!res.canCheckIn) {
                                            message.warning("Bạn phải kết nối vào mạng WiFi (IP) được chỉ định để chấm công");
                                            return;
                                        }
                                    } catch (e) {
                                        message.error("Lỗi khi kiểm tra kết nối mạng");
                                        return;
                                    }
                                }
                                navigate(item.path);
                            }}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                        </button>
                    );
                })}

                {/* Theme Toggle */}
                <button 
                    onClick={toggleTheme}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                        borderRadius: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
                        color: isDark ? '#cbd5e1' : '#475569', fontSize: '13px', fontWeight: 600,
                        fontFamily: 'Inter, sans-serif', width: '100%', transition: 'all 0.15s ease', marginTop: 'auto'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? '#1e293b' : '#f1f5f9';
                        e.currentTarget.style.color = isDark ? '#f1f5f9' : '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = isDark ? '#cbd5e1' : '#475569';
                    }}
                >
                    <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
                    <span>{isDark ? 'Giao diện Tối' : 'Giao diện Sáng'}</span>
                </button>
            </nav>

            {/* Logout */}
            <button className={styles.logoutBtn} onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                <span>Đăng xuất</span>
            </button>
        </aside>
    );
}
