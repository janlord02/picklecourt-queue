<template>
  <!-- Share how to join: QR (scan from another phone or print), the join
       link (copy / native share sheet) and the code. -->
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card style="width: 360px; max-width: 94vw; border-radius: 18px">
      <q-card-section class="row items-center no-wrap q-pb-none">
        <div class="col text-subtitle1 text-weight-bold">Invite players</div>
        <q-btn flat round dense icon="eva-close-outline" v-close-popup />
      </q-card-section>
      <q-card-section class="text-center">
        <canvas ref="qrCanvas" class="share-qr" />
        <div class="text-caption text-grey-7 q-mt-sm">Scan to join · code</div>
        <div class="text-h5 text-weight-bolder" style="letter-spacing: 0.18em">{{ code }}</div>
        <div class="share-link q-mt-sm">{{ joinUrl }}</div>
      </q-card-section>
      <q-card-actions class="q-px-md q-pb-md" style="gap: 8px">
        <q-btn class="col" outline no-caps color="primary" icon="eva-copy-outline" label="Copy link" @click="copy" />
        <q-btn v-if="canShare" class="col" unelevated no-caps color="primary" icon="eva-share-outline" label="Share" @click="share" />
        <q-btn class="col-12" flat no-caps color="grey-8" icon="eva-download-outline" label="Save QR image" @click="saveQr" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import QRCode from 'qrcode'
import { joinUrl as joinUrlFor } from 'src/utils/publicUrl'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  code: { type: String, required: true },
  sessionName: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const $q = useQuasar()
const qrCanvas = ref(null)

// Public web address (never the app's localhost origin).
const joinUrl = computed(() => joinUrlFor(props.code))
const canShare = typeof navigator !== 'undefined' && !!navigator.share

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    await nextTick()
    if (qrCanvas.value) QRCode.toCanvas(qrCanvas.value, joinUrl.value, { width: 220, margin: 1 })
  },
)

async function copy() {
  try {
    await navigator.clipboard.writeText(joinUrl.value)
    $q.notify({ message: 'Join link copied', color: 'positive' })
  } catch {
    $q.notify({ message: joinUrl.value, color: 'grey-8', timeout: 6000 })
  }
}

async function share() {
  try {
    await navigator.share({
      title: props.sessionName || 'Open play',
      text: `Join ${props.sessionName || 'open play'} on PickleCourt Queue — code ${props.code}`,
      url: joinUrl.value,
    })
  } catch {
    // dismissed
  }
}

function saveQr() {
  if (!qrCanvas.value) return
  const a = document.createElement('a')
  a.href = qrCanvas.value.toDataURL('image/png')
  a.download = `join-${props.code}.png`
  a.click()
}
</script>

<style scoped>
.share-qr {
  width: 220px !important;
  height: 220px !important;
  border-radius: 12px;
  border: 1px solid var(--line, #e3e8e6);
}
.share-link {
  font-size: 12px;
  color: #5f6f69;
  word-break: break-all;
}
</style>
