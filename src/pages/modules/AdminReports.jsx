import { useEffect, useMemo, useState } from "react"
import {
  Boxes,
  CalendarDays,
  Container,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Ship,
  Warehouse,
} from "lucide-react"
import Alert from "../../components/Alert"
import { api, getApiError } from "../../lib/api"

const emptyCounts = { 20: 0, 40: 0, total: 0 }
const emptyReport = {
  totalContainersInYard: 0,
  empty: emptyCounts,
  laden: emptyCounts,
  international: emptyCounts,
  gothong: emptyCounts,
  totalTeu: 0,
  totalFeu: 0,
}

const formatDateTime = (value) => {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`

const AdminReports = () => {
  const [filters, setFilters] = useState({ startDate: "", endDate: "" })
  const [report, setReport] = useState(emptyReport)
  const [generatedAt, setGeneratedAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadReport = async () => {
    try {
      setLoading(true)
      setError("")
      const { data } = await api.get("/admin/reports/yard-containers", { params: filters })
      setReport(data.report || emptyReport)
      setGeneratedAt(data.generatedAt || new Date().toISOString())
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  const rows = useMemo(
    () => [
      ["Total Containers in Yard", "All sizes", report.totalContainersInYard],
      ["Empty Container", "20 FT", report.empty?.[20] || 0],
      ["Empty Container", "40 FT", report.empty?.[40] || 0],
      ["Laden Container", "20 FT", report.laden?.[20] || 0],
      ["Laden Container", "40 FT", report.laden?.[40] || 0],
      ["International Container", "20 FT", report.international?.[20] || 0],
      ["International Container", "40 FT", report.international?.[40] || 0],
      ["Gothong Container", "20 FT", report.gothong?.[20] || 0],
      ["Gothong Container", "40 FT", report.gothong?.[40] || 0],
      ["Capacity Equivalent", "TEU", report.totalTeu || 0],
      ["Capacity Equivalent", "FEU", report.totalFeu || 0],
    ],
    [report],
  )

  const exportCsv = () => {
    const csv = [
      ["OneTrue Yard Container Report"],
      ["Generated", formatDateTime(generatedAt)],
      ["Start Date", filters.startDate || "All"],
      ["End Date", filters.endDate || "All"],
      [],
      ["Report", "Container Size / Unit", "Quantity"],
      ...rows,
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `yard-container-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const summaryCards = [
    { label: "Containers in Yard", value: report.totalContainersInYard || 0, icon: Warehouse },
    { label: "Empty Containers", value: report.empty?.total || 0, icon: Container },
    { label: "Laden Containers", value: report.laden?.total || 0, icon: Boxes },
    { label: "International", value: report.international?.total || 0, icon: Ship },
  ]

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="card p-5 print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-emerald-700">Reports Module</div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Yard Container Report</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Review empty, laden, international, Gothong, TEU, and FEU totals for containers currently inside the yard.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-400">Generated: {formatDateTime(generatedAt)}</p>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" className="btn-secondary" onClick={loadReport} disabled={loading}>
              <RefreshCw size={17} /> {loading ? "Loading..." : "Refresh"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Printer size={17} /> Print
            </button>
            <button type="button" className="btn-primary" onClick={exportCsv}>
              <Download size={17} /> Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Start Date</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input className="input !pl-10" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">End Date</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input className="input !pl-10" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
          </label>
          <div className="flex items-end sm:col-span-2">
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={loadReport} disabled={loading}>
              <FileText size={17} /> Apply Date Filter
            </button>
          </div>
        </div>

        <div className="mt-4"><Alert type="error">{error}</Alert></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4 p-5 print:border print:shadow-none">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white"><Icon size={22} /></div>
            <div><div className="text-2xl font-black text-slate-950">{value}</div><div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div></div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ReportSection title="Total Empty Container" counts={report.empty} />
        <ReportSection title="Laden Container" counts={report.laden} />
        <ReportSection title="International Container" counts={report.international} />
        <ReportSection title="Gothong Container" counts={report.gothong} />
      </div>

      <div className="card overflow-hidden print:border print:shadow-none">
        <div className="border-b border-slate-200 p-5">
          <h3 className="text-lg font-black text-slate-950">Capacity Equivalent Summary</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">20 FT container = 1 TEU or 0.5 FEU. 40 FT container = 2 TEU or 1 FEU.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <CapacityCard label="TEU" description="Twenty-Foot Equivalent Unit" value={report.totalTeu || 0} />
          <CapacityCard label="FEU" description="Forty-Foot Equivalent Unit" value={report.totalFeu || 0} />
        </div>
      </div>
    </div>
  )
}

const ReportSection = ({ title, counts = emptyCounts }) => (
  <section className="card overflow-hidden print:border print:shadow-none">
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
      <h3 className="font-black text-slate-950">{title}</h3>
    </div>
    <div className="divide-y divide-slate-100">
      {[20, 40].map((size) => (
        <div key={size} className="flex items-center justify-between px-5 py-3">
          <span className="font-bold text-slate-600">{size} FT</span>
          <span className="text-lg font-black text-slate-950">{counts?.[size] || 0} units</span>
        </div>
      ))}
      <div className="flex items-center justify-between bg-emerald-50 px-5 py-3">
        <span className="font-black text-emerald-800">Total</span>
        <span className="text-lg font-black text-emerald-800">{counts?.total || 0} units</span>
      </div>
    </div>
  </section>
)

const CapacityCard = ({ label, description, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="text-xs font-black uppercase tracking-widest text-slate-500">{description}</div>
    <div className="mt-2 text-3xl font-black text-slate-950">{value} {label}</div>
  </div>
)

export default AdminReports
