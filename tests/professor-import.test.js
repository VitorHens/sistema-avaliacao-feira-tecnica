const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { prepararLinhas, gerarCsvResultado } = require('../src/public/js/professor-import');
const { parseCSV } = require('../src/public/js/csv');

test('modelo usa ID e nome informados sem exigir e-mail, senha ou função', () => {
    const modelo = fs.readFileSync(path.join(__dirname, '../src/public/modelo-professores.csv'), 'utf8');
    assert.equal(modelo.trim(), 'ID;Nome');
    const linhas = prepararLinhas(modelo + '001234;Ana Silva\n000002;Bruno Costa\n');
    assert.equal(linhas.length, 2);
    assert.deepEqual(linhas[0].professor, { identificador: '001234', nome: 'Ana Silva', role: 'AVALIADOR' });
    assert.equal(linhas[1].erro, '');
});

test('colunas opcionais aceitam e-mail e exigem senha forte para administrador', () => {
    const linhas = prepararLinhas('ID;Nome;Email;Senha;Funcao\n001;Professora Ana;ana@example.test;;AVALIADOR\n101;Administrador Um;admin@example.test;Senha@2026!;ADMINISTRADOR\n102;Administrador Dois;outro@example.test;;ADMINISTRADOR\n');
    assert.equal(linhas[0].professor.senha, undefined);
    assert.equal(linhas[1].professor.senha, 'Senha@2026!');
    assert.match(linhas[2].erro, /senha de administrador inválida/);
});

test('linhas inválidas são separadas e resultado preserva IDs sem fórmulas executáveis', () => {
    const linhas = prepararLinhas('ID;Nome\n001;Ana Silva\n001;Outra Pessoa\n002;Bo\nP-02;Bruno Costa\n');
    assert.equal(linhas[0].erro, '');
    assert.match(linhas[1].erro, /repetido/);
    assert.match(linhas[2].erro, /3 caracteres/);
    assert.match(linhas[3].erro, /apenas números/);
    const corrigidas = prepararLinhas('ID;Nome\n002;Bo\n002;Bruno Costa\n');
    assert.match(corrigidas[0].erro, /3 caracteres/);
    assert.equal(corrigidas[1].erro, '');
    assert.throws(() => prepararLinhas('Nome;Email\nAna Silva;ana@example.test\n'), /Colunas ausentes: id/);
    const resultado = gerarCsvResultado([{ numero: 2, nome: '=HYPERLINK("x")', email: 'ana@example.test', role: 'AVALIADOR', id: '000001', resultado: 'Cadastrado' }]);
    const parsed = parseCSV(resultado, ['linha', 'nome', 'email', 'funcao', 'id', 'resultado']);
    assert.equal(parsed[0].nome, "'=HYPERLINK(\"x\")");
    assert.equal(parsed[0].id, '000001');
});
