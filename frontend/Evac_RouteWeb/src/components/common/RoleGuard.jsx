import { useAuth } from '../../context/AuthContext';

export default function RoleGuard({ allowedRoles, fallback = null, children }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback;
  }

  return <>{children}</>;
}
