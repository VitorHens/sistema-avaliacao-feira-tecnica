(function () {
    const STORAGE_KEYS = ["tokenJWT", "userData", "perfilUsuario"];
    const token = localStorage.getItem("tokenJWT");
    const userData = parseJson(localStorage.getItem("userData"));
    const professor = userData?.data?.professor || null;
    const aluno = userData?.data?.aluno || null;
    const usuario = professor || aluno;

    if (!token || !usuario) {
        limparSessaoLocal();
        window.location.replace("login.html");
        return;
    }

    window.SESSAO = {
        token,
        usuario,
        professor,
        aluno,
        role: usuario.role || (aluno ? "ALUNO" : "AVALIADOR"),
    };

    window.sair = async function sair() {
        try {
            await fetch("api/v1/sessao/logout", { method: "POST" });
        } catch (_) {
            // A sessão local ainda precisa ser encerrada mesmo sem resposta do servidor.
        }
        limparSessaoLocal();
        window.location.replace("login.html");
    };

    window.api = async function api(url, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("tokenJWT") || token}`,
            ...(options.headers || {}),
        };

        const response = await fetch(url.replace(/^\/api\//, "api/"), { ...options, headers });
        const refreshedToken = response.headers.get("authorization");
        if (refreshedToken) {
            localStorage.setItem(
                "tokenJWT",
                refreshedToken.replace(/^Bearer\s+/i, "")
            );
        }

        const rawData = await response.json().catch(() => null);
        const data = repararObjeto(rawData);
        if (response.status === 401) {
            alert("Sua sessão expirou. Entre novamente.");
            await window.sair();
            throw new Error("Não autorizado");
        }

        if (!response.ok || data?.success === false) {
            throw new Error(
                data?.error?.message ||
                data?.error?.details?.message ||
                data?.message ||
                `Erro HTTP ${response.status}`
            );
        }

        return data;
    };

    window.mostrarAlerta = function mostrarAlerta(element, type, text) {
        if (!element) return;
        element.className = `alert show ${type}`;
        element.textContent = text;
    };

    window.limparAlerta = function limparAlerta(element) {
        if (!element) return;
        element.className = "alert";
        element.textContent = "";
    };


    window.repararTexto = function repararTexto(value) {
        let text = String(value ?? "");

        // Corrige sequências clássicas de UTF-8 lidas como Latin-1/Windows-1252.
        if (/[ÃÂ]/.test(text)) {
            try {
                const bytes = Uint8Array.from([...text].map(char => char.charCodeAt(0) & 0xff));
                const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
                if (decoded && !decoded.includes("�")) text = decoded;
            } catch (_) {}
        }

        // Registros antigos que já perderam o byte original não são reversíveis;
        // estas substituições cobrem os termos mais comuns do sistema.
        const repairs = [
            [/T�cnica/g,"Técnica"],[/t�cnica/g,"técnica"],
            [/T�cnico/g,"Técnico"],[/t�cnico/g,"técnico"],
            [/Inform�tica/g,"Informática"],[/inform�tica/g,"informática"],
            [/Jo�o/g,"João"],[/jo�o/g,"joão"],
            [/El�trica/g,"Elétrica"],[/el�trica/g,"elétrica"],
            [/Matr�cula/g,"Matrícula"],[/matr�cula/g,"matrícula"],
            [/Avalia��o/g,"Avaliação"],[/avalia��o/g,"avaliação"],
            [/Apresenta��o/g,"Apresentação"],[/apresenta��o/g,"apresentação"],
            [/Solu��o/g,"Solução"],[/solu��o/g,"solução"],
            [/Informa��o/g,"Informação"],[/informa��o/g,"informação"],
            [/Educa��o/g,"Educação"],[/educa��o/g,"educação"],
            [/Configura��o/g,"Configuração"],[/configura��o/g,"configuração"]
        ];
        for (const [pattern,replacement] of repairs) text = text.replace(pattern,replacement);
        return text;
    };

    window.escapeHtml = function escapeHtml(value) {
        return window.repararTexto(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    window.normalizarTexto = function normalizarTexto(value) {
        return window.repararTexto(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("[data-professor], [data-usuario]").forEach(element => {
            element.textContent = window.repararTexto(usuario.nome || usuario.email || "Usuário");
        });

        document.querySelectorAll("[data-sair]").forEach(element => {
            element.addEventListener("click", window.sair);
        });

        adicionarNavegacaoMobile();
    });

    function repararObjeto(value) {
        if (typeof value === "string") {
            return /[�ÃÂ]/.test(value) ? window.repararTexto(value) : value;
        }
        if (Array.isArray(value)) return value.map(repararObjeto);
        if (value && typeof value === "object") {
            for (const key of Object.keys(value)) value[key] = repararObjeto(value[key]);
        }
        return value;
    }

    function parseJson(value) {
        try {
            return value ? JSON.parse(value) : null;
        } catch (_) {
            return null;
        }
    }

    function limparSessaoLocal() {
        STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    }

    function adicionarNavegacaoMobile() {
        if (document.querySelector(".mobile-nav")) return;

        const items = window.SESSAO.role === "ALUNO"
            ? [
                ["aluno.html", "◇", "Projeto"],
                ["cracha-aluno.html", "▣", "Crachá"],
                ["index.html", "↗", "Vitrine"],
                ["ranking.html", "★", "Ranking"],
            ]
            : [
                ["dashboard.html", "⌂", "Painel"],
                ["projetos-consulta.html", "◇", "Projetos"],
                ["avaliacoes-cadastro.html", "★", "Avaliar"],
                ["ranking.html", "↗", "Ranking"],
            ];

        const currentPage = location.pathname.split("/").pop() || "dashboard.html";
        const nav = document.createElement("nav");
        nav.className = "mobile-nav";
        nav.setAttribute("aria-label", "Navegação rápida");
        nav.style.gridTemplateColumns = `repeat(${items.length}, 1fr)`;
        nav.innerHTML = items.map(([href, icon, label]) => {
            const page = href.split("#")[0];
            const active = page === currentPage ? "active" : "";
            return `<a class="${active}" href="${href}"><strong>${icon}</strong><span>${label}</span></a>`;
        }).join("");
        document.body.appendChild(nav);
    }
})();
