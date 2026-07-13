import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Banknote,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  MapPinned,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldX,
  Truck,
  Warehouse,
} from "lucide-react"
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

const moduleConfig = {
  preAdvice: {
    badge: "Pre-advice Module",
    title: "Pre-Advice Pending Approval",
    description:
      "Review pending pre-advice approvals, check available yard capacity, and assign the container to one yard area before approval.",
    icon: ClipboardList,
    defaultStatus: "pending_admin_approval",
    defaultBillingStatus: "all",
    primarySection: "approval",
    queueTitle: "Pre-Advice Pending for Approval",
  },
  gateIn: {
    badge: "Gate-In Module",
    title: "Gate-In Verification and Inspection",
    description:
      "This is where gate staff checks booking details, assigned location, truck and driver details, physical container condition, and approves gate-in.",
    icon: Truck,
    defaultStatus: "approved_area_assigned",
    defaultBillingStatus: "all",
    primarySection: "gateIn",
    queueTitle: "Bookings Ready for Gate-In",
  },
  billing: {
    badge: "Payment Verification Module",
    title: "Payment Verification and Approval",
    description:
      "Review the system-generated payment reference, amount, payment proof, and approve or reject the client payment submission.",
    icon: Banknote,
    defaultStatus: "all",
    defaultBillingStatus: "payment_under_review",
    primarySection: "billing",
    queueTitle: "Payments Under Review",
  },
  gateOut: {
    badge: "Gate-Out Module",
    title: "Gate-Out Request and Release Approval",
    description:
      "This is where admin reviews client gate-out requests, confirms payment approval, checks for holds, approves release, and completes gate-out.",
    icon: PackageCheck,
    defaultStatus: "gate_out_requested",
    defaultBillingStatus: "all",
    primarySection: "gateOut",
    queueTitle: "Gate-Out Requests",
  },
}

const statusClass = (status) => {
  if (["stored_in_assigned_area", "completed_gate_out_done", "paid_approved"].includes(status)) return "bg-blue-50 text-blue-700"
  if (["approved_area_assigned", "gate_in_approved", "gate_out_approved"].includes(status)) return "bg-blue-50 text-blue-700"
  if (["rejected", "cancelled", "payment_rejected"].includes(status)) return "bg-red-50 text-red-700"
  return "bg-amber-50 text-amber-700"
}

const formatDate = (value) => {
  if (!value) return "-"
  return new Date(value).toLocaleString()
}

const getBookingInDate = (booking = {}) => booking.inDate || booking.expectedArrivalDate
const getBookingOutDate = (booking = {}) => booking.outDate

const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs font-semibold text-slate-400">{hint}</span>}
  </label>
)

const initialGateIn = {
  actualContainerNumber: "",
  physicalCondition: "Good",
  sealNumber: "",
  truckPlateNumber: "",
  driverName: "",
  driverLicenseNumber: "",
  inspectionRemarks: "",
}

