// ── pending.js — pendientes a mediano plazo ───────────────────────────────────
// Requiere: sb, flashSaving (main.js)
// Tabla Supabase: pending_items (id, user_id, title, due_date, done, created_at)

let pendingItems    = []
let _pendingDebounce = {}

// ── Helpers de fecha ──────────────────────────────────────────────────────────
// Parsea 'YYYY-MM-DD' en hora local (evita el desfase UTC de new Date('YYYY-MM-DD'))
function getDaysLeft(dueDateStr) {
  const [y, m, d] = dueDateStr.split('-').map(Number)
  const due   = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

// Genera 'YYYY-MM-DD' en hora local sin desfase UTC
function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function urgencyClass(days, done) {
  if (done)      return ''
  if (days <= 3) return 'urgency-high'
  if (days <= 7) return 'urgency-mid'
  return 'urgency-low'
}

function daysLabel(days) {
  if (days < 0)   return `venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
  if (days === 0) return '¡vence hoy!'
  if (days === 1) return 'vence mañana'
  return `${days} días`
}

// ── Load & render ─────────────────────────────────────────────────────────────
async function loadPending() {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return

  const { data, error } = await sb.from('pending_items')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date')

  if (error) { console.error(error); return }
  pendingItems = data || []
  renderPending()
}

function renderPending() {
  // No completados ordenados por fecha, completados al fondo
  const sorted = [...pendingItems].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.due_date.localeCompare(b.due_date)
  })

  const list = document.getElementById('pendingList')
  list.innerHTML = ''

  if (sorted.length === 0) {
    list.innerHTML = '<div style="font-size:0.65rem;color:var(--muted);padding:8px 0">sin pendientes — ¡todo en orden! ✓</div>'
    return
  }

  sorted.forEach(item => {
    const days = getDaysLeft(item.due_date)
    const urg  = urgencyClass(days, item.done)

    const card = document.createElement('div')
    card.className = `pending-card ${urg} ${item.done ? 'done' : ''}`
    card.innerHTML = `
      <div class="pending-check ${item.done ? 'checked' : ''}" data-pid="${item.id}"></div>
      <div class="pending-body">
        <div class="pending-title" contenteditable="true" spellcheck="false" data-pid="${item.id}">${item.title}</div>
        <div class="pending-due">
          <input type="date" value="${item.due_date}" data-pid="${item.id}">
          <span class="pending-days">${daysLabel(days)}</span>
        </div>
      </div>
      <div></div>
      <button class="btn-del-pending" data-pid="${item.id}">×</button>
    `
    list.appendChild(card)
  })
}

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('pendingList').addEventListener('click', async e => {
  const check = e.target.closest('.pending-check')
  const del   = e.target.closest('.btn-del-pending')

  if (check) {
    const id   = check.dataset.pid
    const item = pendingItems.find(p => p.id === id)
    if (!item) return
    item.done = !item.done
    renderPending()
    flashSaving()
    await sb.from('pending_items').update({ done: item.done }).eq('id', id)
  }

  if (del) {
    const id = del.dataset.pid
    pendingItems = pendingItems.filter(p => p.id !== id)
    renderPending()
    flashSaving()
    await sb.from('pending_items').delete().eq('id', id)
  }
})

document.getElementById('pendingList').addEventListener('input', async e => {
  const titleEl = e.target.closest('.pending-title')
  const dateEl  = e.target.closest('input[type="date"]')

  if (titleEl) {
    const id   = titleEl.dataset.pid
    const item = pendingItems.find(p => p.id === id)
    if (!item) return
    item.title = titleEl.textContent.trim()
    clearTimeout(_pendingDebounce['t_' + id])
    _pendingDebounce['t_' + id] = setTimeout(async () => {
      flashSaving()
      await sb.from('pending_items').update({ title: item.title }).eq('id', id)
    }, 700)
  }

  if (dateEl) {
    const id   = dateEl.dataset.pid
    const item = pendingItems.find(p => p.id === id)
    if (!item) return
    item.due_date = dateEl.value
    renderPending()
    flashSaving()
    await sb.from('pending_items').update({ due_date: item.due_date }).eq('id', id)
  }
})

// ── Add ───────────────────────────────────────────────────────────────────────
window.addPending = async function () {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return

  const due = new Date()
  due.setDate(due.getDate() + 7)
  const dueStr = localDateStr(due)

  const { data, error } = await sb.from('pending_items')
    .insert({ user_id: user.id, title: 'Nuevo pendiente', due_date: dueStr, done: false })
    .select()
    .single()

  if (error) { console.error(error); return }

  pendingItems.push(data)
  renderPending()

  // Enfocar el título para que el usuario lo edite de inmediato
  setTimeout(() => {
    const match = [...document.querySelectorAll('.pending-title')]
      .find(el => el.dataset.pid === data.id)
    if (!match) return

    match.focus()
    document.execCommand('selectAll', false, null)

    // Guardar el título cuando el usuario termina de escribir (blur)
    match.addEventListener('blur', async function onBlur() {
      match.removeEventListener('blur', onBlur)
      const newTitle = match.textContent.trim()
      if (newTitle && newTitle !== 'Nuevo pendiente') {
        const item = pendingItems.find(p => p.id === data.id)
        if (item) item.title = newTitle
        flashSaving()
        await sb.from('pending_items').update({ title: newTitle }).eq('id', data.id)
      }
    })
  }, 50)
}
