// Configuration for PickleCourt Play (open play queuing app)
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers'

export default defineConfig((/* ctx */) => {
  return {
    boot: ['axios'],

    css: ['app.scss'],

    extras: ['mdi-v7', 'eva-icons', 'roboto-font', 'material-icons'],

    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      vueRouterMode: 'history',

      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    devServer: {
      open: true,
      // Booking frontend runs on 9000; keep the queuing app side-by-side on 9100.
      port: 9100,
      // Capacitor live reload loads http://LAN_IP:95xx — API calls to same origin /api avoid WKWebView CORS.
      proxy: {
        '/api': {
          target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    framework: {
      config: {
        notify: {
          position: 'top',
          timeout: 4000,
        },
      },

      iconSet: 'eva-icons',

      plugins: ['Notify', 'Dialog', 'Loading', 'Meta'],
    },

    animations: [],

    ssr: {
      prodPort: 3000,
      middlewares: ['render'],
      pwa: false,
    },

    pwa: {
      workboxMode: 'GenerateSW',
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true,
    },

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: {
        appId: 'picklecourt-play',
      },
    },

    bex: {
      extraScripts: [],
    },
  }
})
