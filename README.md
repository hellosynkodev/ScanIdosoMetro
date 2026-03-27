# ScanIdosoMetro

Projeto simples para simular scanner automático de documento na fila prioritária de idosos.

## Como usar

1. Instalar dependências:

```bash
npm install
```

2. Compilar TypeScript:

```bash
npm run build
```

3. Abrir interface web (servidor local):

```bash
npm run serve
```

4. Abrir o navegador em `http://localhost:3000` e permitir acesso à câmera.

### Uso da câmera + OCR

- Clique em "Capturar e verificar cartão" para tirar foto do documento mostrado na webcam.
- O texto da imagem é reconhecido com `tesseract.js` e validado via regra de idade >= 60 e validade do cartão.
- Resultado aparece na área de output.

## Regras de validação

- Idade >= 60 anos = idoso
- Cartão do idoso válido hoje (data de validade >= hoje)

O scanner recebe dados já extraídos de OCR (simulado). Ele processa em tempo real sem necessidade de foto.
