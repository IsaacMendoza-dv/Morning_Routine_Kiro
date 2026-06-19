// ── countdown.js — contador regresivo hacia las 08:00 ────────────────────────

function updateCountdown() {
  const now    = new Date()
  const target = new Date(now)
  target.setHours(8, 0, 0, 0)
  if (now >= target) target.setDate(target.getDate() + 1)

  const diff = Math.floor((target - now) / 1000)
  const h    = String(Math.floor(diff / 3600)).padStart(2, '0')
  const m    = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
  const s    = String(diff % 60).padStart(2, '0')

  const el = document.getElementById('countdown')
  el.textContent = `${h}:${m}:${s}`
  el.className   = 'countdown-time ' + (diff > 3600 ? 'on-time' : diff > 900 ? 'warning' : 'late')

  document.getElementById('dateLabel').textContent = now.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}
