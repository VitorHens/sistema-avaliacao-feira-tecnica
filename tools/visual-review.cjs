// Prévia visual isolada. Não importa Server.js, não conecta MongoDB e não grava registros.
const express=require('express');
const fs=require('node:fs');
const path=require('node:path');
const QR=require('../src/api/utils/QrCodeGenerator');
const app=express();const root=path.resolve(__dirname,'../src/public');
const id='507f1f77bcf86cd799439011';
const project={id,tema:'Jardim conectado',curso:'INFORMÁTICA',statusProjeto:'PRONTO PARA A FEIRA',descricao:'Projeto fictício para visualizar a interface: tecnologia para acompanhar o cuidado com as plantas.',problema:'Como acompanhar as necessidades das plantas ao longo do dia?',objetivo:'Explorar o uso de sensores em um jardim experimental.',solucao:'Um protótipo que reúne leituras de umidade e apresenta as informações em uma interface simples.',diferencial:'Conectar observação, programação e cuidado com o ambiente.',tecnologias:['Arduino','Sensores','JavaScript'],representante:{nome:'Estudante demonstração',matricula:'DEMO001',email:'aluno@example.test',turma:'2INFO'},integrantes:[{nome:'Colega demonstração',matricula:'DEMO002',turma:'2INFO'}],imagens:['imagens/univap-centro.jpg'],localizacao:'Estande demonstrativo',links:{},equipamento:'EQUIPE TRAZ SEU COMPUTADOR'};
const projects=[project,{...project,id:'507f1f77bcf86cd799439012',tema:'Ciência em cada gota',curso:'QUÍMICA',imagens:[],statusProjeto:'EM DESENVOLVIMENTO'}];
const evaluation={id:'507f1f77bcf86cd799439099',projeto:projects[1],projetoId:projects[1].id,avaliador:'Professor demonstração',status:'Classificado',notaFinal:8.4,comentarios:['Registro fictício para inspeção visual.'],avaliacaoAlunos:[],criatividade:8,relevancia:8,viabilidade:8,apresentacao:8,conhecimentoTecnico:10,funcionalidade:8,sustentabilidade:8,trabalhoEquipe:10,originalidade:8,potencialMercado:8};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
app.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.get('/js/auth.js',(req,res)=>{
 const referring=new URL(req.get('referer')||'http://localhost');
 const student=['/aluno.html','/cracha-aluno.html'].includes(referring.pathname)||referring.searchParams.get('perfil')==='aluno';
 const user=student?{...project.representante,role:'ALUNO',id:'demo-aluno'}:{nome:'Professor demonstração',role:'ADMINISTRADOR',id:'demo-professor'};
 res.type('js').send(`window.SESSAO=${JSON.stringify({role:user.role,usuario:user,aluno:student?user:null,professor:student?null:user})};window.escapeHtml=${escape.toString()};window.repararTexto=v=>String(v??'');window.mostrarAlerta=(el,type,text)=>{el.className='alert show '+type;el.textContent=text};window.limparAlerta=el=>{el.className='alert';el.textContent=''};window.api=async(url,options={})=>{const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});const data=await response.json();if(!response.ok)throw new Error(data.message||'Prévia visual');return data};document.querySelectorAll('[data-usuario]').forEach(el=>el.textContent=SESSAO.usuario.nome);document.querySelectorAll('[data-sair]').forEach(el=>el.onclick=()=>location.href='login.html');`);
});
app.use('/api',async(req,res)=>{
 if(req.method!=='GET')return res.status(403).json({success:false,message:'Prévia visual: alterações não são gravadas. Execute o servidor original para usar dados reais.'});
 const route=req.path;let data;
 if(route.startsWith('/v1/avaliacoes-visitantes/')) return res.json({success:true,data:{total:0,media:null,minhaNota:null,demonstracao:true}});
 if(route.endsWith('/meu/qrcode')||route.endsWith('/buscar-matricula')){
   if(route.endsWith('/buscar-matricula')&&!['DEMO001','DEMO002'].includes(req.query.matricula))return res.status(404).json({success:false,message:'Nesta prévia, use a matrícula fictícia DEMO001.'});
   const urlPublica=`http://127.0.0.1:${Number(process.env.PREVIEW_PORT||4174)}/projeto.html?id=${id}`;
   data={projetoId:id,tema:project.tema,urlPublica,qrCode:await QR.gerar(urlPublica)};
 }else if(route.includes('/publico/')){const p=projects.find(p=>p.id===route.split('/').pop());if(!p)return res.status(404).json({success:false,message:'Projeto não encontrado.'});data={projeto:p};}
 else if(route.includes('configuracao-votacao'))data={data:'2026-10-02',periodos:[{inicio:'07:00',fim:'12:00'},{inicio:'17:00',fim:'22:30'}],exigirCodigo:false,codigosGerados:0};
 else if(route.includes('ranking')){const ranking=[{posicao:1,tema:projects[1].tema,curso:'QUÍMICA',media:8.4,avaliacoes:1,projetoId:projects[1].id}];data={ranking,rankingPorCurso:{'QUÍMICA':ranking},atualizadoEm:new Date().toISOString()};}
 else if(route.endsWith('/projetos/meu'))data={projeto:project};
 else if(route.endsWith('/projetos')||route.endsWith('/publicos'))data={projetos:projects};
 else if(route.includes('/avaliacoes'))data={avaliacoes:[evaluation],avaliacao:evaluation};
 else if(route.includes('/professores'))data={professores:[{id:'507f1f77bcf86cd799439077',nome:'Professor demonstração',email:'professor@example.test',role:'AVALIADOR'}]};
 else if(route.includes('/alunos'))data={alunos:[{...project.representante,curso:project.curso},{...project.integrantes[0],curso:project.curso,email:'colega@example.test'}]};
 else return res.status(404).json({success:false,message:'Recurso não disponível na prévia.'});
 res.json({success:true,data});
});
app.get(['/',/\.html$/],(req,res,next)=>{
 const file=path.resolve(root,'.'+(req.path==='/'?'/index.html':req.path));if(!file.startsWith(root+path.sep))return res.sendStatus(403);
 if(!fs.existsSync(file))return next();
 const banner='<div class="preview-banner" style="padding:10px 18px;background:#e9eef4;color:#101f32;font:12px/1.6 Segoe UI,sans-serif;text-align:center;position:relative;z-index:200">PRÉVIA VISUAL · Dados fictícios · Sem gravação · <a href="dashboard.html">Painel</a> · <a href="aluno.html">Aluno</a> · <a href="qrcodes.html">QR Code</a> · matrícula DEMO001</div>';
 res.type('html').send(fs.readFileSync(file,'utf8').replace(/(<body[^>]*>)/,'$1'+banner));
});
app.use(express.static(root));app.listen(Number(process.env.PREVIEW_PORT||4174),'127.0.0.1',()=>console.log(`Prévia isolada: http://127.0.0.1:${Number(process.env.PREVIEW_PORT||4174)}/login.html — dados fictícios, sem MongoDB.`));
