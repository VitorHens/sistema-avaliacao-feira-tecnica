(function () {
    function repairText(value) {
        let text = String(value ?? "");

        if (/[ÃÂ]/.test(text)) {
            try {
                const bytes = Uint8Array.from([...text].map(char => char.charCodeAt(0) & 0xff));
                const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
                if (decoded && !decoded.includes("�")) text = decoded;
            } catch (_) {}
        }

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
            [/Educa��o/g,"Educação"],[/educa��o/g,"educação"]
        ];
        for (const [pattern,replacement] of repairs) text = text.replace(pattern,replacement);
        return text;
    }

    function repairDeep(value) {
        if (typeof value === "string") return /[�ÃÂ]/.test(value) ? repairText(value) : value;
        if (Array.isArray(value)) return value.map(repairDeep);
        if (value && typeof value === "object") {
            for (const key of Object.keys(value)) value[key] = repairDeep(value[key]);
        }
        return value;
    }

    window.PublicUtils = {
        repairText,
        repairDeep,

        escapeHtml(value) {
            return repairText(value)
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        },

        normalizeText(value) {
            return repairText(value)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
        },

        formatScore(value) {
            return Number(value || 0).toFixed(2).replace(".", ",");
        },
    };
})();
