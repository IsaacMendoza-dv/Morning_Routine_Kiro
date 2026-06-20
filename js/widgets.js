// ── widgets.js — clima (Open-Meteo) y Google Calendar ────────────────────────
// Requiere: sb (main.js)

// ── Clima ─────────────────────────────────────────────────────────────────────
async function fetchWeather() {
  try {
    const res  = await fetch('https://api.open-meteo.com/v1/forecast?latitude=19.4326&longitude=-99.1332&current=temperature_2m,precipitation_probability,weathercode&timezone=America%2FMexico_City')
    const d    = await res.json()
    const temp = Math.round(d.current.temperature_2m)
    const rain = d.current.precipitation_probability
    const code = d.current.weathercode

    let icon, msg
    if (rain >= 60 || [61, 63, 65, 80, 81, 82].includes(code)) {
      icon = '🌧️'; msg = `<strong>Lleva paraguas</strong> — se pronostican lluvias (${rain}% prob.)`
    } else if (rain >= 30 || [51, 53, 55].includes(code)) {
      icon = '🌦️'; msg = `<strong>Puede llover</strong> — lleva paraguas por si acaso (${rain}% prob.)`
    } else if (temp >= 28) {
      icon = '☀️'; msg = `<strong>Llévate los lentes de sol</strong> — hará calor hoy`
    } else if ([1, 2, 3, 45, 48].includes(code)) {
      icon = '☁️'; msg = `Cielo nublado hoy, sin lluvia esperada`
    } else {
      icon = '🌤️'; msg = `Buen día para salir — sin lluvia esperada`
    }

    document.getElementById('weatherIcon').textContent = icon
    document.getElementById('weatherMsg').innerHTML    = msg
    document.getElementById('weatherTemp').textContent = `${temp}°C`
  } catch {
    document.getElementById('weatherMsg').textContent = 'pronóstico no disponible'
  }
}

// ── Google Calendar ───────────────────────────────────────────────────────────
async function fetchCalendar() {
  const el = document.getElementById('calendarEvents')
  try {
    const token = localStorage.getItem('mr_gtoken')
    if (!token) {
      el.innerHTML = '<span class="cal-empty">reconecta con Google para ver tu agenda</span>'
      return
    }

    const now   = new Date()
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end   = new Date(now); end.setHours(23, 59, 59, 999)
    const calId = encodeURIComponent('cim.ramirez@etribe.mx')
    const url   = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&fields=items(start,end,summary)`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

    if (res.status === 401) {
      localStorage.removeItem('mr_gtoken')
      el.innerHTML = '<span class="cal-empty">sesión expirada — reconecta con Google</span>'
      return
    }

    const data = await res.json()

    if (!data.items || data.items.length === 0) {
      el.innerHTML = '<span class="cal-empty">✓ sin eventos hoy</span>'
      return
    }

    el.innerHTML = data.items.map(ev => {
      const s   = ev.start.dateTime ? new Date(ev.start.dateTime) : null
      const e   = ev.end.dateTime   ? new Date(ev.end.dateTime)   : null
      const fmt = d => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      const timeStr = s && e ? `${fmt(s)} – ${fmt(e)}` : 'todo el día'
      return `
        <div class="calendar-event">
          <div class="cal-dot"></div>
          <div class="cal-time">${timeStr}</div>
          <div class="cal-busy">ocupado</div>
        </div>`
    }).join('')
  } catch {
    el.innerHTML = '<span class="cal-empty">no se pudo cargar la agenda</span>'
  }
}
