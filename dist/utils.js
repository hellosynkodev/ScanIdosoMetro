"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularIdade = calcularIdade;
exports.validarDocumento = validarDocumento;
function calcularIdade(dataNascimento) {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesDiff = hoje.getMonth() - nascimento.getMonth();
    const diaDiff = hoje.getDate() - nascimento.getDate();
    if (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0)) {
        idade -= 1;
    }
    if (Number.isNaN(idade) || idade < 0) {
        return 0;
    }
    return idade;
}
function validarDocumento(documento) {
    const idade = calcularIdade(documento.dataNascimento);
    const hoje = new Date();
    const validade = new Date(documento.validadeCartaoIdoso);
    const cartaoOk = !Number.isNaN(validade.getTime()) && validade >= hoje;
    const idoso = idade >= 60;
    let motivo = "Documento válido";
    if (!idoso) {
        motivo = "Não é idoso (idade < 60)";
    }
    else if (!cartaoOk) {
        motivo = "Cartão do idoso expirado";
    }
    return {
        idoso,
        idade,
        cartaoOk,
        motivo,
    };
}
