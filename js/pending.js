// pending.js - pendientes a mediano plazo
// Requiere: sb, flashSaving (main.js)

window.pendingItems = []
var _pendingDebounce = {}

function getDaysLeft(dueDateStr) {
  const [y, m, d] = dueDateStr.split('-').map(Number)
  const due   = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

function localDateStr(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
}

function urgencyClass(days, done) {
  if (done)      return ''
  if (days <= 3) return 'urgency-high'
  if (days <= 7) return 'urgency-mid'
  return 'urgency-low'
}

function daysLabel(days) {
  if (days < 0)   return 'vencio hace ' + Math.abs(days) + (Math.abs(days) !== 1 ? ' dias' : ' dia')
  if (days === 0) return 'vence hoy!'
  if (days === 1) return 'vence manana'
  return days + ' dias'
}

function formatDateDisplay(dueDateStr) {
  const [y, m, d] = dueDateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function loadPending() {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  const { data, error } = await sb.from('pending_items')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date')
  if (error) { console.error(error); return }
  window.pendingItems = data || []
  renderPending()
}

function renderPending() {
  const sorted = [...window.pendingItems].sort(function(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.due_date.localeCompare(b.due_date)
  })

  const list = document.getElementById('pendingList')
  list.innerHTML = ''

  if (sorted.length === 0) {
    list.innerHTML = '<div style="font-size:0.65rem;color:var(--muted);padding:8px 0">sin pendientes - todo en orden!</div>'
    return
  }

  sorted.forEach(function(item) {
    const days = getDaysLeft(item.due_date)
    const urg  = urgencyClass(days, item.done)

    const card = document.createElement('div')
    card.className = 'pending-card ' + urg + (item.done ? ' done' : '')

    // Checkbox
    const check = document.createElement('div')
    check.className = 'pending-check' + (item.done ? ' checked' : '')

    check.onclick = function() {
    if (document.activeElement) document.activeElement.blur()
      var found = null
      for (var i = 0; i < window.pendingItems.length; i++) {
        if (String(window.pendingItems[i].id) === String(item.id)) {
          found = window.pendingItems[i]
          break
        }
      }
      if (!found) {
        console.log('item no encontrado, id:', item.id)
        return
      }
      found.done = !found.done
      check.classList.toggle('checked', found.done)
      card.classList.toggle('done', found.done)
      daysSpan.style.display = found.done ? 'none' : ''
      card.classList.remove('urgency-low', 'urgency-mid', 'urgency-high')
      if (!found.done) card.classList.add(urgencyClass(getDaysLeft(found.due_date), false))
      flashSaving()
      sb.from('pending_items').update({ done: found.done }).eq('id', found.id)
    }

    // Body
    const body = document.createElement('div')
    body.className = 'pending-body'

    // Titulo - doble clic para editar
    const titleEl = document.createElement('div')
    titleEl.className = 'pending-title'
    titleEl.contentEditable = 'false'
    titleEl.spellcheck = false
    titleEl.textContent = item.title
    titleEl.style.pointerEvents = 'auto'
    titleEl.style.cursor = 'default'

    titleEl.addEventListener('dblclick', function() {
      titleEl.contentEditable = 'true'
      titleEl.style.cursor = 'text'
      titleEl.focus()
      var range = document.createRange()
      range.selectNodeContents(titleEl)
      var sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    })

    titleEl.addEventListener('blur', function() {
      titleEl.contentEditable = 'false'
      titleEl.style.cursor = 'default'
      var newTitle = titleEl.textContent.trim()
      if (newTitle !== item.title) {
        item.title = newTitle
        clearTimeout(_pendingDebounce['t_' + item.id])
        _pendingDebounce['t_' + item.id] = setTimeout(async function() {
          flashSaving()
          await sb.from('pending_items').update({ title: item.title }).eq('id', item.id)
        }, 300)
      }
    })

    titleEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault()
        titleEl.blur()
      }
    })

    // Fila de fecha
    const dueRow = document.createElement('div')
    dueRow.className = 'pending-due'

    const dateInput = document.createElement('input')
    dateInput.type  = 'date'
    dateInput.value = item.due_date
    dateInput.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;'
    dateInput.addEventListener('change', async function() {
      if (!dateInput.value) return
      item.due_date = dateInput.value
      dateLabel.textContent = formatDateDisplay(item.due_date)
      var newDays = getDaysLeft(item.due_date)
      daysSpan.textContent = daysLabel(newDays)
      card.classList.remove('urgency-low', 'urgency-mid', 'urgency-high')
      if (!item.done) card.classList.add(urgencyClass(newDays, false))
      flashSaving()
      await sb.from('pending_items').update({ due_date: item.due_date }).eq('id', item.id)
    })

    const dateLabel = document.createElement('span')
    dateLabel.className = 'pending-date-label'
    dateLabel.textContent = formatDateDisplay(item.due_date)
    dateLabel.title = 'Clic para cambiar fecha'
    dateLabel.onclick = function(e) {
      e.stopPropagation()
      if (dateInput.showPicker) dateInput.showPicker()
      else dateInput.click()
    }

    const daysSpan = document.createElement('span')
    daysSpan.className = 'pending-days'
    daysSpan.textContent = daysLabel(days)
    if (item.done) daysSpan.style.display = 'none'

    dueRow.appendChild(dateInput)
    dueRow.appendChild(dateLabel)
    dueRow.appendChild(daysSpan)
    body.appendChild(titleEl)
    body.appendChild(dueRow)

    const gap = document.createElement('div')

    const delBtn = document.createElement('button')
    delBtn.className = 'btn-del-pending'
    delBtn.textContent = 'x'
    delBtn.onclick = function() {
      window.pendingItems = window.pendingItems.filter(function(p) {
        return String(p.id) !== String(item.id)
      })
      card.remove()
      flashSaving()
      sb.from('pending_items').delete().eq('id', item.id)
      if (window.pendingItems.length === 0) renderPending()
    }

    card.appendChild(check)
    card.appendChild(body)
    card.appendChild(gap)
    card.appendChild(delBtn)
    list.appendChild(card)
  })
}

window.addPending = async function() {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return

  var due = new Date()
  due.setDate(due.getDate() + 7)
  var dueStr = localDateStr(due)

  const { data, error } = await sb.from('pending_items')
    .insert({ user_id: user.id, title: 'Nuevo pendiente', due_date: dueStr, done: false })
    .select()
    .single()

  if (error) { console.error(error); return }

  window.pendingItems.push(data)
  renderPending()

  setTimeout(function() {
    var cards = document.querySelectorAll('.pending-card')
    var last  = cards[cards.length - 1]
    if (!last) return
    var titleEl = last.querySelector('.pending-title')
    if (!titleEl) return
    titleEl.contentEditable = 'true'
    titleEl.focus()
    document.execCommand('selectAll', false, null)

    titleEl.addEventListener('blur', async function onBlur() {
      titleEl.removeEventListener('blur', onBlur)
      titleEl.contentEditable = 'false'
      var newTitle = titleEl.textContent.trim()
      if (newTitle && newTitle !== 'Nuevo pendiente') {
        var found = window.pendingItems.find(function(p) {
          return String(p.id) === String(data.id)
        })
        if (found) found.title = newTitle
        flashSaving()
        await sb.from('pending_items').update({ title: newTitle }).eq('id', data.id)
      }
    })
  }, 50)
}