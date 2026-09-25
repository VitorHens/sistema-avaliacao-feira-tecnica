(() => {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const hero = document.querySelector('.hero-photo');
  if (!hero) return;
  let scheduled = false;
  function draw() {
    scheduled = false;
    hero.style.transform = media.matches || mobile.matches ? '' : `translateY(${Math.min(scrollY, innerHeight) * .12}px) scale(1.04)`;
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(draw); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  media.addEventListener('change', schedule);
  mobile.addEventListener('change', schedule);
  draw();
  // Entrada progressiva somente abaixo da área visível, sem bloquear a rolagem.
  if ('IntersectionObserver' in window && !media.matches) {
    const pending = new Set();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.replace('reveal-pending','reveal-ready');
        pending.delete(entry.target); observer.unobserve(entry.target);
      }
    }), {threshold:0.08});
    document.querySelectorAll('.visitor-intro,.visitor-actions,.catalogo-head,.school-section>div,.closing h2').forEach(el => {
      if(el.getBoundingClientRect().top > innerHeight){el.classList.add('reveal-pending');pending.add(el);observer.observe(el);}
    });
    media.addEventListener('change',()=>{if(media.matches){pending.forEach(el=>el.classList.remove('reveal-pending'));observer.disconnect();pending.clear();}});
  }
})();
