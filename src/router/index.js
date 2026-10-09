import { defineRouter } from '#q-app/wrappers'
import { Notify } from 'quasar'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'
import routes from './routes'

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to) => {
    // Cross-app sign-in: the booking admin opens us with a one-time
    // ?handoff=CODE — redeem it for our own token, then continue to the
    // same route with the code stripped from the URL.
    if (to.query.handoff) {
      const { useAuthStore } = await import('src/stores/auth')
      const auth = useAuthStore()
      try {
        await auth.redeemHandoff(to.query.handoff)
      } catch {
        // Expired/used code. Don't silently continue as whoever was signed in
        // before on this device — sign out and say why.
        auth.clearSession()
        Notify.create({
          type: 'warning',
          message: 'This sign-in link has expired. Open the queue console again from PickleCourt admin, or log in.',
          timeout: 7000,
        })
      }
      const query = { ...to.query }
      delete query.handoff
      return { path: to.path, query, replace: true }
    }

    const isAuthenticated = !!localStorage.getItem('auth_token')

    if (to.meta.requiresAuth && !isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guest && isAuthenticated) {
      // Honour ?redirect= (same-site paths only) instead of dropping it.
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : ''
      return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : { name: 'home' }
    }

    return true
  })

  // After a deploy, an old open tab asks for lazy-route files that no longer
  // exist — reload once onto the requested page instead of going blank.
  Router.onError((err, to) => {
    const msg = String(err?.message || '')
    if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg)) {
      const key = 'play_chunk_reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.assign(to?.fullPath || window.location.href)
      }
    }
  })
  Router.afterEach(() => sessionStorage.removeItem('play_chunk_reload'))

  // Per-screen document titles (fixed). The home title matches index.html's
  // SEO title; app-only screens get a short "<screen> · PickleCourt Queue".
  const SITE = 'PickleCourt Queue'
  const TITLES = {
    home: 'PickleCourt Queue — Pickleball Open Play & Matchmaking App',
    play: `My game · ${SITE}`,
    stats: `My stats · ${SITE}`,
    me: `Profile · ${SITE}`,
    'invite-accept': `Host invitation · ${SITE}`,
    join: `Join open play · ${SITE}`,
    'guest-play': `My spot (guest) · ${SITE}`,
    'organizer-sessions': `My sessions · ${SITE}`,
    'organizer-live': `Session console · ${SITE}`,
    login: `Log in · ${SITE}`,
    register: `Create your free account · ${SITE}`,
    'reset-password': `Reset password · ${SITE}`,
    display: `Live courts · ${SITE}`,
  }
  Router.afterEach((to) => {
    if (typeof document !== 'undefined') document.title = TITLES[to.name] || SITE
  })

  return Router
})
