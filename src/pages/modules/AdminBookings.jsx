import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, CreditCard, MapPinned, PackageCheck, RefreshCw, Search, ShieldX, Truck, Warehouse } from "lucide-react"
import Alert from "../../components/Alert"
import { api, getApiError } from "../../lib/api"

const statusLabels = {
  pending_admin_approval: "Pending Admin Approval",
  approved_area_assigned: "Approved / Area Assigned",
  rejected: "Rejected",
  gate_in_approved: "Gate-In Approved",
  stored_in_assigned_area: "Stored in Assigned Area",
  gate_out_requested: "Gate-Out Requested",
  gate_out_approved: "Gate-Out Approved",
  completed_gate_out_done: "Completed / Gate-Out Done",
  cancelled: "Cancelled",
}

const billingLabels = {
  unpaid: "Unpaid",
  payment_submitted: "Payment Submitted",
  payment_under_review: "Payment Under Review",
  payment_rejected: "Payment Rejected",
  paid_approved: "Paid / Approved",
}

const statusClass = (status) => {
  if (["stored_in_assigned_area", "completed_gate_out_done", "paid_approved"].includes(status)) return "bg-blue-50 text-blue-700"
  if (["approved_area_assigned", "gate_in_approved", "gate_out_approved"].includes(status)) return "bg-blue-50 text-blue-700"
  if (["rejected", "cancelled", "payment_rejected"].includes(status)) return "bg-red-50 text-red-700"
  return "bg-amber-50 text-amber-700"
}

const initialGateIn = {
  actualContainerNumber: "",
  physicalCondition: "Good",
  sealNumber: "",
  truckPlateNumber: "",
  driverName: "",
  driverLicenseNumber: "",
  inspectionRemarks: "",
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
    {children}
  </label>
)

const formatDate = (value) => {
  if (!value) return "-"
  return new Date(value).toLocaleString()
}

const getBookingInDate = (booking = {}) => booking.inDate || booking.expectedArrivalDate
const getBookingOutDate = (booking = {}) => booking.outDate

