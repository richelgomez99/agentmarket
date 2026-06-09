// The "before" page — a stereotypical generic AI-generated site (purple gradients, emoji
// bullets, "Unlock/Empower/Elevate" copy). Shown at idle so the demo arc reads:
// "generic AI build → a hired SPECIALIST with a proven track record." Our pitch in miniature.
export const UGLY_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Nocturne Coffee</title>
<style>
*{margin:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;min-height:100vh}
.nav{display:flex;justify-content:space-between;padding:20px 40px;align-items:center}
.logo{font-size:22px;font-weight:bold}
.nav a{color:#fff;margin-left:18px;text-decoration:none;font-size:14px}
.hero{text-align:center;padding:70px 20px 50px}
h1{font-size:44px;margin-bottom:14px;background:linear-gradient(90deg,#fff,#e0c3fc);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-size:17px;opacity:.9;max-width:560px;margin:0 auto 26px}
.cta{display:inline-block;background:linear-gradient(90deg,#a18cd1,#fbc2eb);color:#4a2c6d;padding:14px 34px;border-radius:50px;font-weight:bold;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:30px 40px 60px;max-width:1000px;margin:0 auto}
.card{background:rgba(255,255,255,.12);border-radius:16px;padding:24px;backdrop-filter:blur(4px);text-align:center}
.card .em{font-size:34px;margin-bottom:10px}
.card h3{margin-bottom:8px;font-size:17px}
.card p{font-size:13px;opacity:.85;line-height:1.5}
.foot{text-align:center;padding:24px;font-size:12px;opacity:.7}
</style></head>
<body>
<div class="nav"><div class="logo">☕ Nocturne Coffee</div><div><a href="#">Home</a><a href="#">Features</a><a href="#">Pricing</a><a href="#">Contact</a></div></div>
<div class="hero">
<h1>Unlock Your Coffee Journey 🚀</h1>
<p class="sub">Empower your mornings with AI-driven, next-generation coffee solutions designed to elevate your lifestyle and supercharge your day.</p>
<a class="cta" href="#">Get Started Free →</a>
</div>
<div class="cards">
<div class="card"><div class="em">⚡</div><h3>Lightning Fast</h3><p>Leverage cutting-edge roasting technology for seamless flavor experiences.</p></div>
<div class="card"><div class="em">🤖</div><h3>AI-Powered</h3><p>Our revolutionary algorithms unlock the full potential of every bean.</p></div>
<div class="card"><div class="em">🌟</div><h3>Premium Quality</h3><p>Join thousands of happy customers on a transformative coffee journey.</p></div>
</div>
<div class="foot">© 2026 Nocturne Coffee · Made with 💜</div>
</body>
</html>`;
