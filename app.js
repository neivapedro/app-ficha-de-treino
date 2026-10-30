(() => {
  'use strict';

  const CHAVE_DADOS = 'ficha-de-treino:v1';
  const CHAVE_TEMA = 'ficha-de-treino:tema';
  const CHAVE_FEITOS = 'ficha-de-treino:feitos';
  const CHAVE_COPIA = 'ficha-de-treino:copia';
  const CHAVE_TELA = 'ficha-de-treino:tela';
  const CHAVE_DICA = 'ficha-de-treino:dica';
  const LIMIAR = 0.5; // fração da largura que confirma o gesto
  const ELASTICO = 0.55; // resistência do arrasto depois do limiar
  const VEZES_DICA = 3; // quantas vezes a dica do gesto aparece

  // Ordem de exibição: segunda → domingo. `getDay()` usa 0 = domingo.
  const DIAS = [
    { idx: 1, curto: 'Seg', nome: 'Segunda-feira' },
    { idx: 2, curto: 'Ter', nome: 'Terça-feira' },
    { idx: 3, curto: 'Qua', nome: 'Quarta-feira' },
    { idx: 4, curto: 'Qui', nome: 'Quinta-feira' },
    { idx: 5, curto: 'Sex', nome: 'Sexta-feira' },
    { idx: 6, curto: 'Sáb', nome: 'Sábado' },
    { idx: 0, curto: 'Dom', nome: 'Domingo' }
  ];

  const TEMAS = [
    { id: 'auto', nome: 'Automático', cor: '#1d2a26', destaque: '#bad1c3', fundo: 'linear-gradient(90deg, #1d2a26 50%, #efe6da 50%)', linha: '#8a918b' },
    { id: 'floresta', nome: 'Floresta', cor: '#1d2a26', destaque: '#bad1c3', fundo: '#1d2a26', linha: '#f3ece0' },
    { id: 'terra', nome: 'Terra', cor: '#261c15', destaque: '#e3c7a4', fundo: '#261c15', linha: '#f3ece0' },
    { id: 'oliva', nome: 'Oliva', cor: '#212717', destaque: '#c3cf9f', fundo: '#212717', linha: '#f3ece0' },
    { id: 'musgo', nome: 'Musgo', cor: '#1d2a26', destaque: '#e8d5b8', fundo: '#1d2a26', linha: '#f3ece0' },
    { id: 'creme', nome: 'Creme', cor: '#efe6da', destaque: '#3f6b57', fundo: '#efe6da', linha: '#1f2a26' }
  ];

  const svg = (w, caminho) => '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" aria-hidden="true">' + caminho + '</svg>';
  const ICONE_REMOVER = svg(20, '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/>');
  const ICONE_CHECK = svg(16, '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
  const ICONE_SETA = svg(18, '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
  const ICONE_MAIS = svg(22, '<circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/>');
  const ICONE_HALTER = '<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 24h20"/><rect x="8" y="14" width="6" height="20" rx="2"/><rect x="34" y="14" width="6" height="20" rx="2"/><path d="M4 19v10M44 19v10"/></g></svg>';

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, texto) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  };
  const reduzMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Armazenamento ----------
  const ler = (chave) => { try { return localStorage.getItem(chave); } catch (_) { return null; } };
  const gravar = (chave, valor) => { try { localStorage.setItem(chave, valor); return true; } catch (_) { return false; } };
  const armazenamentoOk = gravar('ficha-de-treino:teste', '1');
  const MSG_FALHA = 'Não foi possível salvar neste navegador. As alterações podem ser perdidas.';

  // Aceita só o formato esperado, de qualquer origem (armazenamento ou arquivo importado)
  function normalizarFichas(bruto) {
    const fichas = {};
    const origem = bruto && typeof bruto === 'object' ? bruto : {};
    for (let i = 0; i < 7; i++) {
      const f = origem[i];
      fichas[i] = {
        ficha: f && typeof f.ficha === 'string' ? f.ficha.slice(0, 4) : '',
        musculo: f && typeof f.musculo === 'string' ? f.musculo.slice(0, 40) : '',
        exercicios: f && Array.isArray(f.exercicios) ? f.exercicios.filter((x) => typeof x === 'string').map((x) => x.slice(0, 60)) : []
      };
    }
    return fichas;
  }
  const copiaDeFichas = (f) => JSON.parse(JSON.stringify(f));

  function carregarFichas() {
    let bruto = {};
    try { bruto = JSON.parse(ler(CHAVE_DADOS) || '{}'); } catch (_) { bruto = {}; }
    return normalizarFichas(bruto);
  }

  // Exercícios feitos hoje. Guardados com a data: no dia seguinte a marcação recomeça do zero.
  const dataISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const chaveItem = (i, nome) => i + ':' + nome;
  function carregarFeitos(data) {
    try {
      const o = JSON.parse(ler(CHAVE_FEITOS) || '{}');
      if (o && o.data === data && Array.isArray(o.itens)) return new Set(o.itens);
    } catch (_) { /* dados inválidos: começa vazio */ }
    return new Set();
  }

  // Ficha copiada: fica guardada para colar depois, mesmo fechando o app.
  function carregarCopia() {
    try {
      const o = JSON.parse(ler(CHAVE_COPIA) || 'null');
      if (o && typeof o.musculo === 'string' && Array.isArray(o.exercicios) && DIAS.some((d) => d.idx === o.origem)) {
        return { origem: o.origem, ficha: typeof o.ficha === 'string' ? o.ficha : '', musculo: o.musculo, exercicios: o.exercicios.filter((x) => typeof x === 'string') };
      }
    } catch (_) { /* sem cópia válida */ }
    return null;
  }

  let fichas = carregarFichas();
  let copia = carregarCopia();
  const salvarFichas = () => gravar(CHAVE_DADOS, JSON.stringify(fichas));
  const salvarFeitos = () => gravar(CHAVE_FEITOS, JSON.stringify({ data: dataHoje, itens: Array.from(feitos) }));
  const falhaAoSalvar = () => mostrarAviso(MSG_FALHA, null, 'erro');

  // ---------- Estado ----------
  let hoje = new Date().getDay();
  let dataHoje = dataISO();
  let feitos = carregarFeitos(dataHoje);
  let selecionado = hoje;
  let dicaMostrada = false;

  const diaInfo = (idx) => DIAS.find((d) => d.idx === idx);
  const posicao = (idx) => DIAS.findIndex((d) => d.idx === idx);
  const temConteudo = (f) => Boolean(f.musculo.trim() || f.exercicios.length);

  // ---------- Avisos e anúncios ----------
  let avisoTimer = null;
  function mostrarAviso(texto, desfazer, tipo) {
    const t = $('toast');
    t.replaceChildren(el('span', null, texto));
    t.classList.toggle('erro', tipo === 'erro');
    t.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    if (desfazer) {
      const b = el('button', 'toast-btn', 'Desfazer');
      b.type = 'button';
      b.addEventListener('click', () => { desfazer(); esconderAviso(); });
      t.append(b);
    }
    t.hidden = false;
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(esconderAviso, tipo === 'erro' ? 9000 : desfazer ? 6000 : 2500);
  }
  function esconderAviso() { clearTimeout(avisoTimer); $('toast').hidden = true; }

  // Região invisível para leitores de tela: mensagens curtas, sem reler a tela inteira
  function anunciar(msg) {
    const a = $('anuncio');
    a.textContent = '';
    setTimeout(() => { a.textContent = msg; }, 60);
  }

  // Vibração leve ao concluir. Técnica não oficial do iOS 17.4+ (interruptor nativo); sem suporte, não faz nada.
  function haptico() {
    try {
      const l = document.createElement('label');
      l.setAttribute('aria-hidden', 'true');
      l.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
      const i = document.createElement('input');
      i.type = 'checkbox';
      i.setAttribute('switch', '');
      l.append(i);
      document.body.append(l);
      l.click();
      l.remove();
    } catch (_) { /* sem vibração */ }
  }

  // ---------- Tema ----------
  const escuroClaro = window.matchMedia('(prefers-color-scheme: light)');
  const temaGuardado = () => { const t = ler(CHAVE_TEMA); return TEMAS.some((x) => x.id === t) ? t : 'auto'; };

  function aplicarTema(pref) {
    const resolvido = pref === 'auto' ? (escuroClaro.matches ? 'creme' : 'floresta') : pref;
    const tema = TEMAS.find((t) => t.id === resolvido) || TEMAS[1];
    document.documentElement.dataset.theme = tema.id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema.cor);
    document.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === pref)));
  }
  escuroClaro.addEventListener('change', () => { if (temaGuardado() === 'auto') aplicarTema('auto'); });

  function montarTemas() {
    const box = $('swatches');
    box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-label', 'Paletas de cores');
    TEMAS.forEach((t) => {
      const b = el('button', 'swatch');
      b.type = 'button';
      b.dataset.id = t.id;
      b.setAttribute('role', 'radio');
      // Miniatura da interface com as cores da paleta
      const chip = el('div', 'chip');
      chip.style.background = t.fundo;
      chip.style.setProperty('--linha', t.linha);
      const selo = el('i');
      selo.style.background = t.destaque;
      chip.append(selo, el('i'), el('i'));
      b.append(chip, el('span', null, t.nome));
      b.addEventListener('click', () => { gravar(CHAVE_TEMA, t.id); aplicarTema(t.id); });
      box.append(b);
    });
  }

  // ---------- Tela acesa durante o treino ----------
  let wake = null;
  const wakeSuportado = 'wakeLock' in navigator;
  async function aplicarTela() {
    if (!wakeSuportado) return;
    const ativo = ler(CHAVE_TELA) === '1';
    if (ativo && !document.hidden) {
      if (!wake) {
        try {
          wake = await navigator.wakeLock.request('screen');
          wake.addEventListener('release', () => { wake = null; });
        } catch (_) {
          wake = null;
          statusAjustes('Não foi possível manter a tela acesa agora.', true);
        }
      }
    } else if (wake) {
      wake.release().catch(() => {});
      wake = null;
    }
  }

  // ---------- Cópia de segurança ----------
  function statusAjustes(texto, erro, desfazer) {
    const s = $('aj-status');
    s.replaceChildren(el('span', null, texto));
    s.classList.toggle('erro-msg', Boolean(erro));
    if (desfazer) {
      const b = el('button', null, 'Desfazer');
      b.type = 'button';
      b.addEventListener('click', () => { desfazer(); b.remove(); });
      s.append(b);
    }
  }

  async function exportarFichas() {
    const dados = { app: 'ficha-de-treino', versao: 1, exportadoEm: new Date().toISOString(), fichas };
    const texto = JSON.stringify(dados, null, 2);
    const nome = 'ficha-de-treino-' + dataISO() + '.json';
    try {
      const arquivo = new File([texto], nome, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Ficha de Treino' });
      } else {
        const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
        const a = el('a');
        a.href = url;
        a.download = nome;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
      statusAjustes('Arquivo pronto. Guarde em um lugar seguro.');
    } catch (e) {
      if (e && e.name === 'AbortError') return; // o usuário fechou a folha de compartilhar
      statusAjustes('Não foi possível exportar as fichas.', true);
    }
  }

  async function importarFichas(arquivo) {
    if (!arquivo) return;
    try {
      const o = JSON.parse(await arquivo.text());
      if (!o || o.app !== 'ficha-de-treino' || typeof o.fichas !== 'object') throw new Error('formato');
      const anterior = copiaDeFichas(fichas);
      fichas = normalizarFichas(o.fichas);
      if (!salvarFichas()) { fichas = anterior; statusAjustes(MSG_FALHA, true); return; }
      statusAjustes('Fichas importadas.', false, () => {
        fichas = anterior;
        if (!salvarFichas()) falhaAoSalvar();
        statusAjustes('Importação desfeita.');
      });
    } catch (_) {
      statusAjustes('Esse arquivo não é uma cópia válida do Ficha de Treino.', true);
    }
  }

  // ---------- Progresso do treino de hoje ----------
  function montarProgresso() {
    const box = el('div', 'progress');
    const topo = el('div', 'prog-top');
    topo.append(el('strong', 'prog-count'), el('span', 'prog-rest'));
    const barra = el('div', 'bar');
    barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-label', 'Exercícios feitos');
    barra.append(el('i'));
    box.append(topo, barra);
    return box;
  }

  function atualizarProgresso() {
    const box = document.querySelector('.progress');
    if (!box) return;
    const itens = Array.from(document.querySelectorAll('.item'));
    const total = fichas[hoje].exercicios.length;
    const n = itens.filter((i) => i.classList.contains('feito')).length;
    const texto = n + ' de ' + total + (total === 1 ? ' feito' : ' feitos');
    box.querySelector('.prog-count').textContent = texto;
    box.querySelector('.prog-rest').textContent = n === total ? 'Treino concluído ✓' : n === 0 ? '' : 'faltam ' + (total - n);

    const completo = n === total;
    const havia = box.classList.contains('completo');
    box.classList.toggle('completo', completo);
    const selo = document.querySelector('.hero .badge');
    if (selo) selo.classList.toggle('completo', completo);
    if (completo && !havia && box.dataset.pronto) {
      // Só celebra quando o treino é concluído agora, não ao abrir o app já concluído
      box.classList.remove('brilho');
      void box.offsetWidth;
      box.classList.add('brilho');
    }
    box.dataset.pronto = '1';

    // O primeiro exercício pendente fica em destaque
    const proximo = itens.find((i) => !i.classList.contains('feito'));
    itens.forEach((i) => { i.classList.toggle('proximo', i === proximo); if (i === proximo) i.setAttribute('aria-current', 'step'); else i.removeAttribute('aria-current'); });

    const barra = box.querySelector('.bar');
    barra.setAttribute('aria-valuemin', '0');
    barra.setAttribute('aria-valuemax', String(total));
    barra.setAttribute('aria-valuenow', String(n));
    barra.setAttribute('aria-valuetext', texto);
    barra.firstChild.style.width = (total ? (n / total) * 100 : 0) + '%';
  }

  function montarItem(nome, chave, interativo) {
    const li = el('li', 'item');
    const fill = el('i', 'fill');
    fill.setAttribute('aria-hidden', 'true');
    const num = el(interativo ? 'button' : 'span', 'num');
    num.append(el('span'));
    const nomeEl = el('span', 'nome', nome);
    li.append(fill, num, nomeEl);
    if (!interativo) return li;

    const seta = el('span', 'seta');
    seta.setAttribute('aria-hidden', 'true');
    seta.innerHTML = ICONE_SETA;
    const prox = el('span', 'prox', 'Próximo');
    prox.setAttribute('aria-hidden', 'true');
    const ok = el('span', 'check');
    ok.setAttribute('aria-hidden', 'true');
    ok.innerHTML = ICONE_CHECK;
    const fim = el('span', 'fim');
    fim.append(ok, prox);
    li.append(seta, fim);

    num.type = 'button';
    li.classList.add('swipe');
    const feito = feitos.has(chave);
    li.classList.toggle('feito', feito);
    li.style.setProperty('--p', feito ? 1 : 0);
    num.setAttribute('aria-pressed', String(feito));
    num.setAttribute('aria-label', 'Feito: ' + nome);
    num.addEventListener('click', () => definirFeito(li, chave, !feitos.has(chave)));
    ligarGesto(li, chave);
    return li;
  }

  function definirFeito(li, chave, valor) {
    const mudou = feitos.has(chave) !== valor;
    if (valor) feitos.add(chave); else feitos.delete(chave);
    if (!salvarFeitos()) falhaAoSalvar();
    li.classList.remove('arrastando', 'esq');
    li.classList.toggle('feito', valor);
    li.style.setProperty('--p', valor ? 1 : 0);
    li.querySelector('.num').setAttribute('aria-pressed', String(valor));
    if (valor) {
      li.classList.remove('pop');
      void li.offsetWidth; // reinicia a animação
      li.classList.add('pop');
    }
    atualizarProgresso();
    if (mudou) {
      if (valor) haptico();
      const total = fichas[hoje].exercicios.length;
      const n = document.querySelectorAll('.item.feito').length;
      anunciar(li.querySelector('.nome').textContent + (valor ? ' feito. ' : ' desmarcado. ') + n + ' de ' + total + ' feitos.');
    }
  }

  // Arrastar para a direita preenche o exercício; passando da metade, confirma ao soltar.
  // Em um exercício já feito, arrastar para a esquerda desmarca.
  function ligarGesto(li, chave) {
    let id = null, x0 = 0, y0 = 0, larg = 1, base = 0, modo = null, p = 0, suprimir = false;

    li.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY;
      larg = li.offsetWidth || 1;
      base = feitos.has(chave) ? 1 : 0;
      modo = null;
    });

    li.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (modo === null) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          modo = 'h';
          li.setPointerCapture(id);
          li.classList.add('arrastando');
          li.classList.toggle('esq', base === 1);
        } else {
          if (Math.abs(dy) > 10) id = null; // rolagem vertical: deixa o navegador rolar
          return;
        }
      }
      p = Math.min(1, Math.max(0, base + dx / larg));
      // Resistência elástica depois do limiar, ao marcar
      const visual = base === 0 && p > LIMIAR ? LIMIAR + (p - LIMIAR) * ELASTICO : p;
      li.style.setProperty('--p', visual);
      li.classList.toggle('feito', p >= LIMIAR);
    });

    const soltar = (e, cancelado) => {
      if (e.pointerId !== id) return;
      id = null;
      if (modo !== 'h') return;
      modo = null;
      suprimir = true;
      setTimeout(() => { suprimir = false; }, 60);
      definirFeito(li, chave, cancelado ? base === 1 : p >= LIMIAR);
    };
    li.addEventListener('pointerup', (e) => soltar(e, false));
    li.addEventListener('pointercancel', (e) => soltar(e, true));
    li.addEventListener('click', (e) => { if (suprimir) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  // ---------- Copiar e colar ficha ----------
  const mesmaFicha = (a, b) => a.ficha === b.ficha && a.musculo === b.musculo && a.exercicios.length === b.exercicios.length && a.exercicios.every((x, i) => x === b.exercicios[i]);
  const podeColar = () => Boolean(copia && !mesmaFicha(copia, fichas[selecionado]));

  let menuAberto = null;
  function fecharMenu(devolverFoco) {
    if (!menuAberto) return;
    const { menu, btn } = menuAberto;
    menuAberto = null;
    menu.remove();
    btn.setAttribute('aria-expanded', 'false');
    if (devolverFoco) btn.focus();
  }

  function abrirMenu(btn) {
    const menu = el('div', 'menu float');
    menu.setAttribute('role', 'menu');
    if (temConteudo(fichas[selecionado])) {
      const c = el('button', null, 'Copiar ficha');
      c.type = 'button';
      c.setAttribute('role', 'menuitem');
      c.addEventListener('click', () => { fecharMenu(true); copiarFicha(); });
      menu.append(c);
    }
    if (podeColar()) {
      const c = el('button', null, 'Colar de ' + diaInfo(copia.origem).nome.toLowerCase());
      c.type = 'button';
      c.setAttribute('role', 'menuitem');
      c.addEventListener('click', () => { fecharMenu(false); colarFicha(); });
      menu.append(c);
    }
    btn.parentNode.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    menuAberto = { menu, btn };
    menu.querySelector('button').focus();
  }

  document.addEventListener('click', (e) => { if (menuAberto && !e.target.closest('.hero-actions')) fecharMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (!menuAberto) return;
    if (e.key === 'Escape') { e.preventDefault(); fecharMenu(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const itens = Array.from(menuAberto.menu.querySelectorAll('button'));
      const i = itens.indexOf(document.activeElement);
      itens[(i + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length].focus();
    }
  });

  function preencherAcoes() {
    const box = document.querySelector('.hero-actions');
    if (!box) return;
    box.replaceChildren();
    menuAberto = null;
    if (!temConteudo(fichas[selecionado]) && !podeColar()) return;
    const b = el('button', 'icon-btn glass');
    b.type = 'button';
    b.innerHTML = ICONE_MAIS;
    b.setAttribute('aria-label', 'Copiar ou colar ficha');
    b.setAttribute('aria-haspopup', 'menu');
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', () => { if (menuAberto) fecharMenu(false); else abrirMenu(b); });
    box.append(b);
  }

  function copiarFicha() {
    const f = fichas[selecionado];
    copia = { origem: selecionado, ficha: f.ficha, musculo: f.musculo, exercicios: f.exercicios.slice() };
    gravar(CHAVE_COPIA, JSON.stringify(copia));
    mostrarAviso('Ficha de ' + diaInfo(selecionado).nome.toLowerCase() + ' copiada');
  }

  function colarFicha() {
    if (!copia) return;
    const alvo = selecionado;
    const anterior = { ficha: fichas[alvo].ficha, musculo: fichas[alvo].musculo, exercicios: fichas[alvo].exercicios.slice() };
    fichas[alvo] = { ficha: copia.ficha, musculo: copia.musculo, exercicios: copia.exercicios.slice() };
    if (!salvarFichas()) falhaAoSalvar();
    render();
    anunciar('Ficha colada.');
    mostrarAviso('Ficha de ' + diaInfo(copia.origem).nome.toLowerCase() + ' colada', () => {
      fichas[alvo] = anterior;
      if (!salvarFichas()) falhaAoSalvar();
      render();
    });
  }

  // ---------- Renderização ----------
  const dataCurta = () => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

  function renderDock() {
    const dock = $('dock');
    dock.replaceChildren();
    DIAS.forEach((d) => {
      const f = fichas[d.idx];
      const letra = f.ficha.trim();
      const tem = temConteudo(f);
      const b = el('button', 'day' + (d.idx === hoje ? ' today' : ''));
      b.type = 'button';
      if (d.idx === selecionado) b.setAttribute('aria-current', 'true');
      b.setAttribute('aria-label', d.nome + (d.idx === hoje ? ' (hoje)' : '') + ', ' + (letra ? 'ficha ' + letra : tem ? 'treino cadastrado' : 'sem treino'));
      b.append(el('span', 'lbl', d.curto), el('span', 'sub' + (letra ? '' : tem ? ' ponto' : ' traco'), letra));
      b.addEventListener('click', () => irParaDia(d.idx));
      dock.append(b);
    });
  }

  function irParaDia(idx) {
    if (idx === selecionado) return;
    const sentido = Math.sign(posicao(idx) - posicao(selecionado));
    const trocar = () => {
      selecionado = idx;
      esconderAviso();
      fecharMenu(false);
      render();
      const f = fichas[idx];
      const n = f.exercicios.length;
      anunciar(diaInfo(idx).nome + '. ' + (temConteudo(f) ? (f.ficha.trim() ? 'Ficha ' + f.ficha.trim() + '. ' : '') + (f.musculo.trim() ? f.musculo.trim() + '. ' : '') + n + (n === 1 ? ' exercício.' : ' exercícios.') : 'Sem treino cadastrado.'));
    };
    if (document.startViewTransition && !reduzMovimento()) {
      const raiz = document.documentElement;
      raiz.style.setProperty('--vt-dx', sentido * 40 + 'px');
      raiz.classList.add('vt');
      const t = document.startViewTransition(trocar);
      t.finished.finally(() => raiz.classList.remove('vt'));
    } else {
      $('content').style.setProperty('--dx', sentido * 16 + 'px');
      trocar();
    }
  }

  function renderConteudo() {
    const c = $('content');
    const f = fichas[selecionado];
    const info = diaInfo(selecionado);
    const musculo = f.musculo.trim();
    const vazia = !musculo && f.exercicios.length === 0;
    const ehHoje = selecionado === hoje;
    c.replaceChildren();

    const hero = el('section', 'hero');
    const topo = el('div', 'hero-top');
    topo.append(el('span', 'badge' + (ehHoje ? '' : ' dim'), ehHoje ? info.nome + ' · hoje' : info.nome));
    topo.append(el('div', 'hero-actions'));
    hero.append(topo);
    if (!vazia) {
      const linha = el('div', 'title-row');
      linha.append(el('h1', 'title' + (musculo ? '' : ' dim'), musculo || 'Grupo muscular não definido'));
      const letra = f.ficha.trim();
      if (letra) {
        const tag = el('span', 'tag');
        tag.setAttribute('aria-label', 'Ficha ' + letra);
        tag.append(el('small', null, 'Ficha'), el('b', null, letra));
        linha.append(tag);
      }
      hero.append(linha);
    }
    c.append(hero);

    if (vazia) {
      const card = el('div', 'empty-card glass');
      card.insertAdjacentHTML('beforeend', ICONE_HALTER);
      card.append(el('h1', null, 'Nenhum treino cadastrado'));
      card.append(el('p', null, 'Escolha o grupo muscular e liste os exercícios de ' + info.nome.toLowerCase() + '.'));
      const b = el('button', 'pill primary', 'Cadastrar ficha');
      b.type = 'button';
      b.addEventListener('click', abrirEdicao);
      card.append(b);
      if (copia) {
        const colar = el('button', 'pill glass', 'Colar ficha de ' + diaInfo(copia.origem).nome.toLowerCase());
        colar.type = 'button';
        colar.addEventListener('click', colarFicha);
        card.append(colar);
      }
      c.append(card);
    } else if (f.exercicios.length === 0) {
      c.append(el('p', 'hint', 'Nenhum exercício na lista. Toque em Editar para adicionar.'));
    } else {
      if (ehHoje) c.append(montarProgresso());
      const ul = el('ul', 'list glass');
      ul.setAttribute('aria-label', 'Exercícios de ' + info.nome.toLowerCase());
      f.exercicios.forEach((nome, i) => ul.append(montarItem(nome, chaveItem(i, nome), ehHoje)));
      c.append(ul);
      if (ehHoje) {
        atualizarProgresso();
        mostrarDica(ul);
      }
    }
    c.style.setProperty('--dx', '0px');
    preencherAcoes();
  }

  // Nas primeiras vezes, o primeiro exercício mostra o gesto de arrastar
  function mostrarDica(ul) {
    if (dicaMostrada || document.querySelector('.item.feito')) return;
    const vezes = parseInt(ler(CHAVE_DICA) || '0', 10) || 0;
    if (vezes >= VEZES_DICA) return;
    dicaMostrada = true;
    gravar(CHAVE_DICA, String(vezes + 1));
    const primeiro = ul.firstChild;
    primeiro.classList.add('dica');
    primeiro.addEventListener('animationend', (e) => { if (e.target === primeiro.querySelector('.fill')) primeiro.classList.remove('dica'); });
  }

  function render() {
    $('date').textContent = dataCurta();
    $('btn-today').hidden = selecionado === hoje;
    $('btn-edit').setAttribute('aria-label', 'Editar ficha de ' + diaInfo(selecionado).nome.toLowerCase());
    renderDock();
    renderConteudo();
  }

  // ---------- Folhas (<dialog> modal: foco preso e fundo inerte) ----------
  const dlgEdicao = $('sheet-edit');
  const dlgAjustes = $('sheet-ajustes');
  let dlgAberto = null;

  // Mantém a folha acima do teclado do iOS, que reduz a área visível
  function ajustarViewport() {
    const v = window.visualViewport;
    if (!v || !dlgAberto) return;
    if (!window.matchMedia('(max-width: 699px)').matches) {
      dlgAberto.style.bottom = dlgAberto.style.maxHeight = '';
      return;
    }
    dlgAberto.style.bottom = Math.max(0, window.innerHeight - v.height - v.offsetTop) + 'px';
    dlgAberto.style.maxHeight = Math.round(v.height * 0.92) + 'px';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', ajustarViewport);
    window.visualViewport.addEventListener('scroll', ajustarViewport);
  }

  function abrirDialogo(dlg) {
    fecharMenu(false);
    dlgAberto = dlg;
    document.body.classList.add('lock');
    dlg.showModal();
    ajustarViewport();
    const titulo = dlg.querySelector('h2');
    if (titulo) titulo.focus({ preventScroll: true }); // foco dentro da folha, sem abrir o teclado
  }

  [dlgEdicao, dlgAjustes].forEach((dlg) => {
    dlg.addEventListener('close', () => {
      document.body.classList.remove('lock');
      dlg.style.bottom = dlg.style.maxHeight = '';
      dlgAberto = null;
      render();
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // toque no fundo escuro
    dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  });

  function novaLinha(valor, focar) {
    const li = el('li', 'row');
    const inp = el('input');
    inp.type = 'text';
    inp.value = valor || '';
    inp.maxLength = 60;
    inp.placeholder = 'Nome do exercício';
    inp.setAttribute('aria-label', 'Nome do exercício');
    inp.enterKeyHint = 'next';
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const prox = li.nextElementSibling;
      if (prox) prox.querySelector('input').focus();
      else if (inp.value.trim()) novaLinha('', true);
    });
    const rm = el('button', 'rm');
    rm.type = 'button';
    rm.innerHTML = ICONE_REMOVER;
    rm.setAttribute('aria-label', 'Remover exercício');
    rm.addEventListener('click', () => li.remove());
    li.append(inp, rm);
    $('rows').append(li);
    if (focar) {
      inp.focus();
      li.scrollIntoView({ block: 'nearest' });
    }
  }

  function abrirEdicao() {
    const f = fichas[selecionado];
    $('edit-title').textContent = 'Editar ' + diaInfo(selecionado).nome.toLowerCase();
    $('in-ficha').value = f.ficha;
    $('in-muscle').value = f.musculo;
    $('rows').replaceChildren();
    f.exercicios.forEach((x) => novaLinha(x, false));
    if (f.exercicios.length === 0) novaLinha('', false);
    const salvar = $('btn-save');
    salvar.disabled = false;
    salvar.textContent = 'Salvar';
    $('erro-salvar').hidden = true;
    abrirDialogo(dlgEdicao);
  }

  $('form-edit').addEventListener('submit', (e) => {
    e.preventDefault();
    const salvar = $('btn-save');
    if (salvar.disabled) return;
    fichas[selecionado] = {
      ficha: $('in-ficha').value.trim(),
      musculo: $('in-muscle').value.trim(),
      exercicios: Array.from($('rows').querySelectorAll('input')).map((i) => i.value.trim()).filter(Boolean)
    };
    if (!salvarFichas()) {
      // Não finge que salvou: mantém a folha aberta e explica
      const erro = $('erro-salvar');
      erro.textContent = MSG_FALHA + ' Use Ajustes > Exportar fichas para guardar uma cópia.';
      erro.hidden = false;
      return;
    }
    $('erro-salvar').hidden = true;
    // Confirmação visual breve antes de fechar
    salvar.disabled = true;
    salvar.textContent = 'Salvo ✓';
    setTimeout(() => dlgEdicao.close(), 450);
  });

  $('in-ficha').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    $('in-muscle').focus();
  });

  $('in-muscle').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const primeiro = $('rows').querySelector('input');
    if (primeiro) primeiro.focus();
  });

  $('btn-add').addEventListener('click', () => novaLinha('', true));
  $('btn-edit').addEventListener('click', abrirEdicao);
  $('btn-today').addEventListener('click', () => irParaDia(hoje));

  // Ajustes
  function abrirAjustes() {
    $('aj-status').replaceChildren();
    aplicarTema(temaGuardado());
    abrirDialogo(dlgAjustes);
  }
  $('btn-ajustes').addEventListener('click', abrirAjustes);

  const swTela = $('sw-tela');
  function atualizarSwitchTela() { swTela.setAttribute('aria-checked', String(ler(CHAVE_TELA) === '1')); }
  swTela.addEventListener('click', () => {
    gravar(CHAVE_TELA, ler(CHAVE_TELA) === '1' ? '0' : '1');
    atualizarSwitchTela();
    aplicarTela();
  });
  $('btn-exportar').addEventListener('click', exportarFichas);
  $('btn-importar').addEventListener('click', () => $('arq-importar').click());
  $('arq-importar').addEventListener('change', (e) => {
    importarFichas(e.target.files[0]);
    e.target.value = '';
  });

  // ---------- Virada de dia ----------
  // Ao voltar para o app (ou à meia-noite com ele aberto), recalcula o dia pelo relógio do aparelho.
  // Só redesenha quando o dia mudou, para a lista não piscar à toa.
  function verificarDia() {
    const agora = new Date().getDay();
    const data = dataISO();
    if (agora === hoje && data === dataHoje) return;
    const seguia = selecionado === hoje;
    hoje = agora;
    if (data !== dataHoje) { dataHoje = data; feitos = carregarFeitos(dataHoje); dicaMostrada = false; }
    if (seguia) selecionado = hoje;
    if (!dlgAberto) render();
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) verificarDia();
    aplicarTela();
  });
  window.addEventListener('pageshow', verificarDia);
  window.addEventListener('focus', verificarDia);
  setInterval(verificarDia, 60000);

  // ---------- Início ----------
  montarTemas();
  aplicarTema(temaGuardado());
  atualizarSwitchTela();
  $('sec-tela').hidden = !wakeSuportado;
  render();
  aplicarTela();

  if (!armazenamentoOk) falhaAoSalvar();
  // Pede ao navegador para não apagar os dados do app por falta de espaço
  if (armazenamentoOk && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sem HTTPS (ex.: file://) */ });
    });
  }
})();
