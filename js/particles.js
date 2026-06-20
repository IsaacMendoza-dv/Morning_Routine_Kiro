// ── particles.js — animación de partículas de fondo ──────────────────────────

;(function () {
  const canvas = document.getElementById('particles')
  const ctx    = canvas.getContext('2d')
  const N      = 100
  let W, H, pts

  const resize  = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight }
  const mkPt    = () => ({
    x:  Math.random() * W,
    y:  Math.random() * H,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r:  Math.random() * 1.8 + 1.2,
    a:  Math.random() * 0.4 + 0.4
  })
  const initPts = () => { pts = Array.from({ length: N }, mkPt) }

  function draw() {
    ctx.clearRect(0, 0, W, H)

    // líneas de conexión
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pts[i].x - pts[j].x
        const dy = pts[i].y - pts[j].y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < 145) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(0,255,170,${0.18 * (1 - d / 145)})`
          ctx.lineWidth   = 0.8
          ctx.moveTo(pts[i].x, pts[i].y)
          ctx.lineTo(pts[j].x, pts[j].y)
          ctx.stroke()
        }
      }
    }

    // puntos
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,220,255,${p.a})`
      ctx.fill()
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > W) p.vx *= -1
      if (p.y < 0 || p.y > H) p.vy *= -1
    })

    requestAnimationFrame(draw)
  }

  window.addEventListener('resize', resize)
  resize()
  initPts()
  draw()
})()
