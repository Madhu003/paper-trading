import { Navigate, Outlet } from 'react-router-dom';

/** Redirects to sign-in when no JWT; otherwise renders nested routes. */
export function ProtectedLayout() {
  if (!localStorage.getItem('token')) {
    return <Navigate to="/signin" replace />;
  }
  return <Outlet />;
}
