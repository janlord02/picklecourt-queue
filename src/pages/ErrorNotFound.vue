<template>
  <div class="fullscreen not-found text-white text-center flex flex-center">
    <div class="not-found-inner">
      <span class="not-found-icon"><q-icon name="eva-compass-outline" size="34px" /></span>
      <div class="text-h5 text-weight-bold q-mt-md">This page wandered off the court</div>
      <div class="q-mt-sm" style="opacity: 0.7">The link may be old or mistyped.</div>
      <q-btn
        class="big-action q-mt-xl"
        style="min-width: 220px"
        color="white"
        text-color="primary"
        unelevated
        no-caps
        to="/"
        label="Go to home"
      />
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.not-found {
  background: radial-gradient(120% 70% at 50% -10%, #14473a 0%, #0c2b23 60%);
  padding: calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
}

.not-found-inner {
  max-width: 360px;
}

.not-found-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(198, 239, 9, 0.14);
  color: #c6ef09;
}
</style>
