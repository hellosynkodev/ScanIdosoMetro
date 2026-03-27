import { ScannerAuto } from "./scanner";
import { Documento } from "./types";

const scanner = new ScannerAuto((doc, resultado) => {
  if (resultado.idoso && resultado.cartaoOk) {
    console.log(`✅ [APROVADO] ${doc.nome}, idade ${resultado.idade}, cartão válido.`);
  } else {
    console.log(`❌ [REJEITADO] ${doc.nome}, idade ${resultado.idade}, motivo: ${resultado.motivo}`);
  }
});

const bancoSimulado: Documento[] = [
  {
    nome: "Maria Silva",
    dataNascimento: "1950-03-01",
    cpf: "123.456.789-00",
    idosoId: "IDO123",
    validadeCartaoIdoso: "2027-12-31",
  },
  {
    nome: "João Souza",
    dataNascimento: "1968-10-15",
    cpf: "987.654.321-11",
    idosoId: "IDO456",
    validadeCartaoIdoso: "2023-12-31",
  },
  {
    nome: "Ana Pereira",
    dataNascimento: "1990-06-20",
    cpf: "111.222.333-44",
    idosoId: "IDO789",
    validadeCartaoIdoso: "2028-12-31",
  },
];

console.log("Iniciando scanner automático de fila prioritária de idosos...");

let i = 0;
const tempo = setInterval(() => {
  if (i >= bancoSimulado.length) {
    console.log("Todos os documentos processados.");
    clearInterval(tempo);
    return;
  }

  const doc = bancoSimulado[i];
  scanner.receberDocumento(doc);
  i += 1;
}, 1500);
