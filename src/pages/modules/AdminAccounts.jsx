import { useEffect, useMemo, useState } from "react"
import {
  Eye,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import Alert from "../../components/Alert"
import { api, getApiError } from "../../lib/api"
import Pagination from "../../components/ui/Pagination"
import { usePagination } from "../../hooks/usePagination"

const modules = [
  "dashboard",
  "userManagement",
  "roleAccess",
  "clientVerification",
  "accounts",
  "clients",
  "preAdvice",
  "bookings",
  "gateAppointment",
  "gateIn",
  "yardSetup",
  "inventory",
  "yardMap",
  "storageMonitoring",
  "rateSetup",
  "billing",
  "paymentVerification",
  "gateOut",
  "blacklist",
  "chargeHold",
  "reports",
  "auditTrail",
  "settings",
]

const actions = ["view", "create", "edit", "delete"]
const roleOptions = ["super_admin", "admin", "staff"]

const viewOnlyPermissions = modules.reduce((acc, moduleName) => {
  acc[moduleName] = { view: true, create: false, edit: false, delete: false }
  return acc
}, {})

const fullPermissions = modules.reduce((acc, moduleName) => {
  acc[moduleName] = { view: true, create: true, edit: true, delete: true }
  return acc
}, {})

const getPermissionsForRole = (role) => {
  if (["super_admin", "admin"].includes(role)) return fullPermissions
  return viewOnlyPermissions
}

const roleLabel = (role = "") =>
  String(role)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const statusClass = (status) => {
  if (["active", "verified"].includes(status)) return "bg-blue-100 text-blue-700"
  if (["pending", "invited"].includes(status)) return "bg-amber-100 text-amber-700"
  if (["inactive", "disabled", "suspended"].includes(status)) return "bg-red-100 text-red-700"
  return "bg-slate-100 text-slate-700"
}

const AdminAccounts = () => {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    permissions: fullPermissions,
  })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState(roleOptions)
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const statusOptions = useMemo(
    () => [...new Set(users.map((user) => user.status).filter(Boolean))].sort(),
    [users],
  )

  const totals = useMemo(
    () => ({
      accounts: users.length,
      active: users.filter((user) => ["active", "verified"].includes(user.status)).length,
      staff: users.filter((user) => user.role === "staff").length,
    }),
    [users],
  )

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !keyword ||
        [user.name, user.email, user.role, user.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))

      const matchesRole = selectedRoles.includes(user.role)
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(user.status)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, selectedRoles, selectedStatuses])

  const adminPagination = usePagination(
    filteredUsers,
    10,
    `${searchTerm}-${selectedRoles.join("|")}-${selectedStatuses.join("|")}`,
  )
  const permissionPagination = usePagination(modules, 8, form.role)

  const loadAdmins = async () => {
    try {
      const { data } = await api.get("/admin/users?userType=admin")
      setUsers(data.users || [])
    } catch (err) {
      setError(getApiError(err))
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  const updatePermission = (moduleName, action, checked) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleName]: {
          ...prev.permissions[moduleName],
          [action]: checked,
        },
      },
    }))
  }

  const toggleRole = (role) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    )
  }

  const toggleStatus = (status) => {
    setSelectedStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    )
  }

  const resetFilters = () => {
    setSelectedRoles(roleOptions)
    setSelectedStatuses([])
  }

  const resetCreateForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "admin",
      permissions: fullPermissions,
    })
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    resetCreateForm()
  }

  const createAdmin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { data } = await api.post("/admin/users", form)
      setMessage(data.message)
      closeCreateModal()
      await loadAdmins()
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-orange-700">
              Access Management
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Admin Accounts
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Manage dashboard users, review their roles, and create new admin or staff accounts with the correct module permissions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary shrink-0"
          >
            <UserPlus size={17} /> Add Account
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Total Accounts
                </div>
                <div className="mt-2 text-3xl font-black text-slate-950">{totals.accounts}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
                <Users size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Active Accounts
                </div>
                <div className="mt-2 text-3xl font-black text-blue-700">{totals.active}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-blue-700">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-orange-600">
                  Staff Accounts
                </div>
                <div className="mt-2 text-3xl font-black text-orange-700">{totals.staff}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-orange-700">
                <UserCog size={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Alert type="success">{message}</Alert>
          <Alert type="error">{error}</Alert>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">Dashboard Users</h3>
            <p className="text-sm font-semibold text-slate-500">
              Search, filter, and open account details before reviewing access.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <input
                type="text"
                className="input w-full !rounded-2xl !py-3 !pl-10 !pr-4 text-sm sm:w-[320px]"
                placeholder="Search name, email, role..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                size={19}
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                <SlidersHorizontal size={18} />
                Filter
                <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs text-white">
                  {selectedRoles.length + selectedStatuses.length}
                </span>
              </button>

              {showFilters && (
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Account Filters
                    </div>
                    <button
                      type="button"
                      className="text-xs font-black text-orange-700"
                      onClick={resetFilters}
                    >
                      Reset
                    </button>
                  </div>

                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Role</div>
                  <div className="mt-2 space-y-1">
                    {roleOptions.map((role) => (
                      <label
                        key={role}
                        className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role)}
                          onChange={() => toggleRole(role)}
                          className="h-4 w-4 accent-slate-950"
                        />
                        <span className="text-sm font-bold text-slate-700">{roleLabel(role)}</span>
                      </label>
                    ))}
                  </div>

                  {statusOptions.length > 0 && (
                    <>
                      <div className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">Status</div>
                      <div className="mt-2 space-y-1">
                        {statusOptions.map((status) => (
                          <label
                            key={status}
                            className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(status)}
                              onChange={() => toggleStatus(status)}
                              className="h-4 w-4 accent-slate-950"
                            />
                            <span className="text-sm font-bold capitalize text-slate-700">{status}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-400">No status selected means all statuses.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
          Showing {filteredUsers.length} of {users.length} dashboard accounts
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {adminPagination.paginatedItems.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div className="font-black text-slate-950">{user.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">ID: {user.id}</div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{user.email}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusClass(user.status)}`}>
                      {user.status || "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      <Eye size={15} /> View Details
                    </button>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center font-bold text-slate-500">
                    No dashboard accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination {...adminPagination} />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-orange-700">Account Setup</div>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Create Admin Account</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Add the user information and access level.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createAdmin} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Full Name</span>
                  <input
                    className="input"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Email</span>
                  <input
                    className="input"
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Temporary Password</span>
                  <input
                    className="input"
                    type="password"
                    placeholder="Temporary password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Role</span>
                  <select
                    className="input"
                    value={form.role}
                    onChange={(event) => {
                      const nextRole = event.target.value
                      setForm((current) => ({
                        ...current,
                        role: nextRole,
                        permissions: getPermissionsForRole(nextRole),
                      }))
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </label>
              </div>

              {form.role === "admin" && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                  Admin accounts have full operational access to all active admin modules. Use Staff for limited module permissions.
                </div>
              )}

              {form.role === "staff" && (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-sm font-black text-slate-800">Module Permissions</div>
                    <div className="text-xs font-semibold text-slate-500">Choose the actions this staff account can perform.</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Module</th>
                          {actions.map((action) => (
                            <th key={action} className="px-3 py-2 capitalize">{action}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {permissionPagination.paginatedItems.map((moduleName) => (
                          <tr key={moduleName}>
                            <td className="px-3 py-2 font-bold text-slate-700">{moduleName}</td>
                            {actions.map((action) => (
                              <td key={action} className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={form.permissions[moduleName]?.[action] || false}
                                  onChange={(event) => updatePermission(moduleName, action, event.target.checked)}
                                  className="h-4 w-4 accent-slate-950"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination {...permissionPagination} />
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeCreateModal} className="btn-secondary">Cancel</button>
                <button className="btn-primary" disabled={loading}>
                  <UserPlus size={17} /> {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-orange-700">Account Details</div>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{selectedUser.name}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">{roleLabel(selectedUser.role)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusClass(selectedUser.status)}`}>{selectedUser.status || "unknown"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Detail label="Full Name" value={selectedUser.name} />
              <Detail label="Email" value={selectedUser.email} />
              <Detail label="Role" value={roleLabel(selectedUser.role)} />
              <Detail label="Status" value={selectedUser.status} />
              <Detail label="Account ID" value={selectedUser.id} />
              <Detail label="Created" value={selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : "N/A"} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const Detail = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-1 break-words text-sm font-bold text-slate-800">{value || "N/A"}</div>
  </div>
)

export default AdminAccounts
