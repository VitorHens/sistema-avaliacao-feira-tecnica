(() => {
    if (!window.SESSAO) return;
    const form = document.getElementById('buscarQr');
    const result = document.getElementById('resultadoQr');
    const alertBox = document.getElementById('alerta');
    const printButton = document.getElementById('imprimirQr');
    const feedback = document.getElementById('qrFeedback');
    const admin = SESSAO.role === 'ADMINISTRADOR';
    let publicUrl = '';
    let loading = false;
    form.hidden = !admin;
    document.getElementById('qrDescricao').textContent = admin
        ? 'Localize a equipe pela matrícula e gere o acesso direto ao projeto.'
        : 'Baixe o QR Code ou imprima a placa para apresentar seu projeto.';
    if (!admin) document.querySelector('.top-actions a').href = 'aluno.html';

    async function carregarQr() {
        if (loading) return;
        loading = true;
        limparAlerta(alertBox);
        result.hidden = true;
        publicUrl = '';
        feedback.textContent = 'Preparando o QR Code do projeto...';
        printButton.disabled = true;
        const button = form.querySelector('button');
        button.disabled = true;
        button.textContent = 'Buscando...';
        form.setAttribute('aria-busy','true');
        try {
            const endpoint = admin
                ? `/api/v1/projetos/buscar-matricula?matricula=${encodeURIComponent(form.elements.matricula.value.trim())}`
                : '/api/v1/projetos/meu/qrcode';
            const { data } = await api(endpoint);
            const url = new URL(data.urlPublica);
            if (!['http:', 'https:'].includes(url.protocol) || url.searchParams.get('id') !== String(data.projetoId) || !url.pathname.endsWith('/projeto.html')) {
                throw new Error('O endereço recebido não corresponde ao projeto. Tente gerar o código novamente.');
            }
            document.querySelectorAll('[data-qr-tema]').forEach(el => el.textContent = data.tema);
            await Promise.all([...document.querySelectorAll('[data-qr-imagem]')].map(img => new Promise((resolve, reject) => {
                img.onload = () => {img.onload=null;img.onerror=null;resolve();};
                img.onerror = () => reject(new Error('Não foi possível carregar a imagem do QR Code.'));
                img.src = data.qrCode;
            })));
            publicUrl = url.href;
            document.getElementById('baixarImagem').href = data.qrCode;
            document.getElementById('baixarImagem').download = `qrcode-projeto-${data.projetoId}.png`;
            document.getElementById('abrirProjeto').href = publicUrl;
            document.getElementById('enderecoQr').textContent = publicUrl;
            result.hidden = false;
            printButton.disabled = false;
            feedback.textContent = 'QR Code pronto. O link abre este projeto diretamente, sem login.';
            document.getElementById('retryQr').hidden = true;
        } catch (error) {
            mostrarAlerta(alertBox, 'error', error.message);
            feedback.textContent = '';
            document.getElementById('retryQr').hidden = false;
        } finally {
            loading = false;
            button.disabled = false;
            button.textContent = 'Gerar QR do projeto';
            form.setAttribute('aria-busy','false');
        }
    }
    form.addEventListener('submit', event => { event.preventDefault(); carregarQr(); });
    document.getElementById('retryQr').addEventListener('click',carregarQr);
    document.getElementById('copiarLinkQr').addEventListener('click', async () => {
        if (!publicUrl) return;
        try { await navigator.clipboard.writeText(publicUrl); feedback.textContent = 'Link do projeto copiado.'; }
        catch { feedback.textContent = 'Selecione e copie o endereço exibido abaixo dos botões.'; }
    });
    printButton.addEventListener('click', () => { if (publicUrl) window.print(); });
    if (!admin && SESSAO.role === 'ALUNO') carregarQr();
})();
