import axios, { isAxiosError } from 'axios'
import type { Page } from '../types/api.ts'

const TOKEN_KEY = 'dynamic-gym.token'

// ponytail: sessionStorage keeps the owner signed in across reloads and forgets them when the tab
// closes. Still readable by any XSS; move to an httpOnly cookie if the backend starts issuing one.
export const session = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api',
})

api.interceptors.request.use((config) => {
  const token = session.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(undefined, (error) => {
  // An expired or missing token anywhere except the sign-in call itself: back to sign in.
  if (isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
    session.clear()
    window.location.assign('/login')
  }
  return Promise.reject(error)
})

// Dev-only: VITE_API_MOCK=true serves synthetic data, so screens work without the backend running.
if (import.meta.env.VITE_API_MOCK === 'true') {
  api.defaults.adapter = (config) => import('./mock-api.ts').then((mock) => mock.mockAdapter(config))
}

/** GET a list endpoint: one page of rows plus the X-Total-Count the backend sends with it. */
export const getPage = <T>(url: string, params: object): Promise<Page<T>> =>
  api.get<T[]>(url, { params }).then((r) => ({ rows: r.data, total: Number(r.headers['x-total-count'] ?? r.data.length) }))

type FastApiDetail = string | { msg: string }[]

/** One readable sentence for any API failure: FastAPI string details, 422 field lists, or no connection. */
export function errorMessage(error: unknown): string {
  if (isAxiosError<{ detail?: FastApiDetail }>(error)) {
    if (!error.response) return "Can't reach the server. Check the connection, then try again."
    const detail = error.response.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(' ')
    if (error.response.status === 404) return 'That record no longer exists.'
    return 'The server had a problem. Try again in a moment.'
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Try again.'
}
