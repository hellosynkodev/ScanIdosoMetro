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
const overlay = document.getElementById("overlay") as HTMLCanvasElement;
const btnCapture = document.getElementById("btnCapture") as HTMLButtonElement;
const output = document.getElementById("output") as HTMLDivElement;

const motionCanvas = document.createElement("canvas");
const motionCtx = motionCanvas.getContext("2d");
let previousFrame: ImageData | null = null;

async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;

    video.addEventListener("loadedmetadata", () => {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      motionCanvas.width = video.videoWidth;
      motionCanvas.height = video.videoHeight;

      video.style.width = "100%";
      video.style.height = "auto";

      setInterval(detectarMovimento, 200);
    });

    await video.play();
    output.innerHTML += `<p>Câmera ativada com sucesso</p>`;

    window.addEventListener("resize", () => {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
    });
  } catch (err) {
    output.innerHTML += `<p style='color:red;'>Erro ao acessar a câmera: ${err}</p>`;
  }
}

function detectarMovimento() {
  if (!motionCtx || !overlay) return;

  motionCanvas.width = video.videoWidth;
  motionCanvas.height = video.videoHeight;
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;

  motionCtx.drawImage(video, 0, 0, motionCanvas.width, motionCanvas.height);
  const frame = motionCtx.getImageData(0, 0, motionCanvas.width, motionCanvas.height);

  if (!previousFrame) {
    previousFrame = frame;
    return;
  }

  const overlayCtx = overlay.getContext("2d");
  if (!overlayCtx) return;

  const width = frame.width;
  const height = frame.height;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let diffPixels = 0;

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = Math.abs(frame.data[i] - previousFrame.data[i]);
    const g = Math.abs(frame.data[i + 1] - previousFrame.data[i + 1]);
    const b = Math.abs(frame.data[i + 2] - previousFrame.data[i + 2]);

    const delta = (r + g + b) / 3;
    if (delta > 20) {
      const idx = i / 4;
      const x = idx % width;
      const y = Math.floor(idx / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      diffPixels += 1;
    }
  }

  previousFrame = frame;

  overlayCtx.clearRect(0, 0, width, height);
  if (diffPixels > 500) {
    overlayCtx.strokeStyle = "red";
    overlayCtx.lineWidth = 3;
    overlayCtx.strokeRect(minX, minY, maxX - minX, maxY - minY);
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
