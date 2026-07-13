import { useEffect, useMemo, useState } from "react"
import { Calculator, CheckCircle2, ClipboardList, Layers, Pencil, Plus, RefreshCw, Save, Search, Trash2, Wand2, X } from "lucide-react"
import Alert from "../../components/Alert"
import ModernDateInput from "../../components/ModernDateInput"
import { api, getApiError } from "../../lib/api"
import Pagination from "../../components/ui/Pagination"
import { usePagination } from "../../hooks/usePagination"

const today = new Date().toISOString().slice(0, 10)

const initialForm = {
  description: "",
  chargeCode: "",
  category: "container_yard_operation",
  billingScope: "base",
  unit: "per_container",
  containerSize: "all",
  containerType: "all",
  loadStatus: "all",
  rateAmount: "",
  freeDays: "0",
  minimumAmount: "0",
  effectiveDate: today,
  status: "active",
  notes: "",
  sortOrder: "100",
}

const referenceRates = [
  { section: "Container Yard Operation", description: "Lift On Charge", unitText: "per 20 ft equivalent", rateAmount: 500, containerSize: "all", billingScope: "base", unit: "per_teu", chargeCode: "LIFT_ON_20" },
  { section: "Container Yard Operation", description: "Lift Off Charge", unitText: "per 20 ft equivalent", rateAmount: 500, containerSize: "all", billingScope: "base", unit: "per_teu", chargeCode: "LIFT_OFF_20" },
  { section: "Container Yard Operation", description: "Total Handling per Container Cycle", unitText: "per 20 ft container", rateAmount: 1000, containerSize: "20", billingScope: "display_only", chargeCode: "TOTAL_HANDLING_CYCLE_20" },
  { section: "Container Yard Operation", description: "Storage", unitText: "per 20 ft container/day", rateAmount: 100, containerSize: "20", billingScope: "storage", chargeCode: "STORAGE_20_DAY" },
  { section: "Container Yard Operation", description: "Storage", unitText: "per 40 ft container/day", rateAmount: 200, containerSize: "40", billingScope: "storage", chargeCode: "STORAGE_40_DAY" },
  { section: "Container Yard Operation", description: "Congestion Surcharge", unitText: "per 20 ft container", rateAmount: 100, containerSize: "20", billingScope: "display_only", chargeCode: "CONGESTION_20" },
  { section: "Container Yard Operation", description: "Congestion Surcharge", unitText: "per 40 ft container", rateAmount: 200, containerSize: "40", billingScope: "display_only", chargeCode: "CONGESTION_40" },
  { section: "Stripping / Stuffing (with Mano)", description: "Stripping / Stuffing (with Mano)", unitText: "per 20 ft container", rateAmount: 4000, containerSize: "20", billingScope: "optional_stripping_stuffing", chargeCode: "STRIPPING_STUFFING_MANO_20" },
  { section: "Stripping / Stuffing (with Mano)", description: "Stripping / Stuffing (with Mano)", unitText: "per 40 ft container", rateAmount: 8000, containerSize: "40", billingScope: "optional_stripping_stuffing", chargeCode: "STRIPPING_STUFFING_MANO_40" },
]

const unitLabels = {
  per_container: "Per Container",
  per_teu: "Per 20ft Equivalent",
  per_day: "Per Day",
  storage_day: "Per Container / Day",
  fixed: "Fixed Charge",
}

const categoryLabels = {
  all: "All Categories",
  container_yard_operation: "Container Yard Operation",
  stripping_stuffing: "Stripping / Stuffing",
  custom: "Custom Rate",
}

const scopeLabels = {
  base: "Base Auto Charge",
  storage: "Storage Day Charge",
  optional_stripping_stuffing: "Optional Stripping / Stuffing",
  display_only: "Display Only / Not Billed",
}

const containerTypeLabels = {
  all: "All Types",
  dry: "Dry",
  reefer: "Reefer",
  tank: "Tank",
  open_top: "Open Top",
  flat_rack: "Flat Rack",
}

const loadStatusLabels = {
  all: "All Load Statuses",
  empty: "Empty",
  laden: "Laden",
}

const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "-"

const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs font-semibold text-slate-400">{hint}</span>}
  </label>
)

const statusClass = (status) => status === "active" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
const scopeClass = (scope) => {
  if (scope === "storage") return "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
  if (scope === "optional_stripping_stuffing") return "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
  if (scope === "display_only") return "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
  return "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
}

