import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, CircleDotDashed, Workflow } from "lucide-react"
import { adminFlowModules, statusGroups } from "../../lib/flowConfig"

const StatusPill = ({ status }) => {
  const active = status === "Active"
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
      {status}
    </span>
  )
}

const AdminFlowOverview = () => {
  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="bg-slate-950 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500">
              <Workflow size={24} />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-orange-200">OTLI Lifecycle CMS</div>
              <h1 className="text-3xl font-black">Admin System Flow</h1>
            </div>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-300">
            This dashboard follows the full container transaction lifecycle: client registration, account verification, booking approval, yard area assignment, Gate-In, storage, billing, payment verification, Gate-Out release, reports, and revenue tracking.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statusGroups.map((group) => (
          <div key={group.title} className="card p-5">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">{group.title}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {adminFlowModules.map((group) => (
          <div key={group.group} className="card p-5">
            <h2 className="text-lg font-black text-slate-950">{group.group}</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => {
                const isActive = item.status === "Active"
                const Icon = isActive ? CheckCircle2 : CircleDotDashed
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-orange-700 shadow-sm">
                          <Icon size={18} />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-950">{item.title}</h3>
                          <StatusPill status={item.status} />
                        </div>
                      </div>
                      {isActive && <ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-orange-700" size={18} />}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                  </>
                )

                if (!isActive) {
                  return (
                    <div key={item.key} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 opacity-80">
                      {content}
                    </div>
                  )
                }

                return (
                  <Link key={item.key} to={item.path} className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-orange-200 hover:bg-orange-50">
                    {content}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminFlowOverview
