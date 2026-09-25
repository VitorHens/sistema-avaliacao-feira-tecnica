const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const seedDatabase = require('../src/api/database/SeedDatabase');
const importer = require('../src/api/database/ImportarCadastros');

test('cria administrador e migra ID de professor antigo sem sobrescrever senha pessoal', async () => {
    const prior = {email:process.env.BOOTSTRAP_ADMIN_EMAIL,password:process.env.BOOTSTRAP_ADMIN_PASSWORD,nodeEnv:process.env.NODE_ENV,accessFile:process.env.INITIAL_ACCESS_FILE,testProfessor:process.env.ENABLE_TEST_PROFESSOR};
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feira-acessos-'));
    const accessFile = path.join(tempDir, 'acessos.json');
    const originalImport = importer.carregarCadastros;
    const docs = [
        {_id:1,email:'admin@feira.com',role:'ADMINISTRADOR',senha:await bcrypt.hash('Admin@2026',10)},
        {_id:2,email:'avaliador@feira.com',role:'AVALIADOR',senha:await bcrypt.hash('Avaliador@2026',10)},
        {_id:3,email:'antigo@example.test',role:'AVALIADOR',nome:'Professor Antigo',senha:await bcrypt.hash('SenhaAntiga@123',10)},
    ];
    const professores = {
        createIndex:async()=>{},
        listIndexes:()=>({toArray:async()=>[]}),
        findOne:async query=>docs.find(doc=>Object.entries(query).every(([key,value])=>String(doc[key])===String(value)))||null,
        deleteOne:async query=>{const index=docs.findIndex(doc=>doc._id===query._id&&doc.senha===query.senha);if(index>=0)docs.splice(index,1)},
        insertOne:async doc=>{const insertedId=doc._id||docs.length+3;docs.push({...doc,_id:insertedId});return {insertedId}},
        find:query=>({toArray:async()=>docs.filter(doc=>doc.role===query.role)}),
        updateOne:async(query,update)=>{const doc=docs.find(item=>String(item._id)===String(query._id));if(doc)Object.assign(doc,update.$set);return {matchedCount:doc?1:0}},
    };
    const alunos = {listIndexes:()=>({toArray:async()=>[]}),createIndex:async()=>{},findOne:async()=>null,deleteOne:async()=>{}};
    const projectDocs = [];
    const projetos = {
        createIndex:async()=>{},
        findOne:async query=>projectDocs.find(doc=>doc.importKey===query.importKey)||null,
        updateOne:async (_query,update)=>{projectDocs.push({...update.$setOnInsert,_id:projectDocs.length+1});return {upsertedCount:1}},
    };
    const db = {getCollection:async name=>name==='professores'?professores:name==='projetos'?projetos:alunos};
    try {
        importer.carregarCadastros=async()=>true;
        process.env.BOOTSTRAP_ADMIN_EMAIL='docente@example.test';
        process.env.BOOTSTRAP_ADMIN_PASSWORD='Senha-Forte-2026!';
        process.env.NODE_ENV='test';
        process.env.INITIAL_ACCESS_FILE=accessFile;
        const semCargaPrivada = {
            importarProjetos: async () => ({ criados: 0, atualizados: 0, existentes: 0 }),
            importarAlunos: async () => ({ contasCriadas: 0, vinculosCriados: 0, pendencias: [] }),
        };
        await seedDatabase(db, semCargaPrivada);
        assert.deepEqual(docs.map(doc=>doc.email),['antigo@example.test','docente@example.test']);
        const antigo=docs.find(doc=>doc.email==='antigo@example.test');
        const admin=docs.find(doc=>doc.email==='docente@example.test');
        assert.equal(antigo.identificador,'3');
        assert(await bcrypt.compare('univap',antigo.senha));
        assert(await bcrypt.compare('Senha-Forte-2026!',admin.senha));
        assert.equal(fs.existsSync(accessFile),false);
        assert.equal(projectDocs.length,0);
        process.env.ENABLE_TEST_PROFESSOR='true';
        await seedDatabase(db, semCargaPrivada);
        const teste=docs.find(doc=>doc.email==='professor-teste@feira.local');
        const adminTeste=docs.find(doc=>doc.email==='admin-teste@feira.local');
        assert.equal(teste._id.toString(),'68d5d3c0a0b1c2d3e4f5a601');
        assert.equal(teste.identificador,'900000000001');
        assert.equal(adminTeste._id.toString(),'68d5d3c0a0b1c2d3e4f5a602');
        assert(await bcrypt.compare('univap',teste.senha));
        assert(await bcrypt.compare('Univap@2026!',adminTeste.senha));
        assert.equal(teste.contaTeste,true);
        assert.equal(adminTeste.contaTeste,true);
        adminTeste.senha=await bcrypt.hash('OutraSenha@2026',4);
        antigo.senha=await bcrypt.hash('SenhaPessoal!2026',4);
        antigo.senhaPolitica='pessoal-v1';
        antigo.senhaInicialUnivap=false;
        await seedDatabase(db, semCargaPrivada);
        assert(await bcrypt.compare('SenhaPessoal!2026',antigo.senha));
        assert.equal(antigo.senhaInicialUnivap,false);
        assert.equal(antigo.identificador,'3');
        assert(await bcrypt.compare('Univap@2026!',adminTeste.senha));
        docs.splice(docs.indexOf(admin),1);
        delete process.env.BOOTSTRAP_ADMIN_EMAIL;
        delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
        delete process.env.ENABLE_TEST_PROFESSOR;
        await seedDatabase(db, semCargaPrivada);
        assert(docs.some(doc=>doc.email==='admin-inicial@feira.local' && !doc.contaTeste));
    } finally {
        importer.carregarCadastros=originalImport;
        for(const [name,value] of Object.entries({BOOTSTRAP_ADMIN_EMAIL:prior.email,BOOTSTRAP_ADMIN_PASSWORD:prior.password,NODE_ENV:prior.nodeEnv,INITIAL_ACCESS_FILE:prior.accessFile,ENABLE_TEST_PROFESSOR:prior.testProfessor})) {
            if(value===undefined)delete process.env[name];else process.env[name]=value;
        }
        fs.rmSync(tempDir,{recursive:true,force:true});
    }
});