const buildReferenceForm = (row, index) => ({
  description: row.description,
  chargeCode: row.chargeCode,
  category: row.section === "Stripping / Stuffing (with Mano)" ? "stripping_stuffing" : "container_yard_operation",
  billingScope: row.billingScope,
  unit: row.unit || (row.billingScope === "storage" ? "storage_day" : "per_container"),
  containerSize: row.containerSize,
  containerType: "all",
  loadStatus: "all",
  rateAmount: String(row.rateAmount),
  freeDays: "0",
  minimumAmount: "0",
  effectiveDate: today,
  status: "active",
  notes: row.billingScope === "display_only" ? "Display reference only. This is not added again to billing." : row.unit === "per_teu" ? "Reference: PHP 500 per 20 ft equivalent. A 40ft container is charged x2 automatically." : `Reference: ${row.unitText}.`,
  sortOrder: String((index + 1) * 10),
})

const ReferenceRatesTable = ({ onUse }) => {
  const pagination = usePagination(referenceRates, 5)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Description</th>
              <th className="px-5 py-4">Unit</th>
              <th className="px-5 py-4">Rate</th>
              <th className="px-5 py-4">Billing</th>
              <th className="px-5 py-4 text-right">Use</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.paginatedItems.map((row) => (
              <tr key={row.chargeCode} className={row.section.includes("Stripping") ? "bg-blue-50/40" : "bg-white"}>
                <td className="px-5 py-4">
                  <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">{row.section}</div>
                  <div className="mt-1 font-black text-slate-950">{row.description}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{row.chargeCode}</div>
                </td>
                <td className="px-5 py-4 font-bold text-slate-600">{row.unitText}</td>
                <td className="px-5 py-4 text-lg font-black text-blue-950">{formatMoney(row.rateAmount)}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${scopeClass(row.billingScope)}`}>{scopeLabels[row.billingScope]}</span></td>
                <td className="px-5 py-4 text-right">
                  <button type="button" onClick={() => onUse(row, referenceRates.indexOf(row))} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200">Use Template</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination {...pagination} />
    </>
  )
}

const ConfiguredRatesTable = ({ categoryRates, onEdit, onDelete }) => {
  const pagination = usePagination(
    categoryRates,
    10,
    categoryRates.map((rate) => rate.id).join("|"),
  )

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Rate</th>
              <th className="px-5 py-4">Match</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Billing Scope</th>
              <th className="px-5 py-4">Effective</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.paginatedItems.map((rate) => (
              <tr key={rate.id} className="align-top">
                <td className="px-5 py-4">
                  <div className="font-black text-slate-950">{rate.description}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{rate.chargeCode} • {unitLabels[rate.unit] || rate.unit}</div>
                  {rate.notes && <div className="mt-1 max-w-xs text-xs font-semibold text-slate-400">{rate.notes}</div>}
                </td>
                <td className="px-5 py-4 text-xs font-bold text-slate-600">
                  <div>Size: {rate.containerSize === "all" ? "All" : `${rate.containerSize}ft`}</div>
                  <div>Type: {containerTypeLabels[rate.containerType] || rate.containerType}</div>
                  <div>Load: {loadStatusLabels[rate.loadStatus] || rate.loadStatus}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-black text-slate-950">{formatMoney(rate.rateAmount)}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">Free days: {rate.freeDays || 0}</div>
                  <div className="text-xs font-bold text-slate-500">Minimum: {formatMoney(rate.minimumAmount)}</div>
                </td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${scopeClass(rate.billingScope)}`}>{scopeLabels[rate.billingScope] || rate.billingScope}</span></td>
                <td className="px-5 py-4 font-bold text-slate-600">{formatDate(rate.effectiveDate)}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(rate.status)}`}>{rate.status}</span></td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onEdit(rate)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200" title="Edit rate">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => onDelete(rate)} className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100" title="Delete rate">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination {...pagination} />
    </>
  )
}

const AdminRateSetup = () => {
  const [rates, setRates] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState("")
  const [filters, setFilters] = useState({ status: "all", category: "all", search: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState({ type: "", message: "" })

  const activeRates = useMemo(() => rates.filter((rate) => rate.status === "active"), [rates])
  const billableRates = useMemo(() => rates.filter((rate) => rate.status === "active" && rate.billingScope !== "display_only"), [rates])
  const groupedRates = useMemo(() => {
    return rates.reduce((groups, rate) => {
      const key = rate.category || "custom"
      groups[key] = groups[key] || []
      groups[key].push(rate)
      return groups
    }, {})
  }, [rates])

  const loadRates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.set("status", filters.status)
      if (filters.category) params.set("category", filters.category)
      if (filters.search) params.set("search", filters.search)
      const { data } = await api.get(`/admin/billing-rates?${params.toString()}`)
      setRates(data.rates || [])
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRates()
  }, [filters.status, filters.category])

  const patchForm = (patch) => setForm((current) => {
    const next = { ...current, ...patch }
    if (patch.billingScope === "storage") next.unit = "storage_day"
    if (patch.billingScope === "optional_stripping_stuffing") next.category = "stripping_stuffing"
    if (patch.billingScope === "display_only") next.unit = "per_container"
    return next
  })

  const resetForm = () => {
    setEditingId("")
    setForm(initialForm)
  }

  const editRate = (rate) => {
    setEditingId(rate.id)
    setForm({
      description: rate.description || "",
      chargeCode: rate.chargeCode || "",
      category: rate.category || "container_yard_operation",
      billingScope: rate.billingScope || "base",
      unit: rate.unit || "per_container",
      containerSize: rate.containerSize || "all",
      containerType: rate.containerType || "all",
      loadStatus: rate.loadStatus || "all",
      rateAmount: rate.rateAmount || "",
      freeDays: rate.freeDays || "0",
      minimumAmount: rate.minimumAmount || "0",
      effectiveDate: rate.effectiveDate ? new Date(rate.effectiveDate).toISOString().slice(0, 10) : initialForm.effectiveDate,
      status: rate.status || "active",
      notes: rate.notes || "",
      sortOrder: String(rate.sortOrder || 100),
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const useReferenceRow = (row, index) => {
    setEditingId("")
    setForm(buildReferenceForm(row, index))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const submitRate = async (event) => {
    event.preventDefault()
    setAlert({ type: "", message: "" })

    try {
      setSaving(true)
      if (editingId) {
        await api.patch(`/admin/billing-rates/${editingId}`, form)
        setAlert({ type: "success", message: "Billing rate updated successfully." })
      } else {
        await api.post("/admin/billing-rates", form)
        setAlert({ type: "success", message: "Billing rate created successfully." })
      }
      resetForm()
      await loadRates()
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    } finally {
      setSaving(false)
    }
  }

  const applyReferenceRates = async () => {
    if (!window.confirm("Apply the OTLI reference rates shown on the rate card? Existing matching charge codes will be updated.")) return
    setAlert({ type: "", message: "" })
    try {
      setSaving(true)
      await api.post("/admin/billing-rates/reference-defaults", { effectiveDate: today })
      setAlert({ type: "success", message: "OTLI reference rates applied successfully." })
      await loadRates()
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    } finally {
      setSaving(false)
    }
  }

  const deleteRate = async (rate) => {
    if (!window.confirm(`Delete rate ${rate.description}?`)) return
    setAlert({ type: "", message: "" })
    try {
      setSaving(true)
      await api.delete(`/admin/billing-rates/${rate.id}`)
      setAlert({ type: "success", message: "Billing rate deleted successfully." })
      await loadRates()
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-orange-500 to-blue-700" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              <Calculator size={14} /> Billing CMS
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-950">Rate Setup</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Setup the same rate structure as the OTLI domestic container yard rate card. Billing is computed automatically from active billable rates. Display-only rows are shown as reference but are not added to the client billing total.
            </p>
          </div>
          <button type="button" onClick={applyReferenceRates} className="btn-primary shrink-0" disabled={saving}>
            <Wand2 size={17} /> Apply OTLI Reference Rates
          </button>
        </div>
      </div>

      <Alert type={alert.type}>{alert.message}</Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Active Rates</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{activeRates.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Billable Rates</div>
          <div className="mt-2 text-3xl font-black text-blue-700">{billableRates.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Billing Trigger</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-black text-blue-700"><CheckCircle2 size={17} /> Mark Stored in Area</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Admin sets the operation as made from Booking Module or Inventory.</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card border-blue-100 bg-blue-50/60 p-5">
          <div className="text-xs font-black uppercase tracking-wide text-blue-700">How auto billing works</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Admin does not type the client bill manually. Once Gate-In is approved and admin clicks <span className="font-black">Mark Stored in Area</span>, the system computes Lift On, Lift Off, storage days, and optional service charges from active Rate Setup.
          </p>
        </div>
        <div className="card border-blue-100 bg-blue-50/60 p-5">
          <div className="text-xs font-black uppercase tracking-wide text-blue-700">40ft sample computation</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Lift On PHP 500 x 2 + Lift Off PHP 500 x 2 = PHP 2,000. Storage for a 40ft container is PHP 200 per day. For 2 days, storage is PHP 400. Client total before payment is PHP 2,400.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <form onSubmit={submitRate} className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">{editingId ? "Edit Billing Rate" : "New Billing Rate"}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Choose a category and billing scope so the system knows when to include the charge.</p>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
                <X size={17} />
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Rate Description">
              <input className="input" value={form.description} onChange={(event) => patchForm({ description: event.target.value })} placeholder="Example: Lift On Charge" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select className="input" value={form.category} onChange={(event) => patchForm({ category: event.target.value })}>
                  <option value="container_yard_operation">Container Yard Operation</option>
                  <option value="stripping_stuffing">Stripping / Stuffing</option>
                  <option value="custom">Custom Rate</option>
                </select>
              </Field>
              <Field label="Billing Scope" hint="Display-only rows are not charged to the client.">
                <select className="input" value={form.billingScope} onChange={(event) => patchForm({ billingScope: event.target.value })}>
                  {Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Charge Code" hint="Auto-normalized if based on description.">
                <input className="input uppercase" value={form.chargeCode} onChange={(event) => patchForm({ chargeCode: event.target.value })} placeholder="LIFT_ON_20" />
              </Field>
              <Field label="Unit">
                <select className="input" value={form.unit} onChange={(event) => patchForm({ unit: event.target.value })}>
                  {Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Container Size">
                <select className="input" value={form.containerSize} onChange={(event) => patchForm({ containerSize: event.target.value })}>
                  <option value="all">All Sizes</option>
                  <option value="20">20ft</option>
                  <option value="40">40ft</option>
                  <option value="45">45ft</option>
                </select>
              </Field>
              <Field label="Container Type">
                <select className="input" value={form.containerType} onChange={(event) => patchForm({ containerType: event.target.value })}>
                  {Object.entries(containerTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Load Status">
                <select className="input" value={form.loadStatus} onChange={(event) => patchForm({ loadStatus: event.target.value })}>
                  {Object.entries(loadStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Rate Amount">
                <input className="input" type="number" min="0" step="0.01" value={form.rateAmount} onChange={(event) => patchForm({ rateAmount: event.target.value })} required />
              </Field>
              <Field label="Free Days">
                <input className="input" type="number" min="0" value={form.freeDays} onChange={(event) => patchForm({ freeDays: event.target.value })} />
              </Field>
              <Field label="Minimum Amount">
                <input className="input" type="number" min="0" step="0.01" value={form.minimumAmount} onChange={(event) => patchForm({ minimumAmount: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Effective Date">
                <ModernDateInput type="date" value={form.effectiveDate} onChange={(event) => patchForm({ effectiveDate: event.target.value })} required />
              </Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={(event) => patchForm({ status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Sort Order">
                <input className="input" type="number" value={form.sortOrder} onChange={(event) => patchForm({ sortOrder: event.target.value })} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input min-h-[86px]" value={form.notes} onChange={(event) => patchForm({ notes: event.target.value })} placeholder="Optional notes" />
            </Field>
            <button className="btn-primary" disabled={saving}>
              {editingId ? <Save size={17} /> : <Plus size={17} />} {editingId ? "Save Rate" : "Create Rate"}
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-700 to-blue-900 p-5 text-white">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white/80"><ClipboardList size={16} /> Reference Rate Card</div>
              <h2 className="mt-2 text-2xl font-black">Domestic Container Yard Rates</h2>
              <p className="mt-1 text-sm font-semibold text-white/75">Use these as quick templates or apply all as active system rates.</p>
            </div>
            <ReferenceRatesTable onUse={useReferenceRow} />
          </div>

          <div className="card p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input className="input pl-10" placeholder="Search description or charge code" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
              </div>
              <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select className="input" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
                <option value="all">All Categories</option>
                <option value="container_yard_operation">Container Yard Operation</option>
                <option value="stripping_stuffing">Stripping / Stuffing</option>
                <option value="custom">Custom</option>
              </select>
              <button type="button" onClick={loadRates} className="btn-secondary" disabled={loading}><RefreshCw size={16} /> Refresh</button>
            </div>
          </div>

          <div className="space-y-5">
            {rates.length === 0 && !loading && (
              <div className="card p-8 text-center text-sm font-semibold text-slate-500">No rates found. Click Apply OTLI Reference Rates to load the sample rate card.</div>
            )}

            {Object.entries(groupedRates).map(([category, categoryRates]) => (
              <div key={category} className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400"><Layers size={15} /> {categoryLabels[category] || category}</div>
                    <h2 className="mt-1 text-lg font-black text-slate-950">Configured Rates</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{categoryRates.length} rates</span>
                </div>
                <ConfiguredRatesTable categoryRates={categoryRates} onEdit={editRate} onDelete={deleteRate} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminRateSetup
