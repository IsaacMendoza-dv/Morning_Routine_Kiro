// ── pending.js — pendientes a mediano plazo ───────────────────────────────────

window.pendingItems = []
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

function formatDateDisplay(dueDateStr) {
  const [y, m, d] = dueDateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
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
    card.className   = `pending-card ${urg} ${item.done ? 'done' : ''}`
    card.dataset.pid = item.id

    // ── Checkbox ──
    const check = document.createElement('div')
    check.className = `pending-check ${item.done ? 'checked' : ''}`
    check.dataset.pid = item.id
    check.onclick = (e) => {
      e.stopPropagation()
      const id   = check.dataset.pid
      const itm  = pendingItems.find(p => p.id === id)
      if (!itm) return

      // Actualizar estado local
      itm.done = !itm.done

      // Actualizar DOM sin re-render completo
      check.classList.toggle('checked', itm.done)
      card.classList.toggle('done', itm.done)
      daysSpan.style.display = itm.done ? 'none' : ''

      // Actualizar clase de urgencia
      card.classList.remove('urgency-low', 'urgency-mid', 'urgency-high')
      if (!itm.done) card.classList.add(urgencyClass(days, false))

      // Guardar en Supabase
      flashSaving()
      sb.from('pending_items').update({ done: itm.done }).eq('id', id)
    }

    // ── Body ──
    const body = document.createElement('div')
    body.className = 'pending-body'

    // Título editable
    const titleEl = document.createElement('div')
    titleEl.className       = 'pending-title'
    titleEl.contentEditable = 'false'
    titleEl.addEventListener('dblclick', function() {
      titleEl.contentEditable = 'true'
      titleEl.focus()
    })
    titleEl.addEventListener('blur', function() {
      titleEl.contentEditable = 'false'
    })
    titleEl.spellcheck      = false
    titleEl.textContent     = item.title
    titleEl.addEventListener('input', () => {
      item.title = titleEl.textContent.trim()
      clearTimeout(_pendingDebounce['t_' + item.id])
      _pendingDebounce['t_' + item.id] = setTimeout(async () => {
        flashSaving()
        await sb.from('pending_items').update({ title: item.title }).eq('id', item.id)
      }, 700)
    })

    // Fila de fecha — input oculto + label clickeable
    const dueRow = document.createElement('div')
    dueRow.className = 'pending-due'

    // Input date oculto (invisible pero funcional)
    const dateInput = document.createElement('input')
    dateInput.type  = 'date'
    dateInput.value = item.due_date
    dateInput.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;'
    dateInput.addEventListener('change', async () => {
      if (!dateInput.value) return
      item.due_date = dateInput.value
      dateLabel.textContent = formatDateDisplay(item.due_date)
      const newDays = getDaysLeft(item.due_date)
      daysSpan.textContent = daysLabel(newDays)
      card.classList.remove('urgency-low', 'urgency-mid', 'urgency-high')
      if (!item.done) card.classList.add(urgencyClass(newDays, false))
      flashSaving()
      await sb.from('pending_items').update({ due_date: item.due_date }).eq('id', item.id)
    })

    // Texto de fecha clickeable que abre el datepicker
    const dateLabel = document.createElement('span')
    dateLabel.className   = 'pending-date-label'
    dateLabel.textContent = formatDateDisplay(item.due_date)
    dateLabel.title       = 'Clic para cambiar fecha'
    dateLabel.addEventListener('click', (e) => {
      e.stopPropagation()
      dateInput.showPicker ? dateInput.showPicker() : dateInput.click()
    })

    // Badge de días restantes
    const daysSpan = document.createElement('span')
    daysSpan.className   = 'pending-days'
    daysSpan.textContent = daysLabel(days)
    if (item.done) daysSpan.style.display = 'none'

    dueRow.appendChild(dateInput)
    dueRow.appendChild(dateLabel)
    dueRow.appendChild(daysSpan)

    body.appendChild(titleEl)
    body.appendChild(dueRow)

    // ── Spacer + Delete ──
    const gap = document.createElement('div')

    const delBtn = document.createElement('button')
    delBtn.className   = 'btn-del-pending'
    delBtn.textContent = '×'
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      window.pendingItems = window.pendingItems.filter(p => p.id !== item.id)
      card.remove()
      flashSaving()
      sb.from('pending_items').delete().eq('id', item.id)
      if (pendingItems.length === 0) renderPending()
    })

    card.appendChild(check)
    card.appendChild(body)
    card.appendChild(gap)
    card.appendChild(delBtn)
    list.appendChild(card)
  })
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

  // Enfocar el título del nuevo pendiente
  setTimeout(() => {
    const cards = document.querySelectorAll('.pending-card')
    const last  = cards[cards.length - 1]
    if (!last) return
    const titleEl = last.querySelector('.pending-title')
    if (!titleEl) return
    titleEl.focus()
    document.execCommand('selectAll', false, null)

    titleEl.addEventListener('blur', async function onBlur() {
      titleEl.removeEventListener('blur', onBlur)
      const newTitle = titleEl.textContent.trim()
      if (newTitle && newTitle !== 'Nuevo pendiente') {
        const item = pendingItems.find(p => p.id === data.id)
        if (item) item.title = newTitle
        flashSaving()
        await sb.from('pending_items').update({ title: newTitle }).eq('id', data.id)
      }
    })
  }, 50)
}