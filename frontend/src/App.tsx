import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/layouts/AppShell';
import { ProtectedLayout } from '@/layouts/ProtectedLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Funds } from '@/pages/Funds';
import { Holdings } from '@/pages/Holdings';
import { Orders } from '@/pages/Orders';
import { SignIn } from '@/pages/SignIn';
import { SignUp } from '@/pages/SignUp';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route element={<ProtectedLayout />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/holdings" element={<Holdings />} />
          <Route path="/funds" element={<Funds />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
