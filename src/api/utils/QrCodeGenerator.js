const QRCode = require('qrcode');

module.exports = class QrCodeGenerator {
    static gerar = async (url) => {
        if (!url || typeof url !== 'string') {
            throw new Error('URL é obrigatória para gerar o QR Code.');
        }

        return QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 300,
        });
    };
};
