import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login.jsx";
import RegisterPage from "./pages/Register.jsx";
import ForgotPasswordPage from "./pages/ForgotPassword.jsx";
import ResetPasswordPage from "./pages/ResetPassword.jsx";
import WorkspaceList from "./pages/WorkspaceList.jsx";
import Profile from "./pages/Profile.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import WorkspaceLayout from "./components/WorkspaceLayout.jsx";
import ChannelDetail from "./components/ChannelDetail.jsx";
import WorkspaceWelcome from "./components/WorkspaceWelcome.jsx";
import DirectMessageChat from "./components/DirectMessageChat.jsx";

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

            <Route path="/workspace/:workspaceId" element={<WorkspaceLayout />}>
              <Route index element={<WorkspaceWelcome />} />
              <Route path="channel/:channelId" element={<ChannelDetail />} />
              <Route
                path="dm/:conversationId"
                element={<DirectMessageChat />}
              />
            </Route>

            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
