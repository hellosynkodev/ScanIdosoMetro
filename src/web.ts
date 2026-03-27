import { Documento, ResultadoValidacao } from "./types";
import { validarDocumento } from "./utils";

let Tesseract: any = null;

async function carregarTesseract() {
  if (Tesseract) return;
  try {
    const mod = await import("tesseract.js");
    Tesseract = mod.default;
  } catch (err) {
    console.error("Erro ao carregar Tesseract:", err);
    throw err;
  }
}

function calcularDataNascimentoOCR(texto: string): string | null {
  const regex = /([0-3]?\d\/[0-1]?\d\/[0-9]{4})/g;
  const match = regex.exec(texto);
  return match ? match[1] : null;
}

function extrairDadosOCR(texto: string): Documento {
  const dataNascimento = calcularDataNascimentoOCR(texto) || "1970-01-01";

  const cpfMatch = texto.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  const cpf = cpfMatch ? cpfMatch[0] : "000.000.000-00";

  const nomeMatch = texto.match(/Nome\s*[:\-]?\s*([A-Za-zÀ-ÖØ-öø-ÿ ]+)/i);
  const nome = nomeMatch ? nomeMatch[1].trim() : "SEM NOME";

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

function aplicarPreProcessamento(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dados = imageData.data;
  for (let i = 0; i < dados.length; i += 4) {
    const r = dados[i];
    const g = dados[i + 1];
    const b = dados[i + 2];

    const cinza = (r + g + b) / 3;
    const fator = 1.4;
    const offset = 128 * (1 - fator);
    const contraste = fator * cinza + offset;
    const valor = Math.max(0, Math.min(255, contraste));

    dados[i] = dados[i + 1] = dados[i + 2] = valor;
  }

  ctx.putImageData(imageData, 0, 0);
}

function iniciar() {
  console.log("=== INICIANDO APLICAÇÃO ===", new Date().toISOString());

  const video = document.getElementById("video") as HTMLVideoElement;
  const overlay = document.getElementById("overlay") as HTMLCanvasElement;
  const btnCapture = document.getElementById("btnCapture") as HTMLButtonElement;
  const output = document.getElementById("output") as HTMLDivElement;

  console.log("Elementos encontrados:", {
    video: !!video,
    overlay: !!overlay,
    btnCapture: !!btnCapture,
    output: !!output,
  });

  if (!video || !overlay || !btnCapture || !output) {
    console.error("❌ ERRO CRÍTICO: Elementos do DOM não encontrados!");
    document.body.innerHTML += "<p style='color:red; font-size:20px;'>❌ Erro interno: elementos do DOM não encontrados</p>";
    return;
  }

  const motionCanvas = document.createElement("canvas");
  const motionCtx = motionCanvas.getContext("2d");
  let previousFrame: ImageData | null = null;

  function detectarMovimento() {
    if (!motionCtx || !overlay || !video) return;

    try {
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
    } catch (err) {
      console.error("Erro em detectarMovimento:", err);
    }
  }

  async function iniciarCamera() {
    try {
      console.log("📹 Solicitando acesso à câmera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      console.log("✅ Stream obtido:", stream);

      video.srcObject = stream;

      const onMetadata = () => {
        console.log("✅ Video metadata carregado:", video.videoWidth, "x", video.videoHeight);

        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        motionCanvas.width = video.videoWidth;
        motionCanvas.height = video.videoHeight;

        video.style.width = "100%";
        video.style.height = "auto";

        if (output) {
          output.innerHTML = `<p style="color:green; font-weight:bold;">✅ Câmera ativada com sucesso!</p>`;
        }

        const motionInterval = setInterval(detectarMovimento, 200);
        console.log("✅ Detector de movimento iniciado");
      };

      video.addEventListener("loadedmetadata", onMetadata, { once: true });

      await video.play();
      console.log("✅ Video play iniciado");

      window.addEventListener("resize", () => {
        if (video) {
          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;
        }
      });
    } catch (err: any) {
      console.error("❌ Erro ao acessar câmera:", err.message, err.name);
      if (output) {
        output.innerHTML = `<p style='color:red; font-weight:bold; font-size:1.05em;'>❌ Erro de câmera: ${err.message || err.name}</p>
          <p style='color:#666; font-size:0.9em;'><strong>Possíveis soluções:</strong></p>
          <ul style='font-size:0.9em; color:#666;'>
            <li>✓ Verifique se deu <strong>permissão de câmera</strong> ao navegador</li>
            <li>✓ Use <strong>HTTPS</strong> em produção (localhost OK)</li>
            <li>✓ Teste em <strong>Chrome, Edge ou Firefox</strong> atualizados</li>
            <li>✓ Reinicie o navegador</li>
            <li>✓ Desplug/replug a câmera USB se externa</li>
          </ul>`;
      }
    }
  }

  btnCapture.addEventListener("click", async () => {
    try {
      console.log("📸 Capturando imagem...");

      if (!video.srcObject) {
        if (output) output.innerHTML = `<p style='color:red;'>❌ Câmera não inicializada ainda</p>`;
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        if (output) output.innerHTML = `<p style='color:red;'>❌ Erro: não conseguiu contexto 2D do canvas</p>`;
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      aplicarPreProcessamento(canvas);

      if (output) output.innerHTML = `<p>⏳ Carregando OCR...</p>`;
      await carregarTesseract();

      if (output) output.innerHTML = `<p>🔄 Processando imagem (~10-30 seg)...</p>`;
      const result = await Tesseract.recognize(canvas, "por", {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            if (output) output.innerHTML = `<p>OCR: ${Math.round(m.progress * 100)}%</p>`;
          }
        },
      });

      const text = result.data.text || "";
      console.log("📝 Texto OCR:", text);

      if (output) output.innerHTML = `<pre>${text}</pre>`;

      const documento = extrairDadosOCR(text);
      const validacao = validarDocumento(documento);

      if (output) {
        output.innerHTML += `<p><strong>📊 Resultado:</strong> ${validacao.motivo}</p>`;
        output.innerHTML += `<p>👤 Nome: ${documento.nome}<br>🔢 CPF: ${documento.cpf}<br>📅 Nascimento: ${documento.dataNascimento}<br>⏰ Idade: ${validacao.idade} anos<br>🎫 Validade do cartão: ${documento.validadeCartaoIdoso}</p>`;

        if (validacao.idoso && validacao.cartaoOk) {
          output.innerHTML += `<p style='color:green; font-weight:bold; font-size:1.2em;'>✅ APROVADO NA FILA PRIORITÁRIA</p>`;
        } else {
          output.innerHTML += `<p style='color:red; font-weight:bold; font-size:1.2em;'>❌ REJEITADO</p>`;
        }
      }
    } catch (err: any) {
      console.error("❌ Erro na captura:", err);
      if (output) {
        output.innerHTML = `<p style='color:red;'>❌ Erro ao processar: ${err.message || err}</p>`;
      }
    }
  });

  console.log("✅ Aplicação inicializada com sucesso!");
  iniciarCamera();
}

// Aguarda DOM estar completamente carregado
console.log("📄 web.ts carregado. Estado do documento:", document.readyState);

if (document.readyState === "loading") {
  console.log("⏳ Aguardando DOMContentLoaded...");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOMContentLoaded disparado");
    setTimeout(iniciar, 100);
  });
} else {
  console.log("✅ DOM já pronto, iniciando...");
  setTimeout(iniciar, 100);
}
