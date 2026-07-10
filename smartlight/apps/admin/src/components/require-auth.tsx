import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/auth-context';
import { FullPageSpinner } from '@smartlight/ui';

export interface RequireAdminAuthProps {
  children: JSX.Element;
}

export const RequireAdminAuth = ({
  children,
}: RequireAdminAuthProps): JSX.Element => {
  const { isAuthenticated, isBootstrapping } = useAdminAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <FullPageSpinner />;
  }
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return children;
};