import { useAuth } from '../../context/AuthContext';

export default function RoleGuard({ allowedRoles, allowedOperatorTypes, fallback = null, children }) {
  const { user } = useAuth();

  if (!user) return fallback;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return fallback;
  }

  // Super admins have unrestricted access across all operator modules
  if (allowedOperatorTypes && user.role !== 'admin') {
    const userOpType = user.operator_type || 'general';
    if (!allowedOperatorTypes.includes(userOpType)) {
      return fallback;
    }
  }

  return <>{children}</>;
}

