(() => {
    const role = window.SESSAO?.role;
    const nav = document.querySelector('.sidebar .nav-list');
    if (!nav || !role) return;
    const icons = {
        home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
        projects: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        rate: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
        history: '<path d="M8 3h11v18H5V6m3-3v4h7M9 12h6m-6 4h6"/>',
        chart: '<path d="M4 20V10m8 10V4m8 16v-7"/>',
        import: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
        users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5"/>',
        badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 3v3h6V3M8 17h8"/><circle cx="12" cy="12" r="2"/>',
        qr: '<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6z"/>',
        public: '<path d="M15 3h6v6m0-6-11 11M11 3H3v18h18v-8"/>'
    };
    const student = [
        ['aluno.html','Meu projeto','projects'], ['cracha-aluno.html','Meu crachá','badge'],
        ['qrcodes.html','QR Code e estande','qr'], ['index.html','Vitrine de projetos','public'], ['ranking.html','Ranking da banca','chart'], ['ranking-visitantes.html','Ranking dos visitantes','chart']
    ];
    const staff = [
        ['dashboard.html','Visão geral','home'], ['projetos-consulta.html','Projetos','projects'],
        ['avaliacoes-cadastro.html','Avaliar projeto','rate'], ['avaliacoes-consulta.html','Avaliações','history'],
        ['ranking.html','Ranking da banca','chart'], ['ranking-visitantes.html','Ranking dos visitantes','chart']
    ];
    if (role === 'ADMINISTRADOR') staff.push(
        ['receberExcel.html','Importar planilha','import'], ['qrcodes.html','QR Code e estande','qr'],
        ['professores-consulta.html','Professores','users'], ['alunos-consulta.html','Acessos dos alunos','badge'],
        ['configuracoes-votacao.html','Votação do público','chart']
    );
    let current = location.pathname.split('/').pop();
    if (current === 'professores-novo.html') current = 'professores-consulta.html';
    if (current === 'professores-importar.html') current = 'professores-consulta.html';
    if (/^(professores|alunos|projetos)-(cadastro|editar)\.html$/.test(current)) current = current.replace(/-(cadastro|editar)/, '-consulta');
    if (current === 'avaliacoes-editar.html') current = 'avaliacoes-consulta.html';
    nav.setAttribute('aria-label', 'Navegação principal');
    nav.innerHTML = (role === 'ALUNO' ? student : staff).map(([href,label,icon]) =>
        `<a class="nav-link${href === current ? ' active' : ''}" href="${href}" ${href === current ? 'aria-current="page"' : ''}><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[icon]}</svg></span>${label}</a>`
    ).join('');
})();
