// ── history.js — historial de días y métricas emocionales ────────────────────
// Requiere: sb (main.js)

window.toggleHistory = async function () {
  const panel = document.getElementById('historyPanel')
  const arrow = document.getElementById('historyArrow')
  const isOpen = panel.classList.toggle('open')
  arrow.textContent = isOpen ? '▼' : '▶'
  if (!isOpen) return

  const { data } = await sb.from('daily_log')
    .select('*').order('date', { ascending: false }).limit(30)

  if (!data || data.length === 0) {
    panel.innerHTML = '<div class="history-empty">aún no hay registros</div>'
    return
  }

  panel.innerHTML = data.map(row => {
    const pct  = row.tasks_total ? Math.round(row.tasks_done / row.tasks_total * 100) : 0
    const date = new Date(row.date + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
    return `
      <div class="history-row">
        <span class="history-date">${date}</span>
        <span class="history-mood">${row.mood || '—'}</span>
        <span class="history-pct">${pct}%</span>
        <div class="history-bar-wrap">
          <div class="history-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>`
  }).join('')
}

window.toggleMetrics = async function () {
  const panel  = document.getElementById('metricsPanel')
  const arrow  = document.getElementById('metricsArrow')
  const isOpen = panel.classList.toggle('open')
  arrow.textContent = isOpen ? '▼' : '▶'
  if (!isOpen) return

  const { data } = await sb.from('daily_log')
    .select('*').order('date', { ascending: false }).limit(60)

  if (!data || data.length === 0) {
    panel.innerHTML = '<div class="history-empty">aún no hay registros suficientes</div>'
    return
  }

  const total   = data.length
  const avgPct  = Math.round(data.reduce((s, r) => s + (r.tasks_total ? r.tasks_done / r.tasks_total * 100 : 0), 0) / total)
  const perfect = data.filter(r => r.tasks_total && r.tasks_done === r.tasks_total).length

  const moodCount = {}
  data.forEach(r => { if (r.mood) moodCount[r.mood] = (moodCount[r.mood] || 0) + 1 })
  const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]

  let streak = 0
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
  for (const r of sorted) {
    if (r.tasks_done > 0) streak++; else break
  }

  const last30  = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  })
  const byDate = Object.fromEntries(data.map(r => [r.date, r]))

  panel.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="mc-label">PROMEDIO DE COMPLETADO</div>
        <div class="mc-value">${avgPct}%</div>
        <div class="mc-sub">últimos ${total} días registrados</div>
      </div>
      <div class="metric-card">
        <div class="mc-label">DÍAS PERFECTOS</div>
        <div class="mc-value">${perfect}</div>
        <div class="mc-sub">100% tareas completadas</div>
      </div>
      <div class="metric-card">
        <div class="mc-label">RACHA ACTUAL</div>
        <div class="mc-value">${streak} 🔥</div>
        <div class="mc-sub">días consecutivos activo</div>
      </div>
      <div class="metric-card">
        <div class="mc-label">ESTADO MÁS FRECUENTE</div>
        <div class="mc-value">${topMood ? topMood[0] : '—'}</div>
        <div class="mc-sub">${topMood ? `${topMood[1]} de ${total} días` : 'sin datos'}</div>
      </div>
    </div>
    <div class="mood-chart-label">// DISTRIBUCIÓN EMOCIONAL</div>
    <div class="mood-chart">
      ${['😴','😟','😢','😐','🙂','⚡'].map(e => {
        const count = moodCount[e] || 0
        const maxC  = Math.max(...Object.values(moodCount), 1)
        const h     = Math.round(count / maxC * 52)
        return `<div class="mood-col">
          <div class="mood-col-bar" style="height:${h}px"></div>
          <div class="mood-col-emoji">${e}</div>
          <div class="mood-col-count">${count}</div>
        </div>`
      }).join('')}
    </div>
    <div class="mood-chart-label" style="margin-top:20px">// ÚLTIMOS 30 DÍAS</div>
    <div class="streak-row">
      ${last30.map(date => {
        const r = byDate[date]
        if (!r) return `<div class="streak-dot empty" title="${date}">·</div>`
        const pct = r.tasks_total ? r.tasks_done / r.tasks_total : 0
        const cls = pct === 1 ? 'completed' : 'missed'
        return `<div class="streak-dot ${cls}" title="${date} ${r.mood || ''}">${r.mood || '·'}</div>`
      }).join('')}
    </div>
  `
}
