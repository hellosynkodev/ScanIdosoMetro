# ScanIdosoMetro

Projeto simples para simular scanner automático de documento na fila prioritária de idosos.

## Como usar

1. Instalar dependências:

```bash
npm install
```

2. Executar em modo dev (diretamente TS):

```bash
npm run dev
```

3. Executar build + node:

```bash
npm run start
```

## Regras de validação

- Idade >= 60 anos = idoso
- Cartão do idoso válido hoje (data de validade >= hoje)

O scanner recebe dados já extraídos de OCR (simulado). Ele processa em tempo real sem necessidade de foto.
