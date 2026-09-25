(function (root) {
  const csv = typeof module !== 'undefined' && module.exports ? require('./csv.js') : root.FeiraCSV;

  function prepararLinhas(texto) {
    const linhas = csv.parseCSV(texto, ['id', 'nome']);
    const idsVistos = new Set();
    const emailsVistos = new Set();
    return linhas.map((linha, index) => {
      const numero = index + 2;
      const identificador = (linha.id || '').trim();
      const nome = (linha.nome || '').trim();
      const email = (linha.email || '').trim().toLowerCase();
      const role = (linha.funcao || 'AVALIADOR').trim().toUpperCase();
      const senha = linha.senha || '';
      let erro = '';
      if (!/^\d{1,64}$/.test(identificador)) erro = 'ID inválido: informe apenas números, com até 64 dígitos.';
      else if (idsVistos.has(identificador)) erro = 'ID repetido na planilha.';
      else if (nome.length < 3) erro = 'nome deve ter pelo menos 3 caracteres.';
      else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erro = 'e-mail inválido.';
      else if (email && emailsVistos.has(email)) erro = 'e-mail repetido na planilha.';
      else if (!['AVALIADOR', 'ADMINISTRADOR'].includes(role)) erro = 'Função deve ser AVALIADOR ou ADMINISTRADOR.';
      else if (role === 'ADMINISTRADOR' && !email) erro = 'e-mail do administrador é obrigatório.';
      else if (role === 'ADMINISTRADOR' && !senhaForte(senha)) erro = 'senha de administrador inválida: use 8+ caracteres, maiúscula, minúscula, número e símbolo.';
      if (!erro) { idsVistos.add(identificador); if (email) emailsVistos.add(email); }
      return {
        numero,
        identificador,
        nome,
        email,
        role,
        erro,
        professor: erro ? null : { identificador, nome, ...(email ? { email } : {}), role, ...(role === 'ADMINISTRADOR' ? { senha } : {}) },
      };
    });
  }

  function senhaForte(senha) {
    return senha.length >= 8 && new TextEncoder().encode(senha).length <= 72 &&
      /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /[0-9]/.test(senha) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(senha);
  }

  function gerarCsvResultado(resultados) {
    const campo = valor => {
      let texto = String(valor ?? '');
      if (/^\s*[=+\-@]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replaceAll('"', '""') + '"';
    };
    const linhas = [['Linha', 'Nome', 'Email', 'Funcao', 'ID', 'Resultado'],
      ...resultados.map(item => [item.numero, item.nome, item.email, item.role, item.id || '', item.resultado])];
    return '\uFEFF' + linhas.map(linha => linha.map(campo).join(';')).join('\r\n') + '\r\n';
  }

  const api = { prepararLinhas, gerarCsvResultado };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FeiraProfessoresImport = api;
})(typeof window !== 'undefined' ? window : globalThis);
