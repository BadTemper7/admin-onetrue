import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PermissionRoute from "./components/auth/PermissionRoute";
import FormFieldValidation from "./components/FormFieldValidation";
import AdminAccounts from "./pages/modules/AdminAccounts";
import AdminClients from "./pages/modules/AdminClients";
import AdminBookings from "./pages/modules/AdminBookings";
import AdminPreAdvice from "./pages/modules/AdminPreAdvice";
import AdminGateIn from "./pages/modules/AdminGateIn";
import AdminInventory from "./pages/modules/AdminInventory";
import AdminStorageMonitoring from "./pages/modules/AdminStorageMonitoring";
import AdminYardAreas from "./pages/modules/AdminYardAreas";
import AdminRateSetup from "./pages/modules/AdminRateSetup";
import AdminBilling from "./pages/modules/AdminBilling";
import AdminGateOut from "./pages/modules/AdminGateOut";
import PlaceholderPage from "./pages/modules/PlaceholderPage";

const AdminShell = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const ProtectedModule = ({ moduleName, children }) => (
  <PermissionRoute moduleName={moduleName}>{children}</PermissionRoute>
);

function App() {
  return (
    <>
      <FormFieldValidation />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute userType="admin" />}>
          <Route element={<AdminShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ProtectedModule moduleName="dashboard"><Dashboard /></ProtectedModule>} />

            <Route path="accounts/client-verification" element={<ProtectedModule moduleName="clientVerification"><AdminClients /></ProtectedModule>} />
            <Route path="accounts/client-list" element={<ProtectedModule moduleName="clientVerification"><AdminClients /></ProtectedModule>} />
            <Route path="accounts/user-management" element={<ProtectedModule moduleName="userManagement"><AdminAccounts /></ProtectedModule>} />
            <Route path="accounts/user-roles" element={<ProtectedModule moduleName="userManagement"><AdminAccounts /></ProtectedModule>} />

            <Route path="operations/pre-advice" element={<ProtectedModule moduleName="preAdvice"><AdminPreAdvice /></ProtectedModule>} />
            <Route path="operations/gate-in" element={<ProtectedModule moduleName="gateIn"><AdminGateIn /></ProtectedModule>} />
            <Route path="operations/tracking" element={<ProtectedModule moduleName="bookings"><AdminBookings /></ProtectedModule>} />
            <Route path="operations/import-export" element={<PlaceholderPage title="Import and Export" moduleName="Operations" description="Manage import and export container workflows, references, and operational documents." checklist={["Import records", "Export records", "Document validation", "Status tracking"]} />} />

            <Route path="yard/area-setup" element={<ProtectedModule moduleName="yardSetup"><AdminYardAreas /></ProtectedModule>} />
            <Route path="yard/inventory" element={<ProtectedModule moduleName="inventory"><AdminInventory /></ProtectedModule>} />
            <Route path="yard/storage-monitoring" element={<ProtectedModule moduleName="storageMonitoring"><AdminStorageMonitoring /></ProtectedModule>} />
            <Route path="yard/map" element={<PlaceholderPage title="Yard Map" moduleName="Yard" description="View the configured yard layout, occupied slots, available capacity, and blocked locations." checklist={["Area selector", "Occupancy overlay", "Available slots", "Blocked slots"]} />} />

            <Route path="billing/rate-setup" element={<ProtectedModule moduleName="rateSetup"><AdminRateSetup /></ProtectedModule>} />
            <Route path="billing/payment-verification" element={<ProtectedModule moduleName="paymentVerification"><AdminBilling /></ProtectedModule>} />
            <Route path="billing/gate-out" element={<ProtectedModule moduleName="gateOut"><AdminGateOut /></ProtectedModule>} />
            <Route path="billing/invoices" element={<PlaceholderPage title="Invoices" moduleName="Billing" description="Review generated invoices and billing details for completed container operations." checklist={["Invoice list", "Client filter", "Payment status", "Export invoice"]} />} />
            <Route path="billing/payment-history" element={<PlaceholderPage title="Payment History" moduleName="Billing" description="Review approved, rejected, and pending payment submissions." checklist={["Payment reference", "Booking reference", "Amount", "Review status"]} />} />

            <Route path="reports/analytics" element={<PlaceholderPage title="Analytics" moduleName="Reports" description="Generate operational and financial summaries for bookings, inventory, billing, and yard activity." checklist={["Date filter", "Status filter", "Charts", "Export report"]} />} />
            <Route path="reports/audit-logs" element={<PlaceholderPage title="Audit Logs" moduleName="Reports" description="Track important account, booking, yard, billing, and access changes." checklist={["User", "Module", "Action", "Timestamp"]} />} />

            <Route path="settings/general" element={<PlaceholderPage title="General Settings" moduleName="Settings" description="Manage global application defaults and operational configuration." checklist={["Application labels", "Default statuses", "File rules", "Notification rules"]} />} />
            <Route path="settings/security" element={<PlaceholderPage title="Security Settings" moduleName="Settings" description="Review account security and access configuration." checklist={["Password policy", "Session rules", "Role access", "Login activity"]} />} />
            <Route path="settings/notifications" element={<PlaceholderPage title="Notification Settings" moduleName="Settings" description="Configure email and real-time notification preferences." checklist={["Email events", "Socket events", "Admin alerts", "Client alerts"]} />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
