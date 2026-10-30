# Ficha de Treino

PWA de uma única função: abrir e ver o treino do dia da semana (grupo muscular + lista de exercícios). Sem conta, sem login, sem servidor. Funciona offline.

## Por que HTML + CSS + JS puro

O escopo é uma tela com 7 fichas pequenas, então qualquer framework ou build seria peso sem ganho. HTML, CSS e JavaScript puro carregam instantaneamente, não exigem instalação nem compilação e podem ser hospedados em qualquer servidor estático. Os dados (7 pares grupo muscular/lista) cabem com folga no `localStorage`, que é síncrono, simples e suficiente para uso individual em um único aparelho.

Para o uso offline na academia, um Service Worker (`sw.js`) guarda todos os arquivos no aparelho na primeira abertura; depois disso o app abre sem rede. O dia da semana vem de `new Date().getDay()` (relógio do aparelho) e é recalculado ao voltar para o app.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura e meta tags de iOS |
| `styles.css` | Visual (vidro fosco), paletas, safe areas |
| `app.js` | Lógica: dia atual, edição, tema, persistência |
| `sw.js` | Cache offline |
| `manifest.json` | Manifesto PWA |
| `icons/` | Ícones `-v2` (192, 512, maskable e `apple-touch-icon` 180) |
| `splash/` | Telas de abertura do iPhone (uma por tamanho de tela) |

## Recursos

- Ficha do dia aberta automaticamente, com etiqueta de ficha (A, B, C...) editável.
- Marcar exercícios feitos arrastando (ou tocando no número), com contador e destaque do próximo exercício. A marcação zera no dia seguinte.
- Copiar a ficha de um dia e colar em outro, com Desfazer.
- **Ajustes**: seis paletas (incluindo tema claro e Automático, que segue o iPhone), manter a tela acesa durante o treino e cópia de segurança (exportar e importar as fichas em arquivo).
- Acessível: foco gerenciado nas folhas, leitores de tela, alto contraste e texto que acompanha o tamanho definido no iOS.

## Rodar localmente

```bash
cd app-ficha-de-treino
python3 -m http.server 8000
# abra http://localhost:8000
```

(`localhost` conta como contexto seguro, então o Service Worker funciona. Abrir `index.html` direto por `file://` funciona, mas sem modo offline.)

## Publicar com GitHub Pages (HTTPS grátis)

1. Envie o projeto para o repositório no GitHub (branch `main`).
2. No repositório: **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
4. Em ~1 minuto o link aparece: `https://SEU-USUARIO.github.io/app-ficha-de-treino/`.

Qualquer hospedagem estática com HTTPS (Netlify, Cloudflare Pages, Vercel) também serve: basta publicar a pasta inteira.

## Instalar no iPhone

1. Abra o link no **Safari** (precisa ser o Safari).
2. Toque no botão **Compartilhar** (quadrado com seta para cima).
3. Role e toque em **Adicionar à Tela de Início**.
4. Confirme em **Adicionar**. O ícone aparece na tela de início e o app abre em tela cheia.

**Importante:** no iOS, o app instalado na tela de início tem armazenamento separado do Safari. Cadastre as fichas **depois** de abrir pelo ícone da tela de início; o que foi cadastrado antes no Safari não aparece lá. Os dados ficam só no aparelho: apagar o app ou os dados do site apaga as fichas. Abra o app uma vez com internet para ele baixar os arquivos; depois funciona offline.

## Atualizar o app depois de publicar

Com a estratégia de rede primeiro, o app já pega a versão nova ao abrir com internet. Mesmo assim, ao alterar arquivos, aumente o número em `CACHE` no `sw.js` (ex.: `ficha-de-treino-v2`) para o iPhone baixar a nova versão.
