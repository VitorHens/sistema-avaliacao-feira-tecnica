(() => {
  const {escapeHtml,repairDeep} = PublicUtils;
  const id = new URLSearchParams(location.search).get('id');
  const main = document.getElementById('principal');
  const hero = document.getElementById('hero');
  const side = document.getElementById('lateral');
  const share = document.getElementById('shareProject');
  function safeUrl(value, image=false) { if (typeof value!=="string" || !value.trim()) return "";
    if (image && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(String(value))) return value;
    try { const url=new URL(value,location.href);return ['https:','http:'].includes(url.protocol)?url.href:''; } catch {return '';}
  }
  function render(projeto) {
    document.title=`${projeto.tema} | Feira Técnica Univap`;
    hero.innerHTML=`<span class="selo">${escapeHtml(projeto.curso||'FEIRA TÉCNICA')} · ${escapeHtml(projeto.statusProjeto||'PROJETO')}</span><h1>${escapeHtml(projeto.tema)}</h1><p>${escapeHtml(projeto.descricao||'Conheça a proposta desta equipe do Colégio Univap Centro.')}</p>`;
    const sections=[['problema','01 / O ponto de partida','Problema que queremos resolver'],['objetivo','02 / A pergunta','Nosso objetivo'],['solucao','03 / A descoberta','Nossa solução'],['diferencial','04 / O próximo passo','O que torna a ideia diferente']];
    main.innerHTML=sections.filter(([key])=>projeto[key]).map(([key,kicker,title])=>`<article class="block" id="${key}"><span class="eyebrow">${kicker}</span><h2>${title}</h2><p>${escapeHtml(projeto[key])}</p></article>`).join('') || '<article class="block"><h2>A história está ganhando forma.</h2><p>A equipe ainda está preparando os detalhes desta apresentação. Conheça os integrantes e encontre o estande ao lado.</p></article>';
    const images=(projeto.imagens||[]).map(img=>safeUrl(img,true)).filter(Boolean);
    if(images.length)main.insertAdjacentHTML('beforeend',`<article class="block"><span class="eyebrow">DA IDEIA À PRÁTICA</span><h2>Veja de perto</h2><p>Toque em uma foto para ampliar.</p><div class="gallery">${images.map((url,i)=>`<img src="${escapeHtml(url)}" loading="lazy" alt="${escapeHtml(projeto.tema)} — foto ${i+1}">`).join('')}</div></article>`);
    const people=[projeto.representante,...(projeto.integrantes||[])].filter(Boolean);
    const links=Object.entries(projeto.links||{}).map(([key,value])=>[key,safeUrl(value)]).filter(([,url])=>url);
    side.innerHTML=`<div class="highlight"><strong>Encontre esta ideia na feira</strong><span>${escapeHtml(projeto.localizacao||'Local do estande ainda não informado.')}</span></div><article class="block"><span class="eyebrow">QUEM FAZ ACONTECER</span><h2>A equipe</h2><div class="people">${people.map((person,i)=>`<div class="person"><strong>${escapeHtml(person.nome)}</strong><span>${i===0?'Representante':'Integrante'} · ${escapeHtml(person.turma||'')}</span></div>`).join('')}</div></article>${(projeto.tecnologias||[]).length?`<article class="block"><h3>Tecnologias e materiais</h3><div class="tags">${projeto.tecnologias.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div></article>`:''}${links.length?`<article class="block"><h3>Continue explorando</h3><div class="link-list">${links.map(([key,url])=>`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${key==='github'?'GitHub':key==='video'?'Vídeo':'Site do projeto'} ↗</a>`).join('')}</div></article>`:''}`;
    window.mountVisitorRating(id, main);
    if(share)share.hidden=false;
  }
  async function load() {
    main.setAttribute('aria-busy','true');
    try {
      if(!id||!/^[a-f\d]{24}$/i.test(id))throw new Error('Este link não contém um identificador válido. Escaneie novamente o QR Code do estande.');
      const response=await fetch(`api/v1/projetos/publico/${encodeURIComponent(id)}`);
      const data=repairDeep(await response.json());
      if(!response.ok||!data?.success||!data.data?.projeto)throw new Error(data?.error?.message||data?.message||'O projeto não está disponível agora.');
      render(data.data.projeto);
    } catch(error) {
      hero.innerHTML='<span class="selo">FEIRA TÉCNICA · UNIVAP CENTRO</span><h1>Vamos encontrar<br>essa ideia.</h1>';
      main.innerHTML=`<article class="block"><h2>Não foi possível abrir o projeto</h2><p>${escapeHtml(error.message)}</p><div class="public-tools"><button class="btn" id="retryProject" type="button">Tentar novamente</button><a class="btn ghost" href="index.html#conteudo">Explorar projetos</a></div></article>`;
      side.innerHTML='';document.getElementById('retryProject').onclick=load;
    } finally {main.setAttribute('aria-busy','false');}
  }
  share?.addEventListener('click',async()=> {
    const status=document.getElementById('shareStatus');
    try {if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);status.textContent='Link copiado.';}}catch(error){if(error.name!=='AbortError')status.textContent='Copie o endereço do projeto na barra do navegador.';}
  });
  load();
})();
