import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import SocialFeedPage from './pages/SocialFeedPage';
import DashboardPage from './pages/DashboardPage';
import StaffPage from './pages/StaffPage';
import UsbMonitorPage from './pages/UsbMonitorPage';
import DocumentsPage from './pages/DocumentsPage';
import FaceLoginPage from './pages/FaceLoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import './App.css';


// Component bảo vệ route - kiểm tra đăng nhập
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

// Redirect dựa trên role: Admin → Dashboard, User → News Feed
function RoleBasedRedirect() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.role === 'Admin') {
      return <Navigate to="/dashboard" replace />;
    }
    // Employee/User role → News Feed
    return <Navigate to="/feed" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/face-login" element={<FaceLoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <RoleBasedRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <PrivateRoute>
                <SocialFeedPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <StaffPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/usb-monitor"
            element={
              <PrivateRoute>
                <UsbMonitorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <DocumentsPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<PrivateRoute><RoleBasedRedirect /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
