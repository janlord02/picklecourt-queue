import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'

// Shared with the booking frontend: same backend, same token key, so a login
// on one app carries over when both run on the same origin.
const TOKEN_KEY = 'auth_token'
const BUSINESSES_KEY = 'play_businesses'

function readStoredBusinesses() {
  try {
    return JSON.parse(localStorage.getItem(BUSINESSES_KEY) || '[]')
  } catch {
    return []
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem(TOKEN_KEY))
  // Businesses the user belongs to (from the login payload) — needed when
  // creating sessions so they attach to the right tenant.
  const businesses = ref(readStoredBusinesses())
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value)
  const isOrganizerRole = computed(() =>
    ['super_admin', 'admin', 'staff', 'court_attendant', 'club_admin'].includes(
      user.value?.role || '',
    ),
  )

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/login', { email, password })
      token.value = data.data.token
      user.value = data.data.user
      businesses.value = data.data.businesses || []
      localStorage.setItem(TOKEN_KEY, token.value)
      localStorage.setItem(BUSINESSES_KEY, JSON.stringify(businesses.value))
      return user.value
    } catch (e) {
      error.value =
        e.response?.data?.message || e.response?.data?.errors?.email?.[0] || 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(payload) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/register', payload)
      if (data.data?.token) {
        token.value = data.data.token
        user.value = data.data.user
        localStorage.setItem(TOKEN_KEY, token.value)
      }
      return data.data
    } catch (e) {
      error.value = e.response?.data?.message || 'Registration failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Redeem a one-time cross-app sign-in code (from the booking admin's
   * "Queue app" button) for our own token — different origin, so the
   * booking app's localStorage token can't reach us directly.
   */
  async function redeemHandoff(code) {
    const { data } = await api.post('/play/handoff/redeem', { code })
    token.value = data.data.token
    user.value = data.data.user
    businesses.value = data.data.businesses || []
    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(BUSINESSES_KEY, JSON.stringify(businesses.value))
    return user.value
  }

  async function fetchUser() {
    if (!token.value) return null
    try {
      const { data } = await api.get('/user')
      user.value = data.data ?? data
      return user.value
    } catch (e) {
      if (e.response?.status === 401) {
        clearSession()
      }
      return null
    }
  }

  async function logout() {
    try {
      await api.post('/logout')
    } catch {
      // Token may already be invalid — clear locally regardless.
    }
    clearSession()
  }

  function clearSession() {
    token.value = null
    user.value = null
    businesses.value = []
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(BUSINESSES_KEY)
  }

  return {
    user,
    token,
    businesses,
    loading,
    error,
    isAuthenticated,
    isOrganizerRole,
    login,
    register,
    redeemHandoff,
    fetchUser,
    logout,
    clearSession,
  }
})
