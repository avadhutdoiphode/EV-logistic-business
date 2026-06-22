import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const TOKEN_KEY = "ev_logistics_token";

async function authHeader(): Promise<Record<string, string>> {
  const token = await storage.secureGet(TOKEN_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T = any>(
  path: string,
  opts: { method?: string; body?: any; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) Object.assign(headers, await authHeader());
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : ({} as any);
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export const api = {
  sendOtp: (phone: string, role: string) =>
    request("/auth/send-otp", { method: "POST", body: { phone, role }, auth: false }),
  verifyOtp: (phone: string, otp: string, role: string, name?: string) =>
    request<{ token: string; user: any }>("/auth/verify-otp", {
      method: "POST",
      body: { phone, otp, role, name },
      auth: false,
    }),
  me: () => request("/auth/me"),
  vehicles: () => request<any[]>("/vehicles", { auth: false }),
  fareEstimate: (pickup: any, drops: any[], vehicle_id: string) =>
    request("/fare/estimate", { method: "POST", body: { pickup, drops, vehicle_id }, auth: false }),
  createBooking: (payload: any) => request("/bookings", { method: "POST", body: payload }),
  myBookings: () => request<any[]>("/bookings/my"),
  getBooking: (id: string) => request<any>(`/bookings/${id}`),
  updateBookingStatus: (id: string, status: string) =>
    request(`/bookings/${id}/status`, { method: "PATCH", body: { status } }),
  driverOnline: (is_online: boolean) =>
    request("/driver/online", { method: "POST", body: { is_online } }),
  driverLocation: (lat: number, lng: number) =>
    request("/driver/location", { method: "POST", body: { lat, lng } }),
  availableJobs: () => request<any[]>("/driver/available-jobs"),
  acceptJob: (id: string) => request(`/driver/accept/${id}`, { method: "POST" }),
  earnings: () => request<any>("/driver/earnings"),
  adminStats: () => request<any>("/admin/stats"),
  adminDrivers: () => request<any[]>("/admin/drivers"),
  adminCustomers: () => request<any[]>("/admin/customers"),
  adminBookings: () => request<any[]>("/admin/bookings"),
  paymentInit: (booking_id: string) =>
    request("/payments/initiate", { method: "POST", body: { booking_id } }),
  paymentVerify: (booking_id: string) =>
    request("/payments/verify", {
      method: "POST",
      body: {
        booking_id,
        razorpay_payment_id: "pay_mock_" + Date.now(),
        razorpay_order_id: "order_mock_" + Date.now(),
        razorpay_signature: "sig_mock_" + Date.now(),
      },
    }),
};
