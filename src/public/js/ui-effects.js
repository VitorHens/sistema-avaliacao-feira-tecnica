(() => {
  'use strict';

  if (window.__feiraUiReady) return;
  window.__feiraUiReady = true;

  const body = document.body;

  function updateHeaderState() {
    const scrolled = (window.scrollY || document.documentElement.scrollTop || 0) > 10;
    document.querySelectorAll('.topo,.topbar,body > header').forEach(el => {
      el.classList.toggle('is-scrolled', scrolled);
    });
  }
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  updateHeaderState();

  // Menu lateral responsivo das páginas internas.
  const sidebar = document.querySelector('.shell > .sidebar');
  const topbar = document.querySelector('.content > .topbar, .topbar');
  if (sidebar && topbar && !document.querySelector('.ui-menu-toggle')) {
    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'ui-menu-toggle';
    menuButton.setAttribute('aria-label', 'Abrir menu');
    menuButton.setAttribute('aria-expanded', 'false');
    if (!sidebar.id) sidebar.id = 'menu-lateral';
    menuButton.setAttribute('aria-controls', sidebar.id);

    const overlay = document.createElement('div');
    overlay.className = 'ui-sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    body.appendChild(overlay);
    topbar.prepend(menuButton);

    const closeSidebar = () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menu');
      overlay.setAttribute('aria-hidden', 'true');
      body.style.removeProperty('overflow');
      if (sidebar.contains(document.activeElement) && window.innerWidth <= 1000) menuButton.focus();
      sidebar.inert = window.innerWidth <= 1000;
    };

    const openSidebar = () => {
      sidebar.inert = false;
      sidebar.classList.add('mobile-open');
      overlay.classList.add('open');
      menuButton.setAttribute('aria-expanded', 'true');
      menuButton.setAttribute('aria-label', 'Fechar menu');
      overlay.setAttribute('aria-hidden', 'false');
      if (window.innerWidth <= 1000) body.style.overflow = 'hidden';
      sidebar.querySelector('a')?.focus();
    };

    sidebar.inert = window.innerWidth <= 1000;
    menuButton.addEventListener('click', () => {
      sidebar.classList.contains('mobile-open') ? closeSidebar() : openSidebar();
    });
    overlay.addEventListener('click', closeSidebar);
    sidebar.addEventListener('click', event => {
      if (event.target.closest('a') && window.innerWidth <= 1000) closeSidebar();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSidebar();
      if (event.key === 'Tab' && sidebar.classList.contains('mobile-open')) {
        const items = [...sidebar.querySelectorAll('a,button')].filter(el => el.offsetParent !== null);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1000) closeSidebar();
      else sidebar.inert = !sidebar.classList.contains('mobile-open');
    }, { passive: true });
  }


  // Mostra ferramentas administrativas somente para administradores.
  document.querySelectorAll('.admin-only,[data-admin]').forEach(el => {
    if (window.SESSAO && window.SESSAO.role !== 'ADMINISTRADOR') el.classList.add('hidden');
  });

  // Marca a página atual sem efeitos extras.
  const currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-link,.mobile-nav a').forEach(link => {
    const href = (link.getAttribute('href') || '').split('?')[0].split('#')[0].toLowerCase();
    if (href && href === currentFile) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  function repairEncoding(value) {
    const external = window.repararTexto || window.PublicUtils?.repairText;
    if (external) return external(value);
    let text = String(value ?? '');
    if (/[ÃÂ]/.test(text)) {
      try {
        const bytes = Uint8Array.from([...text].map(char => char.charCodeAt(0) & 0xff));
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (decoded && !decoded.includes('�')) text = decoded;
      } catch (_) {}
    }
    return text
      .replaceAll('T�cnica','Técnica').replaceAll('t�cnica','técnica')
      .replaceAll('Inform�tica','Informática').replaceAll('inform�tica','informática')
      .replaceAll('Jo�o','João').replaceAll('jo�o','joão')
      .replaceAll('El�trica','Elétrica').replaceAll('el�trica','elétrica');
  }

  function repairTextTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (parent && !parent.closest('script,style,textarea,pre,code')) {
        const repaired = repairEncoding(root.nodeValue);
        if (repaired !== root.nodeValue) root.nodeValue = repaired;
      }
      return;
    }
    if (!(root instanceof Element || root instanceof Document)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,textarea,pre,code')) continue;
      const repaired = repairEncoding(node.nodeValue);
      if (repaired !== node.nodeValue) node.nodeValue = repaired;
    }
  }

  function prepareImages(root = document) {
    if (root instanceof HTMLImageElement) {
      root.decoding = 'async';
      if (!root.alt && /imagens\/logo\.png(?:$|\?)/.test(root.getAttribute('src') || '')) root.alt = 'UNIVAP';
      return;
    }
    root.querySelectorAll?.('img').forEach(img => {
      img.decoding = 'async';
      if (!img.alt && /imagens\/logo\.png(?:$|\?)/.test(img.getAttribute('src') || '')) img.alt = 'UNIVAP';
    });
  }

  repairTextTree(document);
  prepareImages(document);

  // Conteúdo dinâmico ainda recebe correção de texto/alt, sem animações.
  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          repairTextTree(node);
          if (node.nodeType === Node.ELEMENT_NODE) prepareImages(node);
        }
      });
    }
  });
  observer.observe(body, { childList: true, subtree: true });

  const search = document.getElementById('busca');
  if (search) {
    search.title = 'Atalho: pressione / para buscar';
    document.addEventListener('keydown', event => {
      const active = document.activeElement;
      const typing = active && ['INPUT','TEXTAREA','SELECT'].includes(active.tagName);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        search.focus();
      }
    });
  }
})();
