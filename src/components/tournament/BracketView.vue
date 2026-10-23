<template>
  <div v-if="sections.length" class="t-bracket" :class="{ 't-bracket--dark': dark }">
    <section v-for="section in sections" :key="section.key" class="q-mb-lg">
      <div v-if="sections.length > 1 || section.key !== 'winners'" class="section-label q-mt-none">{{ section.title }}</div>
      <div class="t-bracket__scroll">
        <div :ref="(el) => setCols(section.key, el)" class="t-bracket__cols">
          <!-- Flow arrows: each match → the slot it feeds (same section). -->
          <svg class="t-bracket__flow" :width="flow[section.key]?.w || 0" :height="flow[section.key]?.h || 0" aria-hidden="true">
            <defs>
              <marker :id="`arrow-${uid}-${section.key}-done`" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" class="t-arrow-head t-arrow-head--done" />
              </marker>
              <marker :id="`arrow-${uid}-${section.key}-todo`" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" class="t-arrow-head" />
              </marker>
            </defs>
            <path
              v-for="p in flow[section.key]?.paths || []"
              :key="p.key"
              :d="p.d"
              class="t-arrow"
              :class="{ 't-arrow--done': p.done, 't-arrow--live': p.live }"
              :marker-end="`url(#arrow-${uid}-${section.key}-${p.done ? 'done' : 'todo'})`"
            />
          </svg>

          <div v-for="(round, i) in section.rounds" :key="i" class="t-bracket__col">
            <div class="t-bracket__title">{{ round.title }}</div>
            <div class="t-bracket__matches">
              <div v-for="m in round.matches" :key="m.id" class="t-bracket__slot" :data-mid="m.id">
                <MatchCard :match="m" :entries="entries" :clickable="clickable" compact @open="$emit('open', $event)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import MatchCard from './MatchCard.vue'
import { bracketSections } from 'src/utils/tournament'

const props = defineProps({
  division: { type: Object, required: true },
  entries: { type: Object, required: true },
  clickable: { type: Boolean, default: false },
  dark: { type: Boolean, default: false }, // TV monitor styling
})
defineEmits(['open'])

const uid = Math.random().toString(36).slice(2, 8)
const sections = computed(() => bracketSections(props.division))
const byId = computed(() => Object.fromEntries((props.division?.matches || []).map((m) => [m.id, m])))

// section key → { w, h, paths: [{ key, d, done, live }] }
const flow = reactive({})
const colsEls = {}
let observer = null

function setCols(key, el) {
  if (el) {
    colsEls[key] = el
    observer?.observe(el)
  } else {
    delete colsEls[key]
  }
}

/** A feeder that will never send anyone (bye's loser, unneeded match) gets no arrow. */
function feeds(src, take) {
  if (!src || src.status === 'void') return false
  return !(take === 'loser' && src.status === 'bye')
}

function measure() {
  for (const section of sections.value) {
    const root = colsEls[section.key]
    if (!root) continue
    const base = root.getBoundingClientRect()
    // Inside a CSS-scaled parent (TV monitor) screen rects are scaled but the
    // SVG draws in the layout's own pixels — convert back.
    const k = root.offsetWidth ? base.width / root.offsetWidth : 1
    const boxes = {}
    root.querySelectorAll('[data-mid]').forEach((el) => {
      const r = el.getBoundingClientRect()
      boxes[el.dataset.mid] = { left: (r.left - base.left) / k, right: (r.right - base.left) / k, top: (r.top - base.top) / k, h: r.height / k }
    })

    const paths = []
    for (const round of section.rounds) {
      for (const m of round.matches) {
        const to = boxes[m.id]
        if (!to) continue
        for (const side of ['a', 'b']) {
          const fromId = m[`${side}_from_match_id`]
          const take = m[`${side}_from`]
          const from = boxes[fromId]
          const src = byId.value[fromId]
          // Only arrows that flow left → right inside this section; drops from
          // another bracket keep their "Loser of M6" text instead.
          if (!from || !feeds(src, take) || from.right >= to.left) continue
          const x1 = from.right
          const y1 = from.top + from.h / 2
          const x2 = to.left - 2
          // Slot A enters the upper half of the card, slot B the lower half.
          const y2 = to.top + to.h * (side === 'a' ? 0.42 : 0.74)
          const mx = x1 + Math.max(8, (x2 - x1) / 2)
          paths.push({
            key: `${fromId}-${m.id}-${side}`,
            d: `M${x1},${y1} H${mx} V${y2} H${x2}`,
            // Solid once the feeder is decided and its team is in the slot.
            done: ['completed', 'bye'].includes(src.status) && !!m[`entry_${side}_id`],
            live: src.status === 'live',
          })
        }
      }
    }
    flow[section.key] = { w: root.scrollWidth, h: root.scrollHeight, paths }
  }
}

let frame = 0
const schedule = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measure)
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(schedule)
    Object.values(colsEls).forEach((el) => observer.observe(el))
  }
  window.addEventListener('resize', schedule)
  nextTick(schedule)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  window.removeEventListener('resize', schedule)
})
// Scores/teams change card heights and which arrows are solid.
watch(() => props.division, () => nextTick(schedule), { deep: true })
</script>

<style scoped lang="scss">
// Columns per round; each column spreads its matches evenly so a match sits
// level with the two that feed it, and the SVG layer draws the flow between.
.t-bracket__scroll {
  overflow-x: auto;
  margin: 0 -16px;
  padding: 0 16px 6px;
  -webkit-overflow-scrolling: touch;
}
.t-bracket__cols {
  position: relative;
  display: flex;
  gap: 40px; // room for the arrows
  min-width: min-content;
}
.t-bracket__flow {
  position: absolute;
  inset: 0 auto auto 0;
  pointer-events: none;
  overflow: visible;
}
.t-bracket__col {
  position: relative; // above the arrows
  display: flex;
  flex-direction: column;
  width: 220px;
  flex: none;
}
.t-bracket__title {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-muted);
  margin-bottom: 8px;
  min-height: 16px;
}
.t-bracket__matches {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 10px;
}

.t-arrow {
  fill: none;
  stroke: #b8c4bf;
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
  stroke-linejoin: round;
}
.t-arrow--done {
  stroke: var(--brand-teal);
  stroke-width: 2;
  stroke-dasharray: none;
}
.t-arrow--live {
  stroke: #dc2626;
  stroke-dasharray: 4 4;
  animation: t-flow 0.9s linear infinite;
}
.t-arrow-head { fill: #b8c4bf; }
.t-arrow-head--done { fill: var(--brand-teal); }
@keyframes t-flow {
  to { stroke-dashoffset: -16; }
}
@media (prefers-reduced-motion: reduce) {
  .t-arrow--live { animation: none; }
}

// TV monitor: sections side by side — a wide screen fits winners | losers |
// grand final far bigger than stacked.
.t-bracket--dark {
  display: flex;
  align-items: flex-start;
  gap: 56px;

  .t-bracket__title { color: rgba(255, 255, 255, 0.6); }
  .t-arrow { stroke: rgba(255, 255, 255, 0.28); }
  .t-arrow-head { fill: rgba(255, 255, 255, 0.28); }
  .t-arrow--done { stroke: var(--lime); }
  .t-arrow-head--done { fill: var(--lime); }
  .section-label { color: rgba(255, 255, 255, 0.55); }
}
</style>
