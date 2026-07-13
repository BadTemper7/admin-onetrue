import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

const PermissionRoute = ({ moduleName, action = "view", children }) => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  if (["super_admin", "admin"].includes(role)) return children;

  const modulePermissions = user?.permissions?.[moduleName];
  if (modulePermissions?.[action]) return children;

  return <Navigate to="/dashboard" replace />;
};

export default PermissionRoute;
