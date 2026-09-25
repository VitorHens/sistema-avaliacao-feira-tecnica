const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const MeuTokenJWT = require('../src/api/http/MeuTokenJWT');
const loginRateLimit = require('../src/api/middleware/LoginRateLimit');

test('sessão assinada expira em até 12 horas e token adulterado é rejeitado', () => {
    const token = new MeuTokenJWT().gerarToken({role:'ALUNO',name:'Teste',idFuncionario:'abc'});
    const claims = jwt.decode(token);
    assert.equal(claims.exp - claims.iat, 12 * 60 * 60);
    assert.equal(claims.iss, 'feira-tecnica-2026');
    assert(new MeuTokenJWT().validarToken(token));
    assert.equal(new MeuTokenJWT().validarToken(token + 'invalid'), false);
});

test('limite de login bloqueia tentativas para a mesma conta sem bloquear outro aluno da mesma rede', () => {
    const ip = `test-${Date.now()}-${Math.random()}`;
    const response = {statusCode:200,headers:{},set(name,value){this.headers[name]=value;return this},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
    let passed = 0;
    for (let i=0;i<8;i++) loginRateLimit({ip,body:{aluno:{identificacao:'123'}}},response,()=>passed++);
    assert.equal(passed,8);
    loginRateLimit({ip,body:{aluno:{identificacao:'123'}}},response,()=>passed++);
    assert.equal(response.statusCode,429);
    loginRateLimit({ip,body:{aluno:{identificacao:'456'}}},{...response,statusCode:200},()=>passed++);
    assert.equal(passed,9);
});
