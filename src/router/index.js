import { defineRouter } from '#q-app/wrappers'
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
      await useAuthStore()
        .redeemHandoff(to.query.handoff)
        .catch(() => {}) // expired code → normal guards take over below
      const query = { ...to.query }
      delete query.handoff
      return { path: to.path, query, replace: true }
    }

    const isAuthenticated = !!localStorage.getItem('auth_token')

    if (to.meta.requiresAuth && !isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guest && isAuthenticated) {
      return { name: 'home' }
    }

    return true
  })

  return Router
})