const AdminBookings = () => {
  const [bookings, setBookings] = useState([])
  const [areas, setAreas] = useState([])
  const [blocks, setBlocks] = useState([])
  const [summary, setSummary] = useState({})
  const [selectedId, setSelectedId] = useState("")
  const [filters, setFilters] = useState({ status: "all", billingStatus: "all", search: "" })
  const [approval, setApproval] = useState({ areaId: "", blockId: "", bay: 1, row: 1, tier: 1 })
  const [gateIn, setGateIn] = useState(initialGateIn)
  const [rejectReason, setRejectReason] = useState("")
  const [paymentRejectReason, setPaymentRejectReason] = useState("")
  const [actionRemarks, setActionRemarks] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState({ type: "", message: "" })

  const selectedBooking = useMemo(() => bookings.find((booking) => booking.id === selectedId) || bookings[0] || null, [bookings, selectedId])
  const selectedBlock = useMemo(() => blocks.find((block) => block.id === approval.blockId), [blocks, approval.blockId])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.set("status", filters.status)
      if (filters.billingStatus) params.set("billingStatus", filters.billingStatus)
      if (filters.search) params.set("search", filters.search)
      const [{ data }, summaryResponse] = await Promise.all([
        api.get(`/admin/bookings?${params.toString()}`),
        api.get("/admin/bookings/summary").catch(() => ({ data: { summary: {} } })),
      ])
      setBookings(data.bookings || [])
      setSummary(summaryResponse.data.summary || {})
      if (!selectedId && data.bookings?.[0]) setSelectedId(data.bookings[0].id)
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    } finally {
      setLoading(false)
    }
  }

  const loadAreas = async () => {
    try {
      const { data } = await api.get("/admin/yard/areas")
      setAreas(data.areas || [])
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    }
  }

  const loadBlocks = async (areaId) => {
    if (!areaId) {
      setBlocks([])
      return
    }

    try {
      const { data } = await api.get(`/admin/yard/areas/${areaId}/blocks`)
      setBlocks(data.blocks || [])
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    }
  }

  useEffect(() => {
    loadBookings()
    loadAreas()
  }, [])

  useEffect(() => {
    if (selectedBooking) {
      setApproval({
        areaId: selectedBooking.assignedArea || "",
        blockId: selectedBooking.assignedBlock || "",
        bay: selectedBooking.assignedBay || 1,
        row: selectedBooking.assignedRow || 1,
        tier: selectedBooking.assignedTier || 1,
      })
      setGateIn({
        actualContainerNumber: selectedBooking.actualContainerNumber || selectedBooking.containerNumber || "",
        physicalCondition: selectedBooking.physicalCondition || "Good",
        sealNumber: selectedBooking.sealNumber || "",
        truckPlateNumber: selectedBooking.truckPlateNumber || "",
        driverName: selectedBooking.driverName || "",
        driverLicenseNumber: selectedBooking.driverLicenseNumber || "",
        inspectionRemarks: selectedBooking.inspectionRemarks || "",
      })
    }
  }, [selectedBooking?.id])

  useEffect(() => {
    loadBlocks(approval.areaId)
  }, [approval.areaId])

  const refreshAfterAction = async (message) => {
    setAlert({ type: "success", message })
    await loadBookings()
  }

  const handleAction = async (callback, successMessage) => {
    setAlert({ type: "", message: "" })
    try {
      setSaving(true)
      await callback()
      await refreshAfterAction(successMessage)
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    } finally {
      setSaving(false)
    }
  }

  const approveBooking = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/approve`, approval),
    "Booking approved and area assigned."
  )

  const rejectBooking = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/reject`, { reason: rejectReason }),
    "Booking rejected."
  )

  const approveGateIn = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/gate-in`, gateIn),
    "Gate-In approved."
  )

  const markStored = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/store`, { remarks: actionRemarks }),
    "Container marked as stored. Final billing will compute after the client submits Date Out."
  )

  const approvePayment = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/payment/approve`, { remarks: actionRemarks }),
    "Payment approved."
  )

  const rejectPayment = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/payment/reject`, { reason: paymentRejectReason }),
    "Payment rejected."
  )

  const approveGateOut = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/gate-out/approve`, { remarks: actionRemarks }),
    "Gate-Out approved."
  )

  const completeGateOut = () => handleAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/gate-out/complete`, { actualContainerNumber: selectedBooking.containerNumber, remarks: actionRemarks }),
    "Booking completed and container released."
  )

  const usableBlocks = blocks.filter((block) => !selectedBooking || Number(block.containerSize) === Number(selectedBooking.containerSize))

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
          <PackageCheck size={14} /> Booking Management
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-950">Container Yard Booking CMS</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Review booking requests, check yard capacity, assign areas and blocks, approve Gate-In, mark storage, verify payment, and complete Gate-Out.
        </p>
      </div>

      <Alert type={alert.type}>{alert.message}</Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Pending Approval", summary.pending || 0],
          ["Area Assigned", summary.approved || 0],
          ["Gate-In", summary.gateIn || 0],
          ["Stored", summary.stored || 0],
          ["Payment Review", summary.paymentReview || 0],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <div className="text-sm font-bold text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input className="input pl-10" placeholder="Search booking reference, container, shipping line" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          </div>
          <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="all">All booking statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="input" value={filters.billingStatus} onChange={(event) => setFilters((current) => ({ ...current, billingStatus: event.target.value }))}>
            <option value="all">All billing statuses</option>
            {Object.entries(billingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button onClick={loadBookings} className="btn-secondary" disabled={loading}><RefreshCw size={16} /> Filter</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-black text-slate-950">Booking Queue</h2>
          </div>
          <div className="max-h-[760px] overflow-y-auto p-3">
            {bookings.length === 0 && !loading && <div className="p-5 text-sm font-semibold text-slate-500">No bookings found.</div>}
            {bookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => setSelectedId(booking.id)}
                className={`mb-3 w-full rounded-3xl border p-4 text-left transition ${selectedBooking?.id === booking.id ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500">{booking.bookingReference}</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{booking.containerNumber}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">{booking.clientName}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${statusClass(booking.status)}`}>{statusLabels[booking.status]}</span>
                </div>
                <div className="mt-3 text-xs font-bold text-slate-500">{booking.containerSize}ft • {booking.containerType?.replace("_", " ")} • {booking.shippingLine}</div>
              </button>
            ))}
          </div>
        </div>

        {!selectedBooking ? (
          <div className="card grid min-h-[500px] place-items-center p-8 text-center">
            <div>
              <Warehouse className="mx-auto text-slate-300" size={42} />
              <div className="mt-3 text-xl font-black text-slate-700">Select a booking</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-black text-slate-500">{selectedBooking.bookingReference}</div>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedBooking.containerNumber}</h2>
                  <div className="mt-1 text-sm font-semibold text-slate-500">{selectedBooking.clientName} • {selectedBooking.clientEmail}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedBooking.status)}`}>{statusLabels[selectedBooking.status]}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedBooking.billingStatus)}`}>{billingLabels[selectedBooking.billingStatus]}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm md:grid-cols-3">
                <div><span className="font-black text-slate-500">Size:</span> {selectedBooking.containerSize}ft</div>
                <div><span className="font-black text-slate-500">Type:</span> {selectedBooking.containerType?.replace("_", " ")}</div>
                <div><span className="font-black text-slate-500">Load:</span> {selectedBooking.containerLoadStatus}</div>
                <div><span className="font-black text-slate-500">Service:</span> {selectedBooking.serviceType === "stripping_stuffing_mano" ? "Stripping / Stuffing with Mano" : "Container Yard Operation"}</div>
                <div><span className="font-black text-slate-500">Shipping Line:</span> {selectedBooking.shippingLine}</div>
                <div><span className="font-black text-slate-500">In Date:</span> {formatDate(getBookingInDate(selectedBooking))}</div>
                <div><span className="font-black text-slate-500">Requested Date Out:</span> {formatDate(getBookingOutDate(selectedBooking))}</div>
                <div><span className="font-black text-slate-500">Assigned Slot:</span> {selectedBooking.assignedSlotNumber || "Pending"}</div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <MapPinned size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">Approve and Assign Yard Area</h3>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Area">
                    <select className="input" value={approval.areaId} onChange={(event) => setApproval((current) => ({ ...current, areaId: event.target.value, blockId: "" }))}>
                      <option value="">Select area</option>
                      {areas.map((area) => <option key={area.id} value={area.id}>{area.name} • {area.availableSlots} TEU available</option>)}
                    </select>
                  </Field>
                  <Field label="Block">
                    <select className="input" value={approval.blockId} onChange={(event) => setApproval((current) => ({ ...current, blockId: event.target.value }))}>
                      <option value="">Select block</option>
                      {usableBlocks.map((block) => <option key={block.id} value={block.id}>{block.code} • {block.availableSlots} TEU left • {block.containerSize}ft</option>)}
                    </select>
                  </Field>
                  <Field label="Bay">
                    <input className="input" type="number" min="1" max={selectedBlock?.bayCount || 999} value={approval.bay} onChange={(event) => setApproval((current) => ({ ...current, bay: event.target.value }))} />
                  </Field>
                  <Field label="Row">
                    <input className="input" type="number" min="1" max={selectedBlock?.rowCount || 999} value={approval.row} onChange={(event) => setApproval((current) => ({ ...current, row: event.target.value }))} />
                  </Field>
                  <Field label="Tier">
                    <input className="input" type="number" min="1" max={selectedBlock?.tierCount || 999} value={approval.tier} onChange={(event) => setApproval((current) => ({ ...current, tier: event.target.value }))} />
                  </Field>
                </div>
                {selectedBlock && (
                  <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
                    {selectedBlock.name}: {selectedBlock.occupiedSlots}/{selectedBlock.capacityTeu} TEU used, {selectedBlock.availableSlots} TEU remaining.
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button onClick={approveBooking} className="btn-primary" disabled={saving || !selectedBooking || !approval.areaId || !approval.blockId}>
                    <CheckCircle2 size={16} /> Approve / Assign
                  </button>
                  <input className="input sm:max-w-xs" placeholder="Reject reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                  <button onClick={rejectBooking} className="btn-secondary !text-red-700" disabled={saving || !rejectReason}>
                    <ShieldX size={16} /> Reject
                  </button>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <Truck size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">Gate-In Inspection</h3>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Actual Container Number">
                    <input className="input uppercase" value={gateIn.actualContainerNumber} onChange={(event) => setGateIn((current) => ({ ...current, actualContainerNumber: event.target.value }))} />
                  </Field>
                  <Field label="Physical Condition">
                    <input className="input" value={gateIn.physicalCondition} onChange={(event) => setGateIn((current) => ({ ...current, physicalCondition: event.target.value }))} />
                  </Field>
                  <Field label="Seal Number">
                    <input className="input" value={gateIn.sealNumber} onChange={(event) => setGateIn((current) => ({ ...current, sealNumber: event.target.value }))} />
                  </Field>
                </div>
                <div className="mt-4 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm md:grid-cols-3">
                  <div><span className="font-black text-slate-500">Truck Plate:</span> {selectedBooking.truckPlateNumber || "-"}</div>
                  <div><span className="font-black text-slate-500">Driver:</span> {selectedBooking.driverName || "-"}</div>
                  <div><span className="font-black text-slate-500">Driver License:</span> {selectedBooking.driverLicenseNumber || "-"}</div>
                </div>
                <Field label="Inspection Remarks">
                  <textarea className="input mt-4 min-h-[82px]" value={gateIn.inspectionRemarks} onChange={(event) => setGateIn((current) => ({ ...current, inspectionRemarks: event.target.value }))} />
                </Field>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button onClick={approveGateIn} className="btn-primary" disabled={saving || selectedBooking.status !== "approved_area_assigned"}>
                    <Truck size={16} /> Approve Gate-In
                  </button>
                  <button onClick={markStored} className="btn-secondary" disabled={saving || !["gate_in_approved", "stored_in_assigned_area"].includes(selectedBooking.status)}>
                    <Warehouse size={16} /> Mark Stored
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">Billing and Payment</h3>
                </div>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm">
                  <div><span className="font-black text-slate-500">Auto Billing Amount:</span> PHP {Number(selectedBooking.billingTotal || selectedBooking.paymentAmount || 0).toLocaleString()}</div>
                  <div><span className="font-black text-slate-500">Payment Submitted:</span> PHP {Number(selectedBooking.paymentAmount || 0).toLocaleString()}</div>
                  <div><span className="font-black text-slate-500">Reference:</span> {selectedBooking.paymentReferenceNumber || "-"}</div>
                  <div><span className="font-black text-slate-500">Submitted:</span> {formatDate(selectedBooking.paymentSubmittedAt)}</div>
                  {(selectedBooking.billingLineItems || []).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {(selectedBooking.billingLineItems || []).map((item, index) => (
                        <div key={`${item.chargeCode}-${index}`} className="flex flex-col justify-between gap-1 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 sm:flex-row">
                          <span>{item.description || item.chargeCode} • {item.quantity} x PHP {Number(item.rateAmount || 0).toLocaleString()}</span>
                          <span>PHP {Number(item.amount || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selectedBooking.paymentProofs || []).map((doc, index) => (
                      <a key={`${doc.url}-${index}`} className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700 underline" href={doc.secureUrl || doc.url} target="_blank" rel="noreferrer">
                        {doc.label || "Payment Proof"} {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
                <textarea className="input mt-4 min-h-[82px]" placeholder="Remarks" value={actionRemarks} onChange={(event) => setActionRemarks(event.target.value)} />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button onClick={approvePayment} className="btn-primary" disabled={saving || !["payment_submitted", "payment_under_review", "payment_rejected"].includes(selectedBooking.billingStatus)}>
                    <CheckCircle2 size={16} /> Approve Payment
                  </button>
                  <input className="input sm:max-w-xs" placeholder="Payment rejection reason" value={paymentRejectReason} onChange={(event) => setPaymentRejectReason(event.target.value)} />
                  <button onClick={rejectPayment} className="btn-secondary !text-red-700" disabled={saving || !paymentRejectReason}>
                    Reject Payment
                  </button>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <PackageCheck size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">Gate-Out Release</h3>
                </div>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm">
                  <div><span className="font-black text-slate-500">Requested:</span> {formatDate(selectedBooking.gateOutRequestedAt)}</div>
                  <div><span className="font-black text-slate-500">Approved:</span> {formatDate(selectedBooking.gateOutApprovedAt)}</div>
                  <div><span className="font-black text-slate-500">Released:</span> {formatDate(selectedBooking.releasedAt)}</div>
                  <div><span className="font-black text-slate-500">Billing Gate:</span> {selectedBooking.billingStatus === "paid_approved" ? "Ready" : "Payment not approved"}</div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button onClick={approveGateOut} className="btn-primary" disabled={saving || selectedBooking.status !== "gate_out_requested" || selectedBooking.billingStatus !== "paid_approved"}>
                    Approve Gate-Out
                  </button>
                  <button onClick={completeGateOut} className="btn-secondary" disabled={saving || selectedBooking.status !== "gate_out_approved"}>
                    Complete Release
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminBookings
