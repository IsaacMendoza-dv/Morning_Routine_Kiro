// ── pending.js — pendientes a mediano plazo ───────────────────────────────────
// Requiere: sb, flashSaving (main.js)

let pendingItems     = []
let _pendingDebounce = {}

// ── Helpers de fecha ──────────────────────────────────────────────────────────
function getDaysLeft(dueDateStr) {
  const [y, m, d] = dueDateStr.split('-').map(Number)
  const due   = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

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

// ── Load ──────────────────────────────────────────────────────────────────────
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

// ── Render ────────────────────────────────────────────────────────────────────
function renderPending() {
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

    // ── check ──
    const check = document.createElement('div')
    check.className = `pending-check ${item.done ? 'checked' : ''}`
    check.addEventListener('click', () => togglePendingDone(item.id))

    // ── body ──
    const body = document.createElement('div')
    body.className = 'pending-body'

    // título editable
    const title = document.createElement('div')
    title.className     = 'pending-title'
    title.contentEditable = 'true'
    title.spellcheck    = false
    title.textContent   = item.title
    title.addEventListener('input', () => {
      item.title = title.textContent.trim()
      clearTimeout(_pendingDebounce['t_' + item.id])
      _pendingDebounce['t_' + item.id] = setTimeout(async () => {
        flashSaving()
        await sb.from('pending_items').update({ title: item.title }).eq('id', item.id)
      }, 700)
    })

    // fila de fecha
    const due = document.createElement('div')
    due.className = 'pending-due'

    // input date — creado con createElement para evitar que contenteditable lo bloquee
    const dateInput = document.createElement('input')
    dateInput.type  = 'date'
    dateInput.value = item.due_date
    // stopPropagation evita que el click llegue al contenteditable padre
    dateInput.addEventListener('click', e => e.stopPropagation())
    dateInput.addEventListener('change', async () => {
      if (!dateInput.value) return
      item.due_date = dateInput.value
      flashSaving()
      await sb.from('pending_items').update({ due_date: item.due_date }).eq('id', item.id)
      renderPending()
    })

    const daysSpan = document.createElement('span')
    daysSpan.className   = 'pending-days'
    daysSpan.textContent = daysLabel(days)

    due.appendChild(dateInput)
    due.appendChild(daysSpan)
    body.appendChild(title)
    body.appendChild(due)

    // ── delete ──
    const gap = document.createElement('div')

    const delBtn = document.createElement('button')
    delBtn.className   = 'btn-del-pending'
    delBtn.textContent = '×'
    delBtn.addEventListener('click', () => deletePending(item.id))

    card.appendChild(check)
    card.appendChild(body)
    card.appendChild(gap)
    card.appendChild(delBtn)
    list.appendChild(card)
  })
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function togglePendingDone(id) {
  const item = pendingItems.find(p => p.id === id)
  if (!item) return
  item.done = !item.done
  renderPending()
  flashSaving()
  await sb.from('pending_items').update({ done: item.done }).eq('id', id)
}

async function deletePending(id) {
  pendingItems = pendingItems.filter(p => p.id !== id)
  renderPending()
  flashSaving()
  await sb.from('pending_items').delete().eq('id', id)
}

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

  setTimeout(() => {
    const titles = [...document.querySelectorAll('.pending-title')]
    const match  = titles.find(el => {
      const card = el.closest('.pending-card')
      return card && card.querySelector(`input[value="${data.due_date}"]`)
    })
    if (!match) return
    match.focus()
    document.execCommand('selectAll', false, null)

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