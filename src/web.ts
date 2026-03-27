import Tesseract from "tesseract.js";
import { Documento, ResultadoValidacao } from "./types";
import { validarDocumento } from "./utils";

function calcularDataNascimentoOCR(texto: string): string | null {
  const regex = /([0-3]?\d\/[0-1]?\d\/[0-9]{4})/g;
  const match = regex.exec(texto);
  return match ? match[1] : null;
}

function extrairDadosOCR(texto: string): Documento {
  const dataNascimento = calcularDataNascimentoOCR(texto) || "1970-01-01";

  // Busca padrão hipotético de CPF
  const cpfMatch = texto.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  const cpf = cpfMatch ? cpfMatch[0] : "000.000.000-00";

  const nomeMatch = texto.match(/Nome\s*[:\-]?\s*([A-Za-zÀ-ÖØ-öø-ÿ ]+)/i);
  const nome = nomeMatch ? nomeMatch[1].trim() : "SEM NOME";

  // Validade do cartão do idoso em formato dd/mm/yyyy ou yyyy-mm-dd
  const validadeMatch = texto.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
  const validadeRaw = validadeMatch ? validadeMatch[0] : "2027-12-31";
  const validadeCartaoIdoso = validadeRaw.includes("/")
    ? validadeRaw.split("/").reverse().join("-")
    : validadeRaw;

  return {
    nome,
    dataNascimento: dataNascimento.replace(/\//g, "-"),
    cpf,
    idosoId: `ID${Math.floor(Math.random() * 999999).toString().padStart(6, "0")}`,
    validadeCartaoIdoso,
  };
}

const video = document.getElementById("video") as HTMLVideoElement;
const btnCapture = document.getElementById("btnCapture") as HTMLButtonElement;
const output = document.getElementById("output") as HTMLDivElement;

async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    output.innerHTML += `<p>Camera ativada com sucesso</p>`;
  } catch (err) {
    output.innerHTML += `<p style='color:red;'>Erro ao acessar a câmera: ${err}</p>`;
  }
}

function aplicarPreProcessamento(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dados = imageData.data;
  for (let i = 0; i < dados.length; i += 4) {
    const r = dados[i];
    const g = dados[i + 1];
    const b = dados[i + 2];

    // converte para escala de cinza
    const cinza = (r + g + b) / 3;

    // aumenta contraste simples
    const fator = 1.4;
    const offset = 128 * (1 - fator);
    const contraste = fator * cinza + offset;

    const valor = Math.max(0, Math.min(255, contraste));
    dados[i] = dados[i + 1] = dados[i + 2] = valor;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

btnCapture.addEventListener("click", async () => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  aplicarPreProcessamento(canvas);

  output.innerHTML += `<p>Processando imagem (preprocessada)...</p>`;
  const result = await Tesseract.recognize(canvas, "por", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        output.innerHTML = `<p>OCR: ${Math.round(m.progress * 100)}%</p>`;
      }
    },
  });

  const text = result.data.text || "";
  output.innerHTML += `<pre>${text}</pre>`;

  const documento = extrairDadosOCR(text);
  const validacao = validarDocumento(documento);

  output.innerHTML += `<p><strong>Resultado:</strong> ${validacao.motivo}</p>`;
  output.innerHTML += `<p>Idade: ${validacao.idade}, Validade: ${documento.validadeCartaoIdoso}</p>`;

  if (validacao.idoso && validacao.cartaoOk) {
    output.innerHTML += `<p style='color:green;'>APROVADO</p>`;
  } else {
    output.innerHTML += `<p style='color:red;'>REJEITADO</p>`;
  }
});

iniciarCamera();
