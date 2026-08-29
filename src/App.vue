<template>
  <AppSplash :ready="splashReady" />
  <router-view />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import AppSplash from 'src/components/AppSplash.vue'
import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()
const splashReady = ref(false)

onMounted(() => {
  // The Vue splash is up — drop the static pre-JS loader from index.html.
  document.getElementById('preload-splash')?.remove()

  if (auth.isAuthenticated && !auth.user) {
    auth.fetchUser().finally(() => {
      splashReady.value = true
    })
  } else {
    splashReady.value = true
  }
})
</script>
