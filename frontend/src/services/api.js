import { getToken } from '../lib/storage.js';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERROR' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const auth = token ?? getToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(
      'Backend unreachable. Keep `npm run dev` running in backend/, then try again.',
      { status: 0, code: 'NETWORK' },
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed. Please try again.', {
      status: response.status,
      code: data.code || 'ERROR',
    });
  }
  return data;
}

export const healthApi = () => api('/health', { token: '' });
export const sendOtpApi = (phone) => api('/auth/send-otp', { method: 'POST', body: { phone }, token: '' });
export const verifyOtpApi = (phone, otp) =>
  api('/auth/verify-otp', { method: 'POST', body: { phone, otp }, token: '' });
export const getSellerApi = () => api('/seller');
export const updateSellerApi = (payload) => api('/seller', { method: 'PUT', body: payload });
export const getSetupApi = () => api('/seller/setup');
export const connectRazorpayApi = (payload) =>
  api('/seller/razorpay', { method: 'POST', body: payload });
export const disconnectRazorpayApi = () => api('/seller/razorpay', { method: 'DELETE' });
export const getDashboardApi = () => api('/dashboard');
export const listPaymentsApi = (status) =>
  api(`/payments${status && status !== 'ALL' ? `?status=${status}` : ''}`);
export const getPaymentApi = (id) => api(`/payments/${id}`);
export const createPaymentApi = (payload) => api('/payments', { method: 'POST', body: payload });
export const cancelPaymentApi = (id) => api(`/payments/${id}/cancel`, { method: 'POST' });
export const notifyPaymentApi = (id, payload) =>
  api(`/payments/${id}/notify`, { method: 'POST', body: payload });
export const remindPaymentApi = (id) => api(`/payments/${id}/remind`, { method: 'POST' });
export const listRecurringApi = () => api('/recurring');
export const createRecurringApi = (payload) => api('/recurring', { method: 'POST', body: payload });
export const pauseRecurringApi = (id) => api(`/recurring/${id}/pause`, { method: 'POST' });
export const resumeRecurringApi = (id) => api(`/recurring/${id}/resume`, { method: 'POST' });
export const deleteRecurringApi = (id) => api(`/recurring/${id}`, { method: 'DELETE' });
export const listStaffApi = () => api('/staff');
export const inviteStaffApi = (payload) => api('/staff', { method: 'POST', body: payload });
export const removeStaffApi = (id) => api(`/staff/${id}`, { method: 'DELETE' });
export const getPublicPaymentApi = (id) => api(`/public/payments/${id}`, { token: '' });
export const simulatePayApi = (id) => api(`/public/payments/${id}/simulate`, { method: 'POST', token: '' });
export const listCustomersApi = () => api('/customers');
export const listProductsApi = () => api('/products?all=true');
export const createProductApi = (payload) => api('/products', { method: 'POST', body: payload });
export const updateProductApi = (id, payload) => api(`/products/${id}`, { method: 'PUT', body: payload });
export const deleteProductApi = (id) => api(`/products/${id}`, { method: 'DELETE' });
export const getWhatsAppApi = () => api('/whatsapp/messages');
export const simulateWhatsAppApi = (message) =>
  api('/whatsapp/simulate', { method: 'POST', body: { message } });
