import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, ClipboardList } from "lucide-react"

const PlaceholderPage = ({ title, description, moduleName = "CMS Module", checklist = [] }) => {
  const items = checklist.length ? checklist : ["Search and filter", "View details", "Approve or reject", "Add remarks", "Upload or view documents", "Export report"]

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden p-0">
        <div className="relative overflow-hidden bg-slate-950 px-6 py-7 text-white sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(20,184,166,.34),transparent_32%),radial-gradient(circle_at_92%_0%,rgba(59,130,246,.20),transparent_28%)]" />
          <div className="surface-grid absolute inset-0 opacity-20" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-100">
              <ClipboardList size={14} />
              {moduleName}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-300">{description}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-black text-slate-950">Recommended CMS Fields</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Suggested controls for this module screen.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-orange-700" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-black text-slate-950">Yard CMS Ready</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Yard setup and inventory board are already active. Use Yard Area Setup for capacity configuration, then Inventory Board for drag and drop block layout.
          </p>
          <div className="mt-5 space-y-3">
            <Link to="/yard/area-setup" className="btn-secondary w-full justify-between">
              Open Yard Area Setup <ArrowRight size={16} />
            </Link>
            <Link to="/yard/inventory" className="btn-primary w-full justify-between">
              Open Inventory Board <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlaceholderPage
