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
    card.dataset.id = item.id

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
    titleEl.tabIndex = -1
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

    const dateLabel = document.createElement('span')
    dateLabel.className = 'pending-date-label'
    dateLabel.textContent = formatDateDisplay(item.due_date)
    dateLabel.title = 'Clic para cambiar fecha'
    dateLabel.onclick = function(e) {
      e.stopPropagation()
      showCustomDatePicker(dateLabel, item.due_date, async function(newDateStr) {
        item.due_date = newDateStr
        dateLabel.textContent = formatDateDisplay(item.due_date)
        var newDays = getDaysLeft(item.due_date)
        daysSpan.textContent = daysLabel(newDays)
        card.classList.remove('urgency-low', 'urgency-mid', 'urgency-high')
        if (!item.done) card.classList.add(urgencyClass(newDays, false))
        flashSaving()
        await sb.from('pending_items').update({ due_date: item.due_date }).eq('id', item.id)
      })
    }

    const daysSpan = document.createElement('span')
    daysSpan.className = 'pending-days'
    daysSpan.textContent = daysLabel(days)
    if (item.done) daysSpan.style.display = 'none'

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
    var newCard = document.querySelector(`.pending-card[data-id="${data.id}"]`)
    if (!newCard) return
    var titleEl = newCard.querySelector('.pending-title')
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

// ── Custom Date Picker Popup Implementation ──────────────────────────────────────
let activeDatePicker = null;

function showCustomDatePicker(anchorEl, currentDateStr, onSelect) {
  if (activeDatePicker) {
    activeDatePicker.close();
  }

  // Parse target date (local date logic to avoid timezone shifting)
  const [y, m, d] = currentDateStr.split('-').map(Number);
  let displayedYear = y;
  let displayedMonth = m - 1; // 0-11

  // Create picker container
  const picker = document.createElement('div');
  picker.className = 'custom-date-picker';
  
  // Position the picker
  document.body.appendChild(picker);
  const rect = anchorEl.getBoundingClientRect();
  const pickerWidth = 280;
  let top = rect.bottom + window.scrollY + 6;
  let left = rect.left + window.scrollX;
  
  // Keep picker in view bounds
  if (left + pickerWidth > window.innerWidth) {
    left = window.innerWidth - pickerWidth - 12;
  }
  if (left < 12) left = 12;
  
  picker.style.top = top + 'px';
  picker.style.left = left + 'px';

  function close() {
    picker.remove();
    document.removeEventListener('click', handleOutsideClick);
    window.removeEventListener('resize', close);
    activeDatePicker = null;
  }

  function handleOutsideClick(e) {
    if (!picker.contains(e.target) && e.target !== anchorEl) {
      close();
    }
  }

  // Expose close API
  picker.close = close;
  activeDatePicker = picker;

  // Add click-outside listener after bubble
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('resize', close);
  }, 0);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekdayNames = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

  function renderCalendar() {
    picker.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'cdp-header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'cdp-nav-btn';
    prevBtn.innerHTML = '‹';
    prevBtn.onclick = function(e) {
      e.stopPropagation();
      displayedMonth--;
      if (displayedMonth < 0) {
        displayedMonth = 11;
        displayedYear--;
      }
      renderCalendar();
    };

    const label = document.createElement('div');
    label.className = 'cdp-month-label';
    label.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cdp-nav-btn';
    nextBtn.innerHTML = '›';
    nextBtn.onclick = function(e) {
      e.stopPropagation();
      displayedMonth++;
      if (displayedMonth > 11) {
        displayedMonth = 0;
        displayedYear++;
      }
      renderCalendar();
    };

    header.appendChild(prevBtn);
    header.appendChild(label);
    header.appendChild(nextBtn);
    picker.appendChild(header);

    // Weekdays row
    const weekdaysRow = document.createElement('div');
    weekdaysRow.className = 'cdp-weekdays';
    weekdayNames.forEach(name => {
      const dayNameEl = document.createElement('div');
      dayNameEl.textContent = name;
      weekdaysRow.appendChild(dayNameEl);
    });
    picker.appendChild(weekdaysRow);

    // Days grid
    const daysGrid = document.createElement('div');
    daysGrid.className = 'cdp-days';

    // Calculate calendar days
    const firstDayIndex = new Date(displayedYear, displayedMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust first day to start with Monday (Monday = 0, Sunday = 6)
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    
    const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();

    // Add empty cells for offset
    for (let i = 0; i < adjustedFirstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cdp-day cdp-empty';
      daysGrid.appendChild(emptyCell);
    }

    const today = new Date();

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'cdp-day';
      dayEl.textContent = day;

      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(displayedMonth + 1).padStart(2, '0');
      const formattedDate = `${displayedYear}-${monthStr}-${dayStr}`;

      if (formattedDate === currentDateStr) {
        dayEl.classList.add('cdp-selected');
      }

      if (today.getFullYear() === displayedYear &&
          today.getMonth() === displayedMonth &&
          today.getDate() === day) {
        dayEl.classList.add('cdp-today');
      }

      dayEl.onclick = function(e) {
        e.stopPropagation();
        onSelect(formattedDate);
        close();
      };

      daysGrid.appendChild(dayEl);
    }

    picker.appendChild(daysGrid);
  }

  renderCalendar();
}