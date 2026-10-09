<template>
  <!-- First-load placeholder shaped like the real content (no spinner jump). -->
  <div class="skeleton-list" aria-busy="true" aria-label="Loading">
    <div v-if="hero" class="play-card skeleton-card q-mb-md text-center">
      <q-skeleton type="text" width="40%" class="q-mx-auto" />
      <q-skeleton type="rect" width="96px" height="64px" class="q-mx-auto q-my-sm" style="border-radius: 12px" />
      <q-skeleton type="text" width="60%" class="q-mx-auto" />
    </div>

    <template v-if="variant === 'courts'">
      <div v-for="n in rows" :key="n" class="court-card skeleton-card q-mb-md">
        <div class="court-card-head">
          <q-skeleton type="text" width="90px" />
          <q-skeleton type="text" width="60px" />
        </div>
        <div class="court-card-body">
          <q-skeleton type="text" width="70%" class="q-mx-auto" />
          <q-skeleton type="text" width="20%" class="q-mx-auto" />
          <q-skeleton type="text" width="65%" class="q-mx-auto" />
        </div>
        <div class="court-card-actions">
          <q-skeleton type="QBtn" class="col" height="36px" />
        </div>
      </div>
    </template>

    <div v-else class="play-card skeleton-card q-pa-none">
      <div v-for="n in rows" :key="n" class="skeleton-row">
        <div class="col">
          <q-skeleton type="text" :width="`${55 - (n % 3) * 10}%`" />
          <q-skeleton type="text" width="40%" height="12px" />
        </div>
        <q-skeleton type="QBtn" width="64px" height="32px" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  rows: { type: Number, default: 3 },
  variant: { type: String, default: 'list' }, // 'list' | 'courts'
  hero: { type: Boolean, default: false },
})
</script>

<style scoped>
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.skeleton-row + .skeleton-row {
  border-top: 1px solid var(--line);
}
</style>
