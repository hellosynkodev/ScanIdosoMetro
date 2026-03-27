"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScannerAuto = void 0;
const utils_1 = require("./utils");
class ScannerAuto {
    constructor(callback) {
        this.callback = callback;
        this.fila = [];
    }
    receberDocumento(doc) {
        // Simula leitura de documento sem foto, OCR já retornou os dados
        this.fila.push(doc);
        console.log(`Documento recebido: ${doc.nome} (${doc.cpf})`);
        this.processar();
    }
    processar() {
        while (this.fila.length > 0) {
            const doc = this.fila.shift();
            if (!doc)
                continue;
            const resultado = (0, utils_1.validarDocumento)(doc);
            this.callback(doc, resultado);
        }
    }
}
exports.ScannerAuto = ScannerAuto;
