// ── mood.js — check-in de estado de ánimo y log diario ───────────────────────
// Requiere: sb (main.js)

// ── Log diario (compartido con tasks.js) ──────────────────────────────────────
async function logDay(fields) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  const { data: existing } = await sb.from('daily_log')
    .select('id').eq('user_id', user.id).eq('date', today).maybeSingle()
  if (existing) {
    await sb.from('daily_log').update(fields).eq('id', existing.id)
  } else {
    await sb.from('daily_log').insert({ user_id: user.id, date: today, ...fields })
  }
}

// ── Load mood del día ─────────────────────────────────────────────────────────
async function loadMood() {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await sb.from('daily_log').select('mood').eq('date', today).maybeSingle()
  if (data?.mood) applyMoodUI(data.mood, true)
}

function applyMoodUI(mood, locked = true) {
  document.querySelectorAll('.mood-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.mood === mood)
    if (locked) b.disabled = true
  })
  const label = document.querySelector(`.mood-btn[data-mood="${mood}"]`)?.dataset.label || mood
  document.getElementById('moodSaved').textContent = locked
    ? `✓ registrado: ${label} — solo se puede registrar una vez al día`
    : `✓ registrado: ${label}`
}

// ── Events ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (btn.disabled) return
    document.querySelectorAll('.mood-btn').forEach(b => b.disabled = true)
    const mood = btn.dataset.mood
    await logDay({ mood, tasks_total: tasks.length, tasks_done: tasks.filter(t => t.done).length }).catch(() => {})
    applyMoodUI(mood, true)
  })
})
