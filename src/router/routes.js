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
      // Public legal pages (store listings link here; also linked in-app).
      { path: 'privacy', name: 'privacy', component: () => import('pages/LegalPage.vue') },
      { path: 'delete-account', name: 'delete-account', component: () => import('pages/LegalPage.vue') },
      // Host-invitation landing (public; the page handles sign-in/sign-up
      // itself so a not-yet-registered invitee can create an account first).
      {
        path: 'invite/:token',
        name: 'invite-accept',
        component: () => import('pages/player/InviteAcceptPage.vue'),
      },
    ],
  },

  // QR-scan landing (public — shows the session, then join/check-in)
  {
    path: '/join/:code',
    component: () => import('layouts/PlayerLayout.vue'),
    children: [{ path: '', name: 'join', component: () => import('pages/player/JoinPage.vue') }],
  },

  // Guest (no account) spot in a session — token kept on this phone.
  {
    path: '/guest/:code',
    component: () => import('layouts/PlayerLayout.vue'),
    children: [{ path: '', name: 'guest-play', component: () => import('pages/player/GuestPlayPage.vue') }],
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
      // Tournaments (beta): the list/create entry point is only shown to
      // super admins; hosts/referees they add can open their tournament.
      {
        path: 'tournaments',
        name: 'organizer-tournaments',
        component: () => import('pages/organizer/TournamentsPage.vue'),
      },
      {
        path: 'tournaments/:id',
        name: 'organizer-tournament',
        component: () => import('pages/organizer/TournamentPage.vue'),
      },
    ],
  },

  // Referee scoring (full-screen, court-side)
  {
    path: '/tournaments/:id/matches/:matchId/score',
    name: 'tournament-referee',
    component: () => import('pages/tournament/RefereePage.vue'),
    meta: { requiresAuth: true },
  },

  // Court referee link: open once, keep scoring whatever this court plays next
  {
    path: '/tournaments/:id/court/:court',
    name: 'tournament-court',
    component: () => import('pages/tournament/CourtPage.vue'),
    meta: { requiresAuth: true },
  },

  // Public tournament board (brackets + live scores, no sign-in)
  {
    path: '/t/:code',
    name: 'tournament-board',
    component: () => import('pages/tournament/TournamentBoardPage.vue'),
  },
  // TV live monitor: every court's live score + rotating brackets/standings
  {
    path: '/t/:code/tv',
    name: 'tournament-monitor',
    component: () => import('pages/tournament/TournamentMonitorPage.vue'),
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

  {
    // Emailed password-reset link lands here (?token=…&email=…).
    path: '/reset-password',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: '', name: 'reset-password', component: () => import('pages/auth/ResetPasswordPage.vue') },
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
