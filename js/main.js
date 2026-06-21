// main.js - Supabase client, autenticacion, inicio de app

const SUPABASE_URL = 'https://ysoaipscjkuritviyopf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_DjojLjFLN5y7F2NytE0JQA_RUIs-Xrf'
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let _saveTimer = null
function flashSaving() {
  const el = document.getElementById('savingIndicator')
  el.classList.add('visible')
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => el.classList.remove('visible'), 1200)
}

let _appLoaded = false

function showAuth() {
  document.getElementById('authScreen').style.display = 'flex'
  document.getElementById('appScreen').style.display  = 'none'
}

async function showApp() {
  const { data: { user } } = await sb.auth.getUser()
  if (!user || user.email !== 'ca.isaac.mendoza@gmail.com') {
    await sb.auth.signOut()
    document.getElementById('authMsg').textContent = 'Acceso no autorizado.'
    showAuth()
    return
  }
  await new Promise(resolve => {
    if (document.readyState === 'complete') resolve()
    else window.addEventListener('load', resolve, { once: true })
  })

  document.getElementById('authScreen').style.display = 'none'
  document.getElementById('appScreen').style.display  = 'block'
  document.getElementById('startTime').value = localStorage.getItem('mr_startTime') || '05:30'

  await loadTasks()
  render()
  updateCountdown()
  setInterval(updateCountdown, 1000)
  fetchWeather()
  fetchCalendar()
  loadMood()
  window.dispatchEvent(new Event('app:ready'))
}

sb.auth.onAuthStateChange((_e, session) => {
  if (session) {
    if (session.provider_token) localStorage.setItem('mr_gtoken', session.provider_token)
    if (!_appLoaded) {
      _appLoaded = true
      showApp()
    }
  } else {
    _appLoaded = false
    showAuth()
  }
})

document.getElementById('btnGoogle').addEventListener('click', async () => {
  const btn = document.getElementById('btnGoogle')
  const msg = document.getElementById('authMsg')
  btn.disabled = true
  btn.textContent = 'redirigiendo...'
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://morning-routine-kiro.vercel.app',
      scopes: 'https://www.googleapis.com/auth/calendar.readonly'
    }
  })
  if (error) {
    msg.textContent = error.message
    btn.disabled = false
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.58-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg> Continuar con Google`
  }
})

document.getElementById('btnSignOut').addEventListener('click', async () => {
  _appLoaded = false
  await sb.auth.signOut()
})