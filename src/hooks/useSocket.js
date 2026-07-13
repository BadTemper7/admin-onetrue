import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import { SOCKET_URL } from "../lib/api"

const realtimeEvents = [
  "socket:connected",
  "client:registered",
  "client:approved",
  "client:rejected",
  "account:updated",
  "admin:user_created",
  "admin:user_updated",
  "admin:user_deleted",
  "billing_rate:created",
  "billing_rate:updated",
  "billing_rate:deleted",
  "billing_rate:reference_applied",
  "yard:area_created",
  "yard:area_updated",
  "yard:area_deleted",
  "yard:block_created",
  "yard:block_updated",
  "yard:block_deleted",
  "yard:slot_reserved",
  "yard:slot_released",
  "yard:slot_relocated",
  "inventory:block_created",
  "inventory:block_updated",
  "inventory:block_deleted",
  "inventory:container_assigned",
  "inventory:container_created",
  "inventory:updated",
  "storage:updated",
  "preAdvice:submitted",
  "preAdvice:confirmed",
  "preAdvice:rejected",
  "gateIn:completed",
  "booking:submitted",
  "booking:resubmitted",
  "booking:approved",
  "booking:rejected",
  "booking:gate_in_approved",
  "booking:stored",
  "booking:billing_operation_updated",
  "booking:payment_submitted",
  "booking:payment_approved",
  "booking:payment_rejected",
  "booking:gate_out_requested",
  "booking:gate_out_approved",
  "booking:completed",
  "booking:relocated",
]

export const useSocket = ({ token, enabled = true }) => {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!enabled || !token) return undefined

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 800,
    })

    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))

    const pushEvent = (type) => (payload) => {
      const eventItem = { type, payload, time: new Date().toISOString() }
      setEvents((prev) => [eventItem, ...prev.slice(0, 19)])

      window.dispatchEvent(
        new CustomEvent("otli:realtime", {
          detail: eventItem,
        })
      )
    }

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, pushEvent(eventName))
    })

    return () => {
      realtimeEvents.forEach((eventName) => socket.off(eventName))
      socket.disconnect()
    }
  }, [enabled, token])

  return { connected, events }
}
