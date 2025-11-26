import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login.jsx";
import RegisterPage from "./pages/Register.jsx";
import ForgotPasswordPage from "./pages/ForgotPassword.jsx";
import ResetPasswordPage from "./pages/ResetPassword.jsx";
import WorkspaceList from "./pages/WorkspaceList.jsx";
import WorkspaceAdmin from "./pages/WorkspaceAdmin.jsx";
import Profile from "./pages/Profile.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import WorkspaceLayout from "./components/WorkspaceLayout.jsx";
import ChannelDetail from "./components/ChannelDetail.jsx";
import WorkspaceWelcome from "./components/WorkspaceWelcome.jsx";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/workspaces" element={<WorkspaceList />} />
            <Route path="/workspace/:workspaceId/admin" element={<WorkspaceAdmin />} />
            
            <Route path="/workspace/:workspaceId" element={<WorkspaceLayout />}>
              <Route index element={<WorkspaceWelcome />} />
              <Route path="channel/:channelId" element={<ChannelDetail />} />
            </Route>
            
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
