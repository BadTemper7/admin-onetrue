import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiTruck,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { useAuthStore } from "../stores/authStore";
import { useAdminDashboardStore } from "../stores/adminDashboardStore";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";

const statusClass = (status) => {
  if (["active", "verified"].includes(status)) return "bg-blue-50 text-blue-700";
  if (["pending", "resubmitted"].includes(status)) return "bg-amber-50 text-amber-700";
  if (["rejected", "suspended", "inactive"].includes(status)) return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const {
    users,
    yardSummary,
    bookingSummary,
    loading,
    error,
    fetchDashboard,
  } = useAdminDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const refresh = () => fetchDashboard();
    window.addEventListener("otli:realtime", refresh);
    return () => window.removeEventListener("otli:realtime", refresh);
  }, [fetchDashboard]);

  const clients = useMemo(
    () => users.filter((item) => item.userType === "client"),
    [users],
  );
  const pendingClients = clients.filter((item) =>
    ["pending", "resubmitted"].includes(item.status),
  );

  const accountPagination = usePagination(users, 5);

  const stats = [
    {
      icon: FiClock,
      label: "Pending bookings",
      value: bookingSummary.pending || 0,
      helper: "Waiting for admin approval",
    },
    {
      icon: FiTruck,
      label: "Gate-out requests",
      value: bookingSummary.gateOutRequested || 0,
      helper: "Ready for release review",
    },
    {
      icon: FiPackage,
      label: "Occupied slots",
      value: yardSummary.occupiedSlots || 0,
      helper: "Containers currently in yard",
    },
    {
      icon: FiMapPin,
      label: "Available slots",
      value: yardSummary.availableSlots || 0,
      helper: "Open yard capacity",
    },
  ];

  const quickActions = [
    { label: "Client verification", icon: FiUserCheck, path: "/accounts/client-verification" },
    { label: "Booking management", icon: FiPackage, path: "/operations/tracking" },
    { label: "Gate-in", icon: FiTruck, path: "/operations/gate-in" },
    { label: "Yard inventory", icon: FiMapPin, path: "/yard/inventory" },
    { label: "Payment verification", icon: FiCreditCard, path: "/billing/payment-verification" },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-emerald-50/60 to-blue-50 p-6 text-slate-950 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-yard-green">
              OTLI operations command center
            </p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              Welcome back, {user?.name || "Administrator"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
              Monitor client verification, bookings, yard capacity, billing, and container movement from one dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-yard-green px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh dashboard
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-yard-navy">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-400">{stat.helper}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-yard-green">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-yard-navy">Quick actions</h2>
            <p className="text-sm text-slate-500">Open the most-used terminal modules.</p>
          </div>
          <FiActivity className="h-5 w-5 text-yard-green" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-yard-fog p-4 text-left transition hover:border-yard-green/40 hover:bg-white"
            >
              <span className="rounded-md bg-white p-2 text-yard-green shadow-sm">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-sm font-semibold text-slate-700">{action.label}</span>
              <FiArrowRight className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-yard-green" />
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-yard-navy">Recent accounts</h2>
              <p className="text-xs text-slate-500">Latest admin and client records</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {pendingClients.length} pending
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-yard-fog text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accountPagination.paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-5 py-3 text-slate-500">{item.email}</td>
                    <td className="px-5 py-3 capitalize text-slate-500">{item.userType}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr><td colSpan="4" className="px-5 py-10 text-center text-slate-500">No account records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination {...accountPagination} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-yard-navy">Yard capacity</h2>
          <p className="text-xs text-slate-500">Live configured yard summary</p>
          <div className="mt-4 space-y-3">
            {[
              ["Yard areas", yardSummary.areaCount || 0, FiMapPin],
              ["Inventory blocks", yardSummary.blockCount || 0, FiPackage],
              ["Total TEU capacity", yardSummary.totalTeuSlots || yardSummary.totalAreaCapacityTeu || 0, FiUsers],
            ].map(([label, value, Icon]) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-yard-fog p-4">
                <div className="rounded-md bg-white p-2 text-yard-green"><Icon /></div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-yard-navy">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
            <FiCheckCircle /> API data connected
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
