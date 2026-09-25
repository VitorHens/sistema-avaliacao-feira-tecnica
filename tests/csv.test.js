const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV } = require('../src/public/js/csv');
const header = ['tema','curso','representante_nome','representante_matricula','representante_email','representante_turma'];
test('CSV do Excel preserva acentos, aspas, vírgulas e quebras de linha', () => {
    const result = parseCSV('\uFEFF' + header.join(',') + '\r\n"Água, vida e\n\"\"ciência\"\"",QUÍMICA,Ana,001,ana@example.com,2Q');
    assert.equal(result[0].tema, 'Água, vida e\n"ciência"');
    assert.equal(result[0].representante_matricula, '001');
});
test('aceita separador ponto e vírgula', () => {
    assert.equal(parseCSV(header.join(';') + '\nHorta;INFORMÁTICA;Ana;001;ana@example.com;2INFO')[0].curso, 'INFORMÁTICA');
});
test('rejeita cabeçalhos incompletos e registros truncados antes de importar', () => {
    assert.throws(() => parseCSV('tema,curso\nHorta,INFORMÁTICA'), /Colunas ausentes/);
    assert.throws(() => parseCSV(header.join(',') + '\nHorta,INFORMÁTICA'), /quantidade de colunas/);
    assert.throws(() => parseCSV(header.join(',') + '\n"Horta'), /aspas abertas/);
});
