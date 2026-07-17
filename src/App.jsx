import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import Layout from "./components/layout/Layout"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import PermissionRoute from "./components/auth/PermissionRoute"
import FormFieldValidation from "./components/FormFieldValidation"
import PageHelmet from "./components/meta/PageHelmet"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import AdminAccounts from "./pages/modules/AdminAccounts"
import AdminClients from "./pages/modules/AdminClients"
import AdminBookings from "./pages/modules/AdminBookings"
import AdminPreAdvice from "./pages/modules/AdminPreAdvice"
import AdminGateIn from "./pages/modules/AdminGateIn"
import AdminInventory from "./pages/modules/AdminInventory"
import AdminStorageMonitoring from "./pages/modules/AdminStorageMonitoring"
import AdminYardAreas from "./pages/modules/AdminYardAreas"
import AdminRateSetup from "./pages/modules/AdminRateSetup"
import AdminPaymentTypes from "./pages/modules/AdminPaymentTypes"
import AdminBilling from "./pages/modules/AdminBilling"
import AdminGateOut from "./pages/modules/AdminGateOut"
import AdminReports from "./pages/modules/AdminReports"
import PlaceholderPage from "./pages/modules/PlaceholderPage"

const AdminShell = () => <Layout><Outlet /></Layout>
const ProtectedModule = ({ moduleName, children }) => <PermissionRoute moduleName={moduleName}>{children}</PermissionRoute>
const TitledPage = ({ title, children }) => <><PageHelmet title={title} />{children}</>

const Placeholder = ({ title, moduleName, description, checklist }) => (
  <TitledPage title={title}><PlaceholderPage title={title} moduleName={moduleName} description={description} checklist={checklist} /></TitledPage>
)

function App() {
  return (
    <>
      <FormFieldValidation />
      <Routes>
        <Route path="/login" element={<TitledPage title="Admin Login"><Login /></TitledPage>} />

        <Route element={<ProtectedRoute userType="admin" />}>
          <Route element={<AdminShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<TitledPage title="Dashboard"><ProtectedModule moduleName="dashboard"><Dashboard /></ProtectedModule></TitledPage>} />

            <Route path="accounts/client-verification" element={<TitledPage title="Client Verification"><ProtectedModule moduleName="clientVerification"><AdminClients /></ProtectedModule></TitledPage>} />
            <Route path="accounts/client-list" element={<Navigate to="/accounts/client-verification" replace />} />
            <Route path="accounts/user-management" element={<TitledPage title="User Management"><ProtectedModule moduleName="userManagement"><AdminAccounts /></ProtectedModule></TitledPage>} />
            <Route path="accounts/user-roles" element={<Navigate to="/accounts/user-management" replace />} />

            <Route path="operations/pre-advice" element={<TitledPage title="Pre-Advice"><ProtectedModule moduleName="preAdvice"><AdminPreAdvice /></ProtectedModule></TitledPage>} />
            <Route path="operations/gate-in" element={<TitledPage title="Gate-In"><ProtectedModule moduleName="gateIn"><AdminGateIn /></ProtectedModule></TitledPage>} />
            <Route path="operations/tracking" element={<TitledPage title="Container Tracking"><ProtectedModule moduleName="bookings"><AdminBookings /></ProtectedModule></TitledPage>} />
            <Route path="operations/import-export" element={<Placeholder title="Import and Export" moduleName="Operations" description="Manage import and export container workflows, references, and operational documents." checklist={["Import records", "Export records", "Document validation", "Status tracking"]} />} />

            <Route path="yard/area-setup" element={<TitledPage title="Yard Area Setup"><ProtectedModule moduleName="yardSetup"><AdminYardAreas /></ProtectedModule></TitledPage>} />
            <Route path="yard/inventory" element={<TitledPage title="Inventory"><ProtectedModule moduleName="inventory"><AdminInventory /></ProtectedModule></TitledPage>} />
            <Route path="yard/storage-monitoring" element={<TitledPage title="Storage Monitoring"><ProtectedModule moduleName="storageMonitoring"><AdminStorageMonitoring /></ProtectedModule></TitledPage>} />

            <Route path="billing/rate-setup" element={<TitledPage title="Rate Setup"><ProtectedModule moduleName="rateSetup"><AdminRateSetup /></ProtectedModule></TitledPage>} />
            <Route path="billing/payment-types" element={<TitledPage title="Payment Types"><ProtectedModule moduleName="paymentTypes"><AdminPaymentTypes /></ProtectedModule></TitledPage>} />
            <Route path="billing/payment-verification" element={<TitledPage title="Payment Verification"><ProtectedModule moduleName="paymentVerification"><AdminBilling /></ProtectedModule></TitledPage>} />
            <Route path="billing/gate-out" element={<TitledPage title="Gate-Out"><ProtectedModule moduleName="gateOut"><AdminGateOut /></ProtectedModule></TitledPage>} />
            <Route path="billing/invoices" element={<Placeholder title="Invoices" moduleName="Billing" description="Review generated invoices and billing details for completed container operations." checklist={["Invoice list", "Client filter", "Payment status", "Export invoice"]} />} />
            <Route path="billing/payment-history" element={<Placeholder title="Payment History" moduleName="Billing" description="Review approved, rejected, and pending payment submissions." checklist={["Payment reference", "Booking reference", "Amount", "Review status"]} />} />

            <Route path="reports/analytics" element={<TitledPage title="Reports"><ProtectedModule moduleName="reports"><AdminReports /></ProtectedModule></TitledPage>} />
            <Route path="reports/audit-logs" element={<Placeholder title="Audit Logs" moduleName="Reports" description="Track important account, booking, yard, billing, and access changes." checklist={["User", "Module", "Action", "Timestamp"]} />} />

            <Route path="settings/general" element={<Placeholder title="General Settings" moduleName="Settings" description="Manage global application defaults and operational configuration." checklist={["Application labels", "Default statuses", "File rules", "Notification rules"]} />} />
            <Route path="settings/security" element={<Placeholder title="Security Settings" moduleName="Settings" description="Review account security and access configuration." checklist={["Password policy", "Session rules", "Role access", "Login activity"]} />} />
            <Route path="settings/notifications" element={<Placeholder title="Notification Settings" moduleName="Settings" description="Configure email and real-time notification preferences." checklist={["Email events", "Socket events", "Admin alerts", "Client alerts"]} />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
