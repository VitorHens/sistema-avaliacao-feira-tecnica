const { escapeHtml, normalizeText, repairDeep } = PublicUtils;
const PAGE_SIZE = 24;
const comparadorTitulos = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true, ignorePunctuation: true });
let projetos = [];
let cursoSelecionado = 'TODOS';
let quantidadeVisivel = PAGE_SIZE;

function renderFiltros() {
  const cursos = ['TODOS', ...new Set(projetos.map(projeto => projeto.curso).filter(Boolean))];
  const filtros = document.getElementById('filtros');
  filtros.innerHTML = cursos.map(curso => `<button class="filtro ${cursoSelecionado === curso ? 'ativo' : ''}" aria-pressed="${cursoSelecionado === curso}" data-curso="${escapeHtml(curso)}">${curso === 'TODOS' ? 'Todos' : escapeHtml(curso)}</button>`).join('');
  filtros.querySelectorAll('[data-curso]').forEach(botao => {
    botao.onclick = () => {
      cursoSelecionado = botao.dataset.curso;
      renderFiltros();
      renderProjetos();
      document.getElementById('filtros').scrollIntoView({ block: 'center', behavior: 'instant' });
    };
  });
}

function cartaoProjeto(projeto) {
  const imagem = projeto.imagens?.[0];
  const descricao = projeto.descricao?.trim();
  const total = (projeto.representante ? 1 : 0) + (projeto.integrantes?.length || 0);
  return `<article class="card-projeto" tabindex="-1"><div class="cover">${imagem ? `<img src="${escapeHtml(imagem)}" alt="${escapeHtml(projeto.tema)}" loading="lazy" decoding="async">` : ''}<div class="cover-info"><small>${escapeHtml(projeto.curso || 'Curso')}</small><strong>${escapeHtml(projeto.tema)}</strong></div></div><div class="card-body"><div class="meta"><span class="tag">${escapeHtml(projeto.statusProjeto || 'PROJETO')}</span>${projeto.localizacao ? `<span class="tag">${escapeHtml(projeto.localizacao)}</span>` : ''}</div>${descricao ? `<p>${escapeHtml(descricao)}</p>` : ''}<div class="card-foot"><span class="team">${total} ${total === 1 ? 'integrante' : 'integrantes'}</span><a class="botao" href="projeto.html?id=${encodeURIComponent(projeto.id)}">Ver projeto <span aria-hidden="true">↗</span></a></div></div></article>`;
}

function renderProjetos(manterQuantidade = false) {
  if (!manterQuantidade) quantidadeVisivel = PAGE_SIZE;
  const busca = normalizeText(document.getElementById('busca').value);
  const filtrados = projetos.filter(projeto => {
    const curso = cursoSelecionado === 'TODOS' || projeto.curso === cursoSelecionado;
    const texto = normalizeText([projeto.tema, projeto.curso, projeto.descricao, (projeto.tecnologias || []).join(' '), projeto.representante?.nome, ...(projeto.integrantes || []).map(integrante => integrante.nome)].join(' '));
    return curso && (!busca || texto.includes(busca));
  });
  const direcao = document.getElementById('ordem').value === 'za' ? -1 : 1;
  filtrados.sort((a, b) => direcao * comparadorTitulos.compare(a.tema || '', b.tema || ''));
  const grade = document.getElementById('grade');
  if (!filtrados.length) {
    grade.innerHTML = '<div class="estado"><strong>Nenhum projeto encontrado.</strong></div>';
    return;
  }
  const exibidos = filtrados.slice(0, quantidadeVisivel);
  grade.innerHTML = exibidos.map(cartaoProjeto).join('') + (exibidos.length < filtrados.length ? `<div class="catalog-more"><p>Exibindo ${exibidos.length} de ${filtrados.length} projetos</p><button class="botao" type="button" id="moreProjects">Mostrar mais projetos ↓</button></div>` : '');
  const mostrarMais = document.getElementById('moreProjects');
  if (mostrarMais) mostrarMais.onclick = () => {
    const primeiraNovaPosicao = exibidos.length;
    quantidadeVisivel += PAGE_SIZE;
    renderProjetos(true);
    grade.querySelectorAll('.card-projeto')[primeiraNovaPosicao]?.focus();
  };
}

async function carregar() {
  const busca = document.getElementById('busca');
  busca.disabled = true;
  try {
    const resposta = await fetch('api/v1/projetos/publicos');
    const dados = repairDeep(await resposta.json());
    if (!resposta.ok || dados?.success === false) throw new Error();
    projetos = dados?.data?.projetos || [];
    document.getElementById('total').textContent = projetos.length;
    document.getElementById('cursos').textContent = new Set(projetos.map(projeto => projeto.curso).filter(Boolean)).size;
    renderFiltros();
    renderProjetos();
    busca.disabled = false;
  } catch (_) {
    document.getElementById('grade').innerHTML = '<div class="estado"><strong>Os projetos estão temporariamente indisponíveis.</strong><p>Confira a conexão com o servidor e tente novamente.</p><button class="botao" onclick="carregar()">Tentar novamente ↻</button></div>';
  }
}

const campoBusca = document.getElementById('busca');
campoBusca.addEventListener('input', () => {
  renderProjetos();
  campoBusca.scrollIntoView({ block: 'center', behavior: 'instant' });
});
document.getElementById('ordem').addEventListener('change', () => renderProjetos());
carregar();
