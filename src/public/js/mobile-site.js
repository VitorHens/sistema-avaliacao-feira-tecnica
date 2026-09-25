(() => {
  const toggle = document.getElementById('mobileMenuToggle');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;
  const closeButton = menu.querySelector('.mobile-menu-close');
  const page = document.querySelector('main');
  const footer = document.querySelector('.site-footer');
  const mobile = matchMedia('(max-width: 700px)');

  function close(restoreFocus = true) {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    document.body.style.removeProperty('overflow');
    if (page) page.inert = false;
    if (footer) footer.inert = false;
    if (restoreFocus) toggle.focus();
  }

  function open() {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fechar menu');
    document.body.style.overflow = 'hidden';
    if (page) page.inert = true;
    if (footer) footer.inert = true;
    closeButton.focus();
  }

  toggle.addEventListener('click', () => menu.hidden ? open() : close());
  closeButton.addEventListener('click', () => close());
  menu.addEventListener('click', event => {
    if (event.target === menu) close();
    const link = event.target.closest('a');
    if (!link) return;
    close(false);
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) {
      requestAnimationFrame(() => {
        const target = document.getElementById(href.slice(1));
        if (target) { target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true}); }
      });
    }
  });
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = [...menu.querySelectorAll('a,button')].filter(el => !el.hidden);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  mobile.addEventListener('change', () => { if (!mobile.matches) close(false); });
  addEventListener('hashchange', () => close(false));
})();
