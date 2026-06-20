// ── tasks.js — CRUD de tareas diarias, render y barra de progreso ────────────
// Requiere: sb, flashSaving (main.js)

const DEFAULT_TASKS = [
  { name: 'Quehacer del hogar', duration: 30, done: false, position: 0 },
  { name: 'Ejercicio',          duration: 40, done: false, position: 1 },
  { name: 'Desayuno',           duration: 20, done: false, position: 2 },
  { name: 'Estudio / lectura',  duration: 30, done: false, position: 3 },
  { name: 'Arreglarme',         duration: 20, done: false, position: 4 },
]

let tasks     = []
let startTime = localStorage.getItem('mr_startTime') || '05:30'
let _nameDebounce = {}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadTasks() {
  const { data, error } = await sb.from('tasks').select('*').order('position')
  if (error) { console.error(error); return }

  if (data.length === 0) {
    const { data: { user } } = await sb.auth.getUser()
    const { data: inserted } = await sb.from('tasks')
      .insert(DEFAULT_TASKS.map(t => ({ ...t, user_id: user.id })))
      .select()
    tasks = inserted || []
  } else {
    tasks = data
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const list = document.getElementById('taskList')
  list.innerHTML = ''
  const [sh, sm] = startTime.split(':').map(Number)
  let cursor = sh * 60 + sm

  tasks.forEach(task => {
    const sHH = String(Math.floor(cursor / 60)).padStart(2, '0')
    const sMM = String(cursor % 60).padStart(2, '0')
    cursor += Number(task.duration) || 0
    const eHH = String(Math.floor(cursor / 60)).padStart(2, '0')
    const eMM = String(cursor % 60).padStart(2, '0')

    const card = document.createElement('div')
    card.className = 'task-card' + (task.done ? ' done' : '')
    card.innerHTML = `
      <div class="task-check ${task.done ? 'checked' : ''}" data-id="${task.id}"></div>
      <div class="task-body">
        <div class="task-name" contenteditable="true" spellcheck="false" data-id="${task.id}">${task.name}</div>
        <div class="task-duration">
          <input type="number" min="1" max="180" value="${task.duration}" data-id="${task.id}">
          <span>min</span>
        </div>
      </div>
      <div class="task-time-slot">${sHH}:${sMM} → ${eHH}:${eMM}</div>
      <button class="btn-del" data-id="${task.id}">×</button>
    `
    list.appendChild(card)
  })

  updateProgress()
  updateTotalInfo(cursor, sh * 60 + sm)
}

function updateProgress() {
  const total = tasks.length
  const done  = tasks.filter(t => t.done).length
  const pct   = total ? Math.round(done / total * 100) : 0
  document.getElementById('progressLabel').textContent = `${done} / ${total} tareas completadas`
  document.getElementById('progressPct').textContent   = `${pct}%`
  document.getElementById('progressFill').style.width  = pct + '%'
}

function updateTotalInfo(endMin, startMin) {
  const eHH = String(Math.floor(endMin / 60)).padStart(2, '0')
  const eMM = String(endMin % 60).padStart(2, '0')
  document.getElementById('totalTimeInfo').textContent =
    `total: ${endMin - startMin} min · fin estimado: ${eHH}:${eMM}`
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function patchTask(id, fields) {
  flashSaving()
  await sb.from('tasks').update(fields).eq('id', id)
}

async function deleteTask(id) {
  flashSaving()
  await sb.from('tasks').delete().eq('id', id)
}

async function insertTask(task) {
  flashSaving()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data, error } = await sb.from('tasks').insert({ ...task, user_id: user.id }).select().single()
  if (error) console.error('insert error:', error)
  return data
}

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('taskList').addEventListener('click', async e => {
  const check = e.target.closest('.task-check')
  const del   = e.target.closest('.btn-del')

  if (check || del) {
    if (document.activeElement) {
      document.activeElement.blur();
    }
    window.getSelection()?.removeAllRanges();
  }

  if (check) {
    const id = check.dataset.id
    const t  = tasks.find(t => t.id === id)
    if (!t) return
    t.done = !t.done
    render()
    await patchTask(id, { done: t.done })
    try { await logDay({ tasks_total: tasks.length, tasks_done: tasks.filter(t => t.done).length }) } catch {}
  }

  if (del) {
    const id = del.dataset.id
    tasks = tasks.filter(t => t.id !== id)
    render()
    await deleteTask(id)
  }
})

document.getElementById('taskList').addEventListener('input', async e => {
  const nameEl = e.target.closest('.task-name')
  const durEl  = e.target.closest('input[type="number"]')

  if (nameEl) {
    const id = nameEl.dataset.id
    const t  = tasks.find(t => t.id === id)
    if (!t) return
    t.name = nameEl.textContent.trim()
    clearTimeout(_nameDebounce[id])
    _nameDebounce[id] = setTimeout(() => patchTask(id, { name: t.name }), 700)
  }

  if (durEl) {
    const id = durEl.dataset.id
    const t  = tasks.find(t => t.id === id)
    if (!t) return
    t.duration = Number(durEl.value)
    render()
    clearTimeout(_nameDebounce['dur_' + id])
    _nameDebounce['dur_' + id] = setTimeout(() => patchTask(id, { duration: t.duration }), 700)
  }
})

document.getElementById('startTime').addEventListener('change', e => {
  startTime = e.target.value
  localStorage.setItem('mr_startTime', startTime)
  render()
})

// ── Public actions ────────────────────────────────────────────────────────────
window.addTask = async function () {
  const position = tasks.length
  const newTask  = await insertTask({ name: 'Nueva tarea', duration: 15, done: false, position })
  if (!newTask) return
  tasks.push(newTask)
  render()
  setTimeout(() => {
    const names = document.querySelectorAll('.task-name')
    const last  = names[names.length - 1]
    if (last) { last.focus(); document.execCommand('selectAll', false, null) }
  }, 50)
}

window.resetDay = async function () {
  if (!confirm('¿Reiniciar el progreso del día?')) return
  if (document.activeElement) document.activeElement.blur()
  window.getSelection()?.removeAllRanges()
  tasks.forEach(t => t.done = false)
  render()
  flashSaving()
  await Promise.all(tasks.map(t => sb.from('tasks').update({ done: false }).eq('id', t.id)))
}
