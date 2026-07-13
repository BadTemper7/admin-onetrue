import { CheckCircle2, FileText, UploadCloud, X } from "lucide-react"

const formatFileSize = (file) => {
  if (!file?.size) return ""

  const kb = file.size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const ModernFileInput = ({
  name,
  label = "Upload document",
  required = false,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp",
  helper = "PDF, DOC, JPG, PNG, or WEBP",
  file,
  onChange,
  disabled = false,
}) => {
  const inputId = `file-${name || label.replace(/\s+/g, "-").toLowerCase()}`
  const fileSize = formatFileSize(file)

  return (
    <label
      htmlFor={inputId}
      className={`group block rounded-3xl border border-dashed p-4 transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-70"
          : file
            ? "cursor-pointer border-orange-300 bg-orange-50/70 shadow-sm shadow-orange-100/60 hover:border-orange-400"
            : "cursor-pointer border-slate-300 bg-white hover:border-orange-300 hover:bg-orange-50/40"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${
            file ? "bg-orange-600 text-white shadow-lg shadow-orange-100" : "bg-slate-100 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-700"
          }`}
        >
          {file ? <CheckCircle2 size={21} /> : <UploadCloud size={21} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-800">
              {label} {required && <span className="text-red-600">*</span>}
            </span>
            {file && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-orange-700 ring-1 ring-orange-100">Selected</span>}
          </div>

          <div className="mt-1 truncate text-xs font-bold text-slate-500">
            {file ? file.name : helper}
          </div>

          {file ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide text-orange-700">
              <FileText size={13} /> {fileSize || "Ready to upload"}
            </div>
          ) : (
            <div className="mt-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Click to browse file</div>
          )}
        </div>

        {file && !disabled && (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 transition group-hover:text-red-500">
            <X size={15} />
          </div>
        )}
      </div>

      <input id={inputId} className="sr-only" name={name} type="file" accept={accept} required={required} disabled={disabled} onChange={onChange} />
    </label>
  )
}

export default ModernFileInput
