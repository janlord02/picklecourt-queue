const routes = [
  // Player app — bottom nav: Home · Play · Stats · Me
  {
    path: '/',
    component: () => import('layouts/PlayerLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('pages/player/HomePage.vue') },
      {
        path: 'play',
        name: 'play',
        component: () => import('pages/player/PlayPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'stats',
        name: 'stats',
        component: () => import('pages/player/StatsPage.vue'),
        meta: { requiresAuth: true },
      },
      { path: 'me', name: 'me', component: () => import('pages/player/ProfilePage.vue') },
    ],
  },

  // QR-scan landing (public — shows the session, then join/check-in)
  {
    path: '/join/:code',
    component: () => import('layouts/PlayerLayout.vue'),
    children: [{ path: '', name: 'join', component: () => import('pages/player/JoinPage.vue') }],
  },

  // Organizer console
  {
    path: '/organizer',
    component: () => import('layouts/OrganizerLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'organizer-sessions',
        component: () => import('pages/organizer/SessionsPage.vue'),
      },
      {
        path: 'sessions/:id',
        name: 'organizer-live',
        component: () => import('pages/organizer/LivePage.vue'),
      },
    ],
  },

  // Auth
  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { guest: true },
    children: [{ path: '', name: 'login', component: () => import('pages/auth/LoginPage.vue') }],
  },
  {
    path: '/register',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { guest: true },
    children: [
      { path: '', name: 'register', component: () => import('pages/auth/RegisterPage.vue') },
    ],
  },

  // Public TV / kiosk board (chrome-free)
  {
    path: '/display/:code',
    name: 'display',
    component: () => import('pages/DisplayPage.vue'),
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
