# Implantação

## Lista de verificação

1. Instale Node.js 20 ou superior e MongoDB.
2. Execute `npm ci`.
3. Configure as variáveis do ambiente.
4. Defina `NODE_ENV=production`.
5. Use segredos longos e persistentes para JWT e códigos de visitantes.
6. Defina `PUBLIC_BASE_URL` com HTTPS e o prefixo correto.
7. Coloque o arquivo privado de projetos em `data/`.
8. Execute `npm test` e `node tools/check-frontend.cjs`.
9. Teste login, avaliação, votação, ranking, crachá e QR Code em computador e celular.
10. Faça e restaure um backup de teste do MongoDB.

## Nginx

O arquivo `nginx/conf/nginx.conf` contém um exemplo mínimo para encaminhar `/feira/` ao Node.js. Adapte domínio, certificado e caminho conforme o servidor da escola.

Se houver proxy reverso, defina `TRUST_PROXY_HOPS` com o número real de saltos. Não use valores maiores que o necessário.

## Operação

- execute o Node com um gerenciador de processos;
- mantenha o MongoDB restrito à rede necessária;
- não exponha o diretório `data/` como conteúdo estático;
- acompanhe os logs sem registrar senhas ou tokens;
- crie backups antes da feira e após o encerramento;
- preserve os arquivos de segredo ao reiniciar ou mover a instalação.
