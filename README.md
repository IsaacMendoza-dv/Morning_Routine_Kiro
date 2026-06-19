# Morning Routine — Kiro

App de rutina matutina con autenticación Google, tareas diarias, pendientes a mediano plazo, check-in de estado de ánimo, historial y métricas.

**Stack:** HTML · CSS · JS vanilla · Supabase (auth + PostgreSQL) · Vercel

---

## Estructura del proyecto

```
Morning_Routine_Kiro/
├── index.html          ← Esqueleto HTML puro, sin lógica
├── README.md
│
├── css/
│   ├── base.css        ← Variables CSS, reset, tipografía, botones globales
│   ├── layout.css      ← Auth screen, app shell, header, countdown, progress bar
│   ├── widgets.css     ← Clima (weather-bar) y Google Calendar (calendar-bar)
│   ├── pending.css     ← Sección de pendientes a mediano plazo
│   ├── tasks.css       ← Tarjetas de tareas diarias
│   ├── mood.css        ← Check-in de estado de ánimo
│   └── history.css     ← Panel de historial y métricas emocionales
│
└── js/
    ├── main.js         ← Cliente Supabase, auth Google OAuth, showApp/showAuth
    ├── countdown.js    ← Contador regresivo hacia las 08:00
    ├── widgets.js      ← Clima Open-Meteo + Google Calendar API
    ├── tasks.js        ← CRUD tareas diarias, render, barra de progreso
    ├── pending.js      ← CRUD pendientes a mediano plazo, urgencia por color
    ├── mood.js         ← Mood check-in diario + logDay() compartido
    ├── history.js      ← Panel historial 30 días + métricas emocionales
    └── particles.js    ← Animación de partículas de fondo (canvas)
```

---

## Mapa de funcionalidades → archivos

| Funcionalidad | CSS | JS |
|---|---|---|
| Login con Google | `layout.css` | `main.js` |
| Contador regresivo 08:00 | `layout.css` | `countdown.js` |
| Widget de clima CDMX | `widgets.css` | `widgets.js` |
| Agenda Google Calendar | `widgets.css` | `widgets.js` |
| **Pendientes a mediano plazo** | `pending.css` | `pending.js` |
| Tareas diarias (CRUD) | `tasks.css` | `tasks.js` |
| Barra de progreso | `layout.css` | `tasks.js` |
| Mood check-in | `mood.css` | `mood.js` |
| Historial 30 días | `history.css` | `history.js` |
| Métricas emocionales | `history.css` | `history.js` |
| Partículas animadas | `widgets.css` | `particles.js` |

---

## Base de datos Supabase

### Tabla `tasks`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| name | text | Nombre de la tarea |
| duration | int | Duración en minutos |
| done | bool | Completada hoy |
| position | int | Orden de aparición |

### Tabla `daily_log`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| date | date | Fecha del registro |
| mood | text | Emoji de estado de ánimo |
| tasks_total | int | Total de tareas ese día |
| tasks_done | int | Tareas completadas ese día |

### Tabla `pending_items`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| title | text | Descripción del pendiente |
| due_date | date | Fecha límite |
| done | bool | Completado |
| created_at | timestamptz | Fecha de creación |

---

## Lógica de urgencia en pendientes

| Color | Clase CSS | Días restantes |
|---|---|---|
| 🟢 Verde | `urgency-low` | Más de 7 días |
| 🟡 Amarillo | `urgency-mid` | 4 a 7 días |
| 🔴 Rojo | `urgency-high` | 3 días o menos / vencido |

---

## Deploy

- **Hosting:** Vercel (auto-deploy desde `main`)
- **URL:** https://morning-routine-kiro.vercel.app
- **Auth redirect:** configurado en Supabase → Authentication → URL Configuration
