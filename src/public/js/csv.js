(function (root) {
    function parseCSV(text, expectedColumns) {
        text = String(text).replace(/^\uFEFF/, '');
        const header = text.split(/\r?\n/, 1)[0];
        const separator = header.includes(';') ? ';' : ',';
        const rows = [];
        let row = [], field = '', quoted = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                if (quoted && text[i + 1] === '"') { field += '"'; i++; }
                else quoted = !quoted;
            } else if (char === separator && !quoted) {
                row.push(field.trim()); field = '';
            } else if ((char === '\n' || char === '\r') && !quoted) {
                if (char === '\r' && text[i + 1] === '\n') i++;
                row.push(field.trim()); field = '';
                if (row.some(Boolean)) rows.push(row);
                row = [];
            } else field += char;
        }
        if (quoted) throw new Error('Há um campo com aspas abertas na planilha. Exporte o CSV novamente.');
        row.push(field.trim());
        if (row.some(Boolean)) rows.push(row);
        if (rows.length < 2) throw new Error('A planilha está vazia ou não contém registros.');
        const columns = rows.shift().map(value => value.trim().toLowerCase());
        const required = [
            'carimbo de data/hora',
            'endereço de e-mail',
            'tema do projeto da feira',
            'curso',
            'nome completo aluno 1 (representante da equipe)',
            'matrícula do aluno 1 - representante da equipe',
            'turma aluno 1 (representante da equipe)',
            'e-mail do aluno representante da equipe',
            'nome completo aluno 2',
            'matrícula aluno 2',
            'turma aluno 2',
            'nome completo aluno 3',
            'matrícula aluno 3',
            'turma aluno 3',
            'nome completo aluno 4',
            'matrícula aluno 4',
            'turma aluno 4',
            'nome completo aluno 5',
            'matrícula aluno 5',
            'turma aluno 5',
            'nome completo aluno 6',
            'matrícula aluno 6',
            'turma aluno 6',
            'nome completo aluno 7',
            'matrícula aluno 7',
            'turma aluno 7',
            'nome completo aluno 8',
            'matrícula aluno 8',
            'turma aluno 8',
            'nome completo aluno 9',
            'matrícula aluno 9',
            'turma aluno 9',
            'nome completo aluno 10',
            'matrícula aluno 10',
            'turma aluno 10',
            'equipamento que usará',
            'o que a equipe precisa além de mesas (bancadas) e cadeiras? (não aplicada aos 3ºs anos)',
            'observações'
        ];
        const legacy = ['tema','curso','representante_nome','representante_matricula','representante_email','representante_turma'];
        const missing = (expectedColumns || (columns.includes('tema') ? legacy : required)).filter(name => !columns.includes(name));
        if (missing.length) throw new Error(`Colunas ausentes: ${missing.join(', ')}. Use o modelo disponível nesta página.`);
        return rows.map((values, index) => {
            if (values.length !== columns.length) throw new Error(`Registro ${index + 1}: quantidade de colunas diferente do cabeçalho.`);
            return Object.fromEntries(columns.map((name, i) => [name, values[i] || '']));
        });
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { parseCSV };
    else root.FeiraCSV = { parseCSV };
})(typeof window !== 'undefined' ? window : globalThis);