const AdminBookingModule = ({ mode }) => {
  const config = moduleConfig[mode] || moduleConfig.preAdvice
  const HeaderIcon = config.icon
  const isPreAdviceApprovalMode = mode === "preAdvice"
  const bookingBasePath = isPreAdviceApprovalMode ? "/admin/pre-advice-bookings" : "/admin/bookings"
  const yardBasePath = isPreAdviceApprovalMode ? "/admin/pre-advice-bookings/yard" : "/admin/yard"

  const [bookings, setBookings] = useState([])
  const [areas, setAreas] = useState([])
  const [blocks, setBlocks] = useState([])
  const [slotAvailability, setSlotAvailability] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [filters, setFilters] = useState({ status: config.defaultStatus, billingStatus: config.defaultBillingStatus, search: "" })
  const [approval, setApproval] = useState({ areaId: "", blockId: "", bay: 1, row: 1, tier: 1 })
  const [gateIn, setGateIn] = useState(initialGateIn)
  const [operationForm, setOperationForm] = useState({ serviceType: "container_yard" })
  const [rejectReason, setRejectReason] = useState("")
  const [paymentRejectReason, setPaymentRejectReason] = useState("")
  const [remarks, setRemarks] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState({ type: "", message: "" })
  const bookingsRequestRef = useRef({ key: "", promise: null })
  const areasRequestRef = useRef({ key: "", promise: null })
  const blocksRequestRef = useRef({ key: "", promise: null })
  const slotsRequestRef = useRef({ key: "", promise: null })
  const realtimeRefreshTimerRef = useRef(null)

  const selectedBooking = useMemo(() => bookings.find((booking) => booking.id === selectedId) || bookings[0] || null, [bookings, selectedId])
  const selectedBlock = useMemo(() => blocks.find((block) => String(block.id) === String(approval.blockId)), [blocks, approval.blockId])
  const usableBlocks = useMemo(() => blocks.filter((block) => {
    const isActive = !block.status || block.status === "active"

    // In the Pre-advice Module, the admin selects a Yard Area only.
    // The backend keeps an internal location record for slot tracking, but the UI does not expose Block anymore.
    // Do not hide areas just because their setup size is different from the booking container size.
    if (isPreAdviceApprovalMode) return isActive

    const bookingSize = Number(selectedBooking?.containerSize)
    const blockSize = Number(block.containerSize)
    const matchesSize = !bookingSize || !blockSize || blockSize === bookingSize
    return matchesSize && isActive
  }), [blocks, selectedBooking, isPreAdviceApprovalMode])
  const unavailableSlotKeys = useMemo(() => new Set(slotAvailability.map((slot) => slot.key)), [slotAvailability])
  const selectedSlotKey = `${approval.bay || 1}-${approval.row || 1}-${approval.tier || 1}`
  const selectedSlotTaken = approval.blockId ? unavailableSlotKeys.has(selectedSlotKey) : false
  const bayOptions = useMemo(() => Array.from({ length: selectedBlock?.bayCount || selectedBlock?.lineCount || 1 }, (_, index) => index + 1), [selectedBlock])
  const rowOptions = useMemo(() => Array.from({ length: selectedBlock?.rowCount || 1 }, (_, index) => index + 1), [selectedBlock])
  const tierOptions = useMemo(() => Array.from({ length: selectedBlock?.tierCount || 1 }, (_, index) => index + 1), [selectedBlock])

  const loadBookings = useCallback(async ({ force = false } = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.set("status", filters.status)
    if (filters.billingStatus) params.set("billingStatus", filters.billingStatus)
    if (filters.search) params.set("search", filters.search)

    const requestKey = `${bookingBasePath}?${params.toString()}`
    if (!force && bookingsRequestRef.current.key === requestKey && bookingsRequestRef.current.promise) {
      return bookingsRequestRef.current.promise
    }

    const request = (async () => {
      try {
        setLoading(true)
        const { data } = await api.get(requestKey)
        setBookings(data.bookings || [])
        if (data.bookings?.length) {
          setSelectedId((current) => current && data.bookings.some((booking) => booking.id === current) ? current : data.bookings[0].id)
        } else {
          setSelectedId("")
        }
      } catch (error) {
        setAlert({ type: "error", message: getApiError(error) })
      } finally {
        if (bookingsRequestRef.current.promise === request) {
          bookingsRequestRef.current = { key: "", promise: null }
        }
        setLoading(false)
      }
    })()

    bookingsRequestRef.current = { key: requestKey, promise: request }
    return request
  }, [bookingBasePath, filters.billingStatus, filters.search, filters.status])

  const loadAreas = useCallback(async ({ force = false } = {}) => {
    const requestKey = isPreAdviceApprovalMode ? `${yardBasePath}/blocks` : `${yardBasePath}/areas`
    if (!force && areasRequestRef.current.key === requestKey && areasRequestRef.current.promise) {
      return areasRequestRef.current.promise
    }

    const request = (async () => {
      try {
        if (isPreAdviceApprovalMode) {
          const { data } = await api.get(requestKey)
          setAreas(data.areas || [])
          setBlocks(data.blocks || [])
          return
        }

        const { data } = await api.get(requestKey)
        setAreas(data.areas || [])
      } catch (error) {
        setAreas([])
        setBlocks([])
        setAlert({ type: "error", message: getApiError(error) })
      } finally {
        if (areasRequestRef.current.promise === request) {
          areasRequestRef.current = { key: "", promise: null }
        }
      }
    })()

    areasRequestRef.current = { key: requestKey, promise: request }
    return request
  }, [isPreAdviceApprovalMode, yardBasePath])

  const loadBlocks = useCallback(async (areaId, { force = false } = {}) => {
    if (!areaId) {
      setBlocks([])
      return Promise.resolve()
    }

    const requestKey = `${yardBasePath}/areas/${areaId}/blocks`
    if (!force && blocksRequestRef.current.key === requestKey && blocksRequestRef.current.promise) {
      return blocksRequestRef.current.promise
    }

    const request = (async () => {
      try {
        const { data } = await api.get(requestKey)
        setBlocks(data.blocks || [])
      } catch (error) {
        setAlert({ type: "error", message: getApiError(error) })
      } finally {
        if (blocksRequestRef.current.promise === request) {
          blocksRequestRef.current = { key: "", promise: null }
        }
      }
    })()

    blocksRequestRef.current = { key: requestKey, promise: request }
    return request
  }, [yardBasePath])

  const loadSlotAvailability = useCallback(async (blockId, { force = false } = {}) => {
    if (!blockId) {
      setSlotAvailability([])
      return Promise.resolve()
    }

    const requestKey = `${bookingBasePath}/yard/blocks/${blockId}/slots`
    if (!force && slotsRequestRef.current.key === requestKey && slotsRequestRef.current.promise) {
      return slotsRequestRef.current.promise
    }

    const request = (async () => {
      try {
        const { data } = await api.get(requestKey)
        setSlotAvailability(data.slots || [])
      } catch (error) {
        setSlotAvailability([])
        setAlert({ type: "error", message: getApiError(error) })
      } finally {
        if (slotsRequestRef.current.promise === request) {
          slotsRequestRef.current = { key: "", promise: null }
        }
      }
    })()

    slotsRequestRef.current = { key: requestKey, promise: request }
    return request
  }, [bookingBasePath])


  useEffect(() => {
    setFilters({ status: config.defaultStatus, billingStatus: config.defaultBillingStatus, search: "" })
    setSelectedId("")
    setAlert({ type: "", message: "" })
  }, [mode])

  useEffect(() => {
    loadBookings()
  }, [filters.status, filters.billingStatus])

  useEffect(() => {
    if (config.primarySection === "approval") loadAreas()
  }, [config.primarySection, loadAreas])

  useEffect(() => {
    if (!selectedBooking) return

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

    setOperationForm({ serviceType: selectedBooking.serviceType || "container_yard" })
  }, [selectedBooking?.id])

  useEffect(() => {
    if (config.primarySection === "approval" && !isPreAdviceApprovalMode) loadBlocks(approval.areaId)
  }, [approval.areaId, config.primarySection, isPreAdviceApprovalMode, loadBlocks])

  useEffect(() => {
    if (config.primarySection === "approval") loadSlotAvailability(approval.blockId)
  }, [approval.blockId, config.primarySection, loadSlotAvailability])

  const shouldRefreshForRealtimeEvent = useCallback((eventType) => {
    if (!eventType) return false
    if (isPreAdviceApprovalMode) return eventType.startsWith("preAdvice:") || eventType.startsWith("yard:")
    if (config.primarySection === "gateIn") return eventType.startsWith("gateIn:") || eventType === "booking:gate_in_approved" || eventType === "booking:approved" || eventType === "booking:rejected"
    if (config.primarySection === "billing") return eventType.includes("payment_") || eventType === "booking:billing_operation_updated" || eventType === "booking:gate_out_requested"
    if (config.primarySection === "gateOut") return eventType.includes("gate_out") || eventType === "booking:completed" || eventType === "booking:payment_approved"
    return eventType.startsWith("booking:") || eventType.startsWith("yard:") || eventType.startsWith("inventory:")
  }, [config.primarySection, isPreAdviceApprovalMode])

  useEffect(() => {
    const handleRealtime = (event) => {
      const eventType = event.detail?.type || ""
      if (!shouldRefreshForRealtimeEvent(eventType)) return

      window.clearTimeout(realtimeRefreshTimerRef.current)
      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        loadBookings({ force: true })
        if (config.primarySection === "approval" && approval.blockId) {
          loadSlotAvailability(approval.blockId, { force: true })
        }
      }, 350)
    }

    window.addEventListener("otli:realtime", handleRealtime)
    return () => {
      window.removeEventListener("otli:realtime", handleRealtime)
      window.clearTimeout(realtimeRefreshTimerRef.current)
    }
  }, [approval.blockId, config.primarySection, loadBookings, loadSlotAvailability, shouldRefreshForRealtimeEvent])

  const runAction = async (callback, message) => {
    if (!selectedBooking) return
    setAlert({ type: "", message: "" })
    try {
      setSaving(true)
      await callback()
      setAlert({ type: "success", message })
      await loadBookings({ force: true })
    } catch (error) {
      setAlert({ type: "error", message: getApiError(error) })
    } finally {
      setSaving(false)
    }
  }

  const handleApprovalAreaChange = (areaLocationId) => {
    const areaLocation = blocks.find((item) => String(item.id) === String(areaLocationId))
    setApproval((current) => ({
      ...current,
      areaId: areaLocation?.area || areaLocationId || "",
      blockId: areaLocation?.id || "",
      bay: 1,
      row: 1,
      tier: 1,
    }))
  }

  const approveBooking = () => runAction(
    () => api.patch(`${bookingBasePath}/${selectedBooking.id}/approve`, approval),
    isPreAdviceApprovalMode ? "Pre-advice approved and yard location assigned." : "Booking approved and yard area assigned."
  )

  const rejectBooking = () => runAction(
    () => api.patch(`${bookingBasePath}/${selectedBooking.id}/reject`, { reason: rejectReason }),
    isPreAdviceApprovalMode ? "Pre-advice rejected." : "Booking rejected."
  )

  const approveGateIn = () => runAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/gate-in`, gateIn),
    "Gate-In approved."
  )

  const markStored = () => runAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/store`, { remarks }),
    "Container marked as stored. Final billing will compute after the client submits Date Out."
  )

  const saveBillingOperation = () => runAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/billing-operation`, operationForm),
    ["stored_in_assigned_area", "gate_out_requested", "gate_out_approved"].includes(selectedBooking.status)
      ? "Billing operation saved and bill recomputed."
      : "Billing operation saved. It will compute after Mark Stored."
  )

  const approvePayment = () => runAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/payment/approve`, { remarks }),
    "Payment approved. You can still view it by choosing Approved Payments / Paid Approved in this module."
  )

  const rejectPayment = () => runAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/payment/reject`, { reason: paymentRejectReason }),
    "Payment rejected."
  )

  const approveGateOut = () => runAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/gate-out/approve`, { remarks }),
    "Gate-Out approved."
  )

  const completeGateOut = () => runAction(
    () => api.patch(`/admin/bookings/${selectedBooking.id}/gate-out/complete`, { actualContainerNumber: selectedBooking.containerNumber, remarks }),
    "Container released and booking completed."
  )

  const handleSearch = () => loadBookings({ force: true })

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
          <HeaderIcon size={14} /> {config.badge}
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-950">{config.title}</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{config.description}</p>
      </div>

      <Alert type={alert.type}>{alert.message}</Alert>

      <div className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input className="input pl-10" placeholder="Search reference, container, shipping line" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          </div>
          <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="all">All booking statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="input" value={filters.billingStatus} onChange={(event) => setFilters((current) => ({ ...current, billingStatus: event.target.value }))}>
            <option value="all">All billing statuses</option>
            {Object.entries(billingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={handleSearch} className="btn-secondary" disabled={loading}><RefreshCw size={16} /> Refresh</button>
        </div>
        {config.primarySection === "billing" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["payment_under_review", "Under Review"],
              ["paid_approved", "Approved Payments"],
              ["payment_rejected", "Rejected"],
              ["all", "All Payments"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilters((current) => ({ ...current, billingStatus: value }))}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${filters.billingStatus === value ? "bg-orange-600 text-white shadow-lg shadow-orange-950/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {label}
              </button>
            ))}
            <div className="basis-full rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
              After approval, the payment stays here under Approved Payments and is also visible inside Booking Module details, Inventory, Gate-Out, and the client booking details.
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-black text-slate-950">{config.queueTitle}</h2>
          </div>
          <div className="max-h-[760px] overflow-y-auto p-3">
            {bookings.length === 0 && !loading && <div className="p-5 text-sm font-semibold text-slate-500">No records found for this module.</div>}
            {bookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedId(booking.id)}
                className={`mb-3 w-full rounded-3xl border p-4 text-left transition ${selectedBooking?.id === booking.id ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500">{booking.bookingReference}</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{booking.containerNumber}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">{booking.clientName}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${statusClass(booking.status)}`}>{statusLabels[booking.status] || booking.status}</span>
                </div>
                <div className="mt-3 text-xs font-bold text-slate-500">{booking.containerSize}ft • {booking.containerType?.replace("_", " ")} • {booking.shippingLine}</div>
                <div className="mt-2 text-xs font-bold text-slate-500">Booking No.: {booking.bookingNumber || "Generated after approval"}</div>
                <div className="mt-2 text-xs font-bold text-slate-500">Billing: {billingLabels[booking.billingStatus] || booking.billingStatus}</div>
              </button>
            ))}
          </div>
        </div>

        {!selectedBooking ? (
          <div className="card grid min-h-[520px] place-items-center p-8 text-center">
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
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedBooking.status)}`}>{statusLabels[selectedBooking.status] || selectedBooking.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedBooking.billingStatus)}`}>{billingLabels[selectedBooking.billingStatus] || selectedBooking.billingStatus}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm md:grid-cols-3">
                <div><span className="font-black text-slate-500">Booking No.:</span> {selectedBooking.bookingNumber || "Generated after approval"}</div>
                <div><span className="font-black text-slate-500">Size:</span> {selectedBooking.containerSize}ft</div>
                <div><span className="font-black text-slate-500">Type:</span> {selectedBooking.containerType?.replace("_", " ")}</div>
                <div><span className="font-black text-slate-500">Load:</span> {selectedBooking.containerLoadStatus}</div>
                <div><span className="font-black text-slate-500">Service:</span> {selectedBooking.serviceType === "stripping_stuffing_mano" ? "Stripping / Stuffing with Mano" : "Container Yard Operation"}</div>
                <div><span className="font-black text-slate-500">Shipping Line:</span> {selectedBooking.shippingLine}</div>
                <div><span className="font-black text-slate-500">In Date:</span> {formatDate(getBookingInDate(selectedBooking))}</div>
                <div><span className="font-black text-slate-500">Requested Date Out:</span> {formatDate(getBookingOutDate(selectedBooking))}</div>
                <div><span className="font-black text-slate-500">Assigned Slot:</span> {selectedBooking.assignedSlotNumber || "Pending"}</div>
              </div>

              <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <Field label="Operation Made / Billing Service" hint="Lift On, Lift Off, and storage are automatic. Use this only for optional service billing before payment.">
                    <select className="input bg-white" value={operationForm.serviceType} onChange={(event) => setOperationForm({ serviceType: event.target.value })} disabled={!['unpaid', 'payment_rejected'].includes(selectedBooking.billingStatus)}>
                      <option value="container_yard">Container Yard Operation</option>
                      <option value="stripping_stuffing_mano">Stripping / Stuffing with Mano</option>
                    </select>
                  </Field>
                  <button type="button" onClick={saveBillingOperation} className="btn-primary shrink-0" disabled={saving || !['unpaid', 'payment_rejected'].includes(selectedBooking.billingStatus)}>
                    <Calculator size={16} /> Save Operation
                  </button>
                </div>
                <p className="mt-3 text-xs font-bold leading-5 text-blue-800">
                  Client bill is computed before payment after the client submits Date Out in the gate-out request. After payment is submitted or approved, this operation cannot be changed.
                </p>
              </div>
            </div>

            {config.primarySection === "approval" && (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <MapPinned size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">{isPreAdviceApprovalMode ? "Approve Pre-Advice and Assign Yard Location" : "Approve Booking and Assign Yard Location"}</h3>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {isPreAdviceApprovalMode ? (
                    <div className="md:col-span-2">
                      <Field label="Yard Area" hint="Select the yard area where the container will be assigned.">
                        <select className="input" value={approval.blockId} onChange={(event) => handleApprovalAreaChange(event.target.value)}>
                          <option value="">Select yard area</option>
                          {usableBlocks.map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.areaName || area.name || "Yard Area"} • {area.areaCode || area.code || "AREA"} • {area.availableSlots ?? 0} TEU left
                            </option>
                          ))}
                        </select>
                      </Field>
                      {areas.length === 0 && (
                        <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                          No yard area found. Add an active area in Yard Area Setup first.
                        </div>
                      )}
                      {areas.length > 0 && blocks.length === 0 && (
                        <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                          Yard areas exist, but the approval area list was not loaded. Refresh this page after restarting the updated server.
                        </div>
                      )}
                      {blocks.length > 0 && usableBlocks.length === 0 && (
                        <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                          No active yard area is available. Check the yard area status in Yard Area Setup.
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Field label="Yard Block / Area">
                        <select className="input" value={approval.areaId} onChange={(event) => setApproval((current) => ({ ...current, areaId: event.target.value, blockId: "", bay: 1, row: 1, tier: 1 }))}>
                          <option value="">Select Alpha, Bravo, Echo, etc.</option>
                          {areas.map((area) => <option key={area.id} value={area.id}>{area.name} • {area.availableSlots} TEU available</option>)}
                        </select>
                      </Field>
                      <Field label="Block Section" hint="Only active matching container-size block sections are shown.">
                        <select className="input" value={approval.blockId} onChange={(event) => setApproval((current) => ({ ...current, blockId: event.target.value, bay: 1, row: 1, tier: 1 }))}>
                          <option value="">Select block section</option>
                          {usableBlocks.map((block) => <option key={block.id} value={block.id}>{block.code} • {block.availableSlots} TEU left • {block.containerSize}ft</option>)}
                        </select>
                      </Field>
                    </>
                  )}
                  <Field label="Bay">
                    <select className="input" value={approval.bay} onChange={(event) => setApproval((current) => ({ ...current, bay: event.target.value }))} disabled={!selectedBlock}>
                      {bayOptions.map((value) => <option key={value} value={value}>Bay {value}</option>)}
                    </select>
                  </Field>
                  <Field label="Row">
                    <select className="input" value={approval.row} onChange={(event) => setApproval((current) => ({ ...current, row: event.target.value }))} disabled={!selectedBlock}>
                      {rowOptions.map((value) => <option key={value} value={value}>Row {value}</option>)}
                    </select>
                  </Field>
                  <Field label="Tier / High">
                    <select className="input" value={approval.tier} onChange={(event) => setApproval((current) => ({ ...current, tier: event.target.value }))} disabled={!selectedBlock}>
                      {tierOptions.map((value) => <option key={value} value={value}>Tier {value}</option>)}
                    </select>
                  </Field>
                </div>
                {selectedBlock && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
                      {isPreAdviceApprovalMode ? `${selectedBlock.areaName || selectedBlock.name || "Yard Area"}` : (selectedBlock.name || selectedBlock.code || "Selected block")}: {selectedBlock.occupiedSlots}/{selectedBlock.capacityTeu} TEU used, {selectedBlock.availableSlots} TEU remaining. Selected location: B{approval.bay}-R{approval.row}-T{approval.tier}.
                    </div>
                    {selectedSlotTaken ? (
                      <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                        This location is already reserved or occupied. Select another bay, row, or tier.
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">
                        This location is available. It will be reserved immediately after approval and released only if the booking is rejected, resubmitted, cancelled, or completed.
                      </div>
                    )}
                    {slotAvailability.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-black uppercase tracking-wide text-slate-500">Unavailable locations</div>
                        <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                          {slotAvailability.slice(0, 40).map((slot) => (
                            <span key={`${slot.key}-${slot.reference}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                              B{slot.bay} R{slot.row} T{slot.tier} • {slot.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={approveBooking} className="btn-primary" disabled={saving || selectedBooking.status !== "pending_admin_approval" || !approval.areaId || !approval.blockId || selectedSlotTaken}>
                    <CheckCircle2 size={16} /> Approve / Assign
                  </button>
                  <input className="input sm:max-w-xs" placeholder="Reject reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                  <button type="button" onClick={rejectBooking} className="btn-secondary !text-red-700" disabled={saving || !rejectReason || selectedBooking.status !== "pending_admin_approval"}>
                    <ShieldX size={16} /> Reject
                  </button>
                </div>
              </div>
            )}

            {config.primarySection === "gateIn" && (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">Gate-In Check and Inspection</h3>
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
                  <button type="button" onClick={approveGateIn} className="btn-primary" disabled={saving || selectedBooking.status !== "approved_area_assigned"}>
                    <Truck size={16} /> Approve Gate-In
                  </button>
                  <button type="button" onClick={markStored} className="btn-secondary" disabled={saving || selectedBooking.status !== "gate_in_approved"}>
                    <Warehouse size={16} /> Mark Stored
                  </button>
                </div>
              </div>
            )}

            {config.primarySection === "billing" && (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">Payment Verification</h3>
                </div>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm">
                  <div><span className="font-black text-slate-500">Auto Billing Amount:</span> PHP {Number(selectedBooking.billingTotal || selectedBooking.paymentAmount || 0).toLocaleString()}</div>
                  <div><span className="font-black text-slate-500">Payment Submitted:</span> PHP {Number(selectedBooking.paymentAmount || 0).toLocaleString()}</div>
                  <div><span className="font-black text-slate-500">System Ref.:</span> {selectedBooking.paymentReferenceNumber || "Auto-generated on submit"}</div>
                  <div><span className="font-black text-slate-500">Computed:</span> {formatDate(selectedBooking.billingComputedAt)} • {selectedBooking.billingDays || 0} billing day(s)</div>
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
                <textarea className="input mt-4 min-h-[82px]" placeholder="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={approvePayment} className="btn-primary" disabled={saving || !["payment_submitted", "payment_under_review", "payment_rejected"].includes(selectedBooking.billingStatus)}>
                    <CheckCircle2 size={16} /> Approve Payment
                  </button>
                  <input className="input sm:max-w-xs" placeholder="Payment rejection reason" value={paymentRejectReason} onChange={(event) => setPaymentRejectReason(event.target.value)} />
                  <button type="button" onClick={rejectPayment} className="btn-secondary !text-red-700" disabled={saving || !paymentRejectReason}>
                    Reject Payment
                  </button>
                </div>
              </div>
            )}

            {config.primarySection === "gateOut" && (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <Truck size={18} className="text-orange-700" />
                  <h3 className="text-lg font-black text-slate-950">Gate-Out Request</h3>
                </div>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm">
                  <div><span className="font-black text-slate-500">Requested:</span> {formatDate(selectedBooking.gateOutRequestedAt)}</div>
                  <div><span className="font-black text-slate-500">Approved:</span> {formatDate(selectedBooking.gateOutApprovedAt)}</div>
                  <div><span className="font-black text-slate-500">Released:</span> {formatDate(selectedBooking.releasedAt)}</div>
                  <div><span className="font-black text-slate-500">Billing Gate:</span> {selectedBooking.billingStatus === "paid_approved" ? "Ready" : "Payment not approved"}</div>
                </div>
                <textarea className="input mt-4 min-h-[82px]" placeholder="Gate-out remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={approveGateOut} className="btn-primary" disabled={saving || selectedBooking.status !== "gate_out_requested" || selectedBooking.billingStatus !== "paid_approved"}>
                    Approve Gate-Out
                  </button>
                  <button type="button" onClick={completeGateOut} className="btn-secondary" disabled={saving || selectedBooking.status !== "gate_out_approved"}>
                    Complete Release
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminBookingModule
