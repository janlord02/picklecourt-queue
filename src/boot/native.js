import { defineBoot } from '#q-app/wrappers'
import { setupNative } from 'src/utils/native'

// Native shell setup (status bar, keyboard, Android back, splash). No-op on web.
export default defineBoot(({ router }) => {
  setupNative(router)
})
