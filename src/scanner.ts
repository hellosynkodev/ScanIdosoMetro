import { Documento, ResultadoValidacao } from "./types";
import { validarDocumento } from "./utils";

export class ScannerAuto {
  private fila: Documento[] = [];

  constructor(private callback: (doc: Documento, resultado: ResultadoValidacao) => void) {}

  public receberDocumento(doc: Documento) {
    // Simula leitura de documento sem foto, OCR já retornou os dados
    this.fila.push(doc);
    console.log(`Documento recebido: ${doc.nome} (${doc.cpf})`);
    this.processar();
  }

  private processar() {
    while (this.fila.length > 0) {
      const doc = this.fila.shift();
      if (!doc) continue;

      const resultado = validarDocumento(doc);
      this.callback(doc, resultado);
    }
  }
}
