import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { api } from 'src/boot/axios'
import {
  getViteReverbAppKey,
  getViteReverbCluster,
  getViteReverbHost,
  getViteReverbPort,
  getViteReverbScheme,
} from 'src/utils/quasarEnv'

let echoInstance = null

/**
 * Laravel Echo + Reverb (Pusher protocol). Returns null when
 * VITE_REVERB_APP_KEY is unset — the app then falls back to manual refresh.
 * Run the websocket server with `php artisan reverb:start`.
 */
export function getEcho() {
  const key = getViteReverbAppKey()
  if (!key) {
    return null
  }
  if (echoInstance) {
    return echoInstance
  }
  window.Pusher = Pusher

  const scheme = getViteReverbScheme()
  const forceTLS = scheme === 'https'
  const portRaw = getViteReverbPort()
  const port = Number(portRaw || (forceTLS ? 443 : 8080))
  const host = getViteReverbHost()

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS,
    cluster: getViteReverbCluster(),
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        api
          .post('/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name,
          })
          .then((response) => {
            callback(null, response.data)
          })
          .catch((error) => {
            callback(error, null)
          })
      },
    }),
  })
  return echoInstance
}

export function isEchoConnected() {
  if (!echoInstance) return false
  try {
    return echoInstance.connector?.pusher?.connection?.state === 'connected'
  } catch {
    return false
  }
}

export function disconnectEcho() {
  if (echoInstance && typeof echoInstance.disconnect === 'function') {
    echoInstance.disconnect()
  }
  echoInstance = null
}
