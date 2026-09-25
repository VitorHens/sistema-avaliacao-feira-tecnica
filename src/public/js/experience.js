/* Melhorias progressivas: não substitui a autenticação nem os envios das telas. */
(() => {
  'use strict';
  const page = location.pathname.split('/').pop();
  let fieldId = 0;
  // Associa também os rótulos dos formulários antigos aos campos existentes.
  function accessibleFields(root = document) {
    root.querySelectorAll('.field,.student-field').forEach(field => {
      const label = field.querySelector('label');
      const input = field.querySelector('input,textarea,select');
      if (label && input && !input.id) input.id = 'campo-acessivel-' + (++fieldId);
      if (label && input?.id && !label.htmlFor) label.htmlFor = input.id;
    });
    root.querySelectorAll('table th').forEach(th => { if (!th.hasAttribute('scope')) th.scope = 'col'; });
    root.querySelectorAll('.table-wrap').forEach(wrap => { wrap.tabIndex = 0; wrap.setAttribute('role','region'); wrap.setAttribute('aria-label','Tabela de registros. Role horizontalmente para ver todas as colunas.'); });
  }
  accessibleFields();
  document.querySelectorAll('.alert').forEach(alert => { alert.setAttribute('role','status'); alert.setAttribute('aria-live','polite'); });
  const dynamicRoot = document.querySelector('main');
  if (dynamicRoot) new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) accessibleFields(node);
  }).observe(dynamicRoot, {childList:true,subtree:true});

  const blocks = [...document.querySelectorAll('.project-editor .editor-block')];
  if (blocks.length) {
    const nav = document.createElement('nav'); nav.className='section-jumps'; nav.setAttribute('aria-label','Etapas da apresentação');
    blocks.forEach((block,index)=> { block.id ||= `editor-etapa-${index+1}`; const a=document.createElement('a'); a.href='#'+block.id; a.textContent=block.querySelector('h3').textContent; nav.append(a); });
    document.querySelector('.project-editor .official-note').after(nav);
  }
  const tabs=[...document.querySelectorAll('.role-tab')];
  tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=> {
    let next;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=tabs.length-1;
    if(next===undefined)return;
    event.preventDefault(); tabs[next].click(); tabs[next].focus();
  }));

  // Busca local nas consultas de pessoas, sem alterar os dados carregados.
  if(['alunos-consulta.html','professores-consulta.html'].includes(page)) {
    const target=document.querySelector(page.startsWith('alunos')?'#lista':'.table-wrap');
    if(target){
      const toolbar=document.createElement('div');toolbar.className='directory-toolbar';
      toolbar.innerHTML='<div class="field"><label for="directorySearch">Encontrar uma pessoa</label><input id="directorySearch" type="search" placeholder="Nome, e-mail, matrícula ou função..."></div><button class="btn ghost" type="button">Limpar busca</button><small role="status" aria-live="polite"></small>';
      target.before(toolbar);
      const empty=document.createElement('p');empty.className='filter-empty';empty.textContent='Nenhuma pessoa corresponde à busca.';empty.hidden=true;target.after(empty);
      const input=toolbar.querySelector('input'),count=toolbar.querySelector('small');
      const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const filter=()=> {const items=[...target.querySelectorAll(page.startsWith('alunos')?'.list-item':'tbody tr')];let visible=0;const q=normalize(input.value.trim());items.forEach(item=>{item.hidden=!normalize(item.textContent).includes(q);if(!item.hidden)visible++;});count.textContent=items.length?`${visible} de ${items.length} registros`:'';empty.hidden=!items.length||visible>0;};
      input.addEventListener('input',filter);toolbar.querySelector('button').addEventListener('click',()=>{input.value='';filter();input.focus();});
      new MutationObserver(filter).observe(target,{childList:true,subtree:true});filter();
    }
  }
  // Galeria ampliada com diálogo nativo, Escape e devolução de foco.
  let viewer;
  function prepareGallery(){
    document.querySelectorAll('.gallery img').forEach((img,index)=> {
      if(img.closest('button'))return;
      const button=document.createElement('button');button.type='button';button.className='gallery-button';button.setAttribute('aria-label',`Ampliar foto ${index+1} do projeto`);
      img.before(button);button.append(img);
      button.addEventListener('click',()=> {
        if(!viewer){viewer=document.createElement('dialog');viewer.className='image-viewer';viewer.setAttribute('aria-label','Foto ampliada do projeto');viewer.innerHTML='<button type="button">Fechar foto ×</button><img alt="">';document.body.append(viewer);viewer.querySelector('button').onclick=()=>viewer.close();viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});}
        viewer.querySelector('img').src=img.src;viewer.querySelector('img').alt=img.alt;viewer.showModal();
      });
    });
  }
  if(page==='projeto.html'){prepareGallery();new MutationObserver(prepareGallery).observe(document.getElementById('principal'),{childList:true,subtree:true});}
})();
