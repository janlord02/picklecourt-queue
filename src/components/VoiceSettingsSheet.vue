<template>
  <q-dialog :model-value="modelValue" position="bottom" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="sheet">
      <q-card-section class="q-pa-md">
        <div class="text-subtitle1 text-weight-bold q-mb-xs">Voice announcements</div>
        <div class="text-caption text-grey-7 q-mb-md">
          This device speaks when players are called — for any court. Settings are saved per
          device, so the venue TV and your phone can each have their own voice.
        </div>

        <div v-if="!speechSupported" class="text-caption text-negative">
          This browser doesn't support speech synthesis.
        </div>

        <template v-else>
          <q-toggle
            :model-value="settings.enabled"
            label="Announce calls on this device"
            @update:model-value="settings.enabled = $event"
          />

          <q-select
            :model-value="settings.voiceURI"
            outlined
            dense
            emit-value
            map-options
            clearable
            label="Voice / accent"
            class="q-mt-md"
            :options="voiceOptions"
            @update:model-value="settings.voiceURI = $event"
          >
            <template #no-option>
              <q-item><q-item-section class="text-grey-6">Loading device voices…</q-item-section></q-item>
            </template>
          </q-select>
          <div class="text-caption text-grey-6 q-mt-xs">
            Leave empty for the device default. Available voices depend on this device.
          </div>

          <div class="row items-center q-mt-md" style="gap: 12px">
            <div class="text-caption text-grey-7" style="width: 48px">Speed</div>
            <q-slider
              :model-value="settings.rate"
              :min="0.7"
              :max="1.3"
              :step="0.05"
              class="col"
              color="primary"
              @update:model-value="settings.rate = $event"
            />
            <div class="text-caption tnum" style="width: 32px">{{ settings.rate.toFixed(2) }}×</div>
          </div>

          <q-btn
            class="full-width q-mt-md"
            outline
            no-caps
            color="primary"
            icon="eva-volume-up-outline"
            label="Test voice"
            @click="testAnnouncement"
          />
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useAnnouncer } from 'src/composables/useAnnouncer'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const { settings, voices, refreshVoices, testAnnouncement, speechSupported } = useAnnouncer()

// iOS Safari often returns an empty voice list until after first use and
// fires onvoiceschanged unreliably — re-query whenever the sheet opens.
watch(
  () => props.modelValue,
  (open) => {
    if (open) refreshVoices()
  },
)

const voiceOptions = computed(() =>
  voices.value.map((voice) => ({
    label: `${voice.name} (${voice.lang})`,
    value: voice.voiceURI,
  })),
)
</script>
