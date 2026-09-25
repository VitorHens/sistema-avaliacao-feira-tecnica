// Prévia somente de leitura. Nunca expõe a carga privada ou simula login real.
const express=require('express'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {carregarProjetosPrivados}=require('../src/api/database/PrivateDataset');
const data=carregarProjetosPrivados();
if(!data.projects.length) throw new Error('Prepare data/projetos-feira-2026.json antes de abrir a prévia.');
const projects=data.projects.map(p=>({id:crypto.createHash('sha256').update(p.importKey).digest('hex').slice(0,24),tema:p.tema,curso:p.curso,representante:{nome:p.representante?.nome,turma:p.representante?.turma},integrantes:p.integrantes.map(i=>({nome:i.nome,turma:i.turma})),imagens:[],tecnologias:[],links:{},statusProjeto:p.statusProjeto}));
const app=express(),root=path.resolve(__dirname,'../src/public');
app.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.get('/api/v1/projetos/publicos',(req,res)=>res.json({success:true,data:{projetos:projects}}));
app.get('/api/v1/projetos/publico/:id',(req,res)=>{const projeto=projects.find(p=>p.id===req.params.id);res.status(projeto?200:404).json({success:!!projeto,data:{projeto},message:projeto?'':'Projeto não encontrado'});});
app.get('/api/v1/avaliacoes/ranking/publico',(req,res)=>res.json({success:true,data:{ranking:[],rankingPorCurso:{}}}));
app.get('/api/v1/avaliacoes-visitantes/:id',(req,res)=>res.json({success:true,data:{total:0,media:null,minhaNota:null,demonstracao:true}}));
app.use('/api',(req,res)=>res.status(503).json({success:false,message:'Prévia de leitura. Para entrar com sua conta ou salvar, inicie o programa com MongoDB usando npm start.'}));
app.get(['/',/\.html$/],(req,res,next)=>{const file=path.resolve(root,'.'+(req.path==='/'?'/index.html':req.path));if(!file.startsWith(root+path.sep))return res.sendStatus(403);if(!fs.existsSync(file))return next();const banner='<div class="preview-banner" style="padding:12px;text-align:center;font:13px Segoe UI;background:#edf1f5;color:#101f32">PRÉVIA DO CADASTRO · '+projects.length+' projetos da planilha · Login e gravação disponíveis no servidor com MongoDB</div>';res.type('html').send(fs.readFileSync(file,'utf8').replace(/(<body[^>]*>)/,'$1'+banner));});
app.use(express.static(root));
const port=Number(process.env.PREVIEW_PORT||4182);app.listen(port,'127.0.0.1',()=>console.log(`Prévia dos ${projects.length} projetos: http://127.0.0.1:${port}/index.html`));
