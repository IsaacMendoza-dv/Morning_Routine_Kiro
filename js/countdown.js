// ── countdown.js — contador regresivo hacia las 08:00 ────────────────────────

// countdown.js - timer con tres estados del dia

function updateCountdown() {
  const now   = new Date()
  const h     = now.getHours()
  const m     = now.getMinutes()
  const s     = now.getSeconds()
  const totalNowSec = h * 3600 + m * 60 + s

  const wake  = 5 * 3600 + 30 * 60   // 05:30
  const ready = 8 * 3600              // 08:00

  const el       = document.getElementById('countdown')
  const labelEl  = document.getElementById('countdownLabel')

  let targetSec, label, colorClass

  if (totalNowSec < wake) {
    // Antes de las 5:30 — faltan X para despertar
    targetSec  = wake
    label      = 'tiempo para despertar \u2192 05:30'
    colorClass = 'on-time'

  } else if (totalNowSec < ready) {
    // Entre 5:30 y 8:00 — faltan X para estar listo
    targetSec  = ready
    label      = 'tiempo para estar listo \u2192 08:00'
    const diff = ready - totalNowSec
    colorClass = diff > 3600 ? 'on-time' : diff > 900 ? 'warning' : 'late'

  } else {
    // Despues de las 8:00 — faltan X para el proximo 5:30
    const nextWakeSec = wake + 24 * 3600
    targetSec  = nextWakeSec
    label      = 'tiempo para el pr\u00F3ximo despertar \u2192 05:30'
    colorClass = 'on-time'
  }

  const diff = targetSec - totalNowSec
  const hh   = String(Math.floor(diff / 3600)).padStart(2, '0')
  const mm   = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
  const ss   = String(diff % 60).padStart(2, '0')

  el.textContent  = hh + ':' + mm + ':' + ss
  el.className    = 'countdown-time ' + colorClass

  if (labelEl) labelEl.textContent = label

  document.getElementById('dateLabel').textContent = now.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}
