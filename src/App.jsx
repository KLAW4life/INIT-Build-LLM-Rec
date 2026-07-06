import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'sonner';
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import AuthenticatedLayout from '@/pages/AuthenticatedLayout';
import HubShell from '@/pages/hubs/HubShell';
import HubOverview from '@/pages/hubs/HubOverview';
import { ProtectedRoute } from '@/lib/protected-route';
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
            
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Hub routes */}
            <Route path="/hubs/:hubId" element={<HubShell />}>
              <Route index element={<HubOverview />} />
              <Route path="forms" element={<div>Forms - Coming Soon</div>} />
              <Route path="teams" element={<div>Teams - Coming Soon</div>} />
              <Route path="roles" element={<div>Roles - Coming Soon</div>} />
            </Route>
          </Route>  
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;