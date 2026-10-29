(() => {
  'use strict';

  const CHAVE_DADOS = 'ficha-de-treino:v1';
  const CHAVE_TEMA = 'ficha-de-treino:tema';

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
    { id: 'floresta', nome: 'Floresta', cor: '#1d2a26', destaque: '#bad1c3' },
    { id: 'terra', nome: 'Terra', cor: '#261c15', destaque: '#e3c7a4' },
    { id: 'oliva', nome: 'Oliva', cor: '#212717', destaque: '#c3cf9f' },
    { id: 'musgo', nome: 'Musgo', cor: '#1d2a26', destaque: '#e8d5b8' }
  ];

  const ICONE_REMOVER = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICONE_HALTER = '<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 24h20"/><rect x="8" y="14" width="6" height="20" rx="2"/><rect x="34" y="14" width="6" height="20" rx="2"/><path d="M4 19v10M44 19v10"/></g></svg>';

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, texto) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  };

  // ---------- Armazenamento ----------
  const ler = (chave) => { try { return localStorage.getItem(chave); } catch (_) { return null; } };
  const gravar = (chave, valor) => { try { localStorage.setItem(chave, valor); } catch (_) { /* modo privado/cheio */ } };

  function carregarFichas() {
    const fichas = {};
    let bruto = {};
    try { bruto = JSON.parse(ler(CHAVE_DADOS) || '{}') || {}; } catch (_) { bruto = {}; }
    for (let i = 0; i < 7; i++) {
      const f = bruto[i];
      fichas[i] = {
        musculo: f && typeof f.musculo === 'string' ? f.musculo : '',
        exercicios: f && Array.isArray(f.exercicios) ? f.exercicios.filter((x) => typeof x === 'string') : []
      };
    }
    return fichas;
  }

  const fichas = carregarFichas();
  const salvarFichas = () => gravar(CHAVE_DADOS, JSON.stringify(fichas));

  // ---------- Estado ----------
  let hoje = new Date().getDay();
  let selecionado = hoje;
  let focoAnterior = null;

  const diaInfo = (idx) => DIAS.find((d) => d.idx === idx);
  const posicao = (idx) => DIAS.findIndex((d) => d.idx === idx);

  // ---------- Tema ----------
  function aplicarTema(id) {
    const tema = TEMAS.find((t) => t.id === id) || TEMAS[0];
    document.documentElement.dataset.theme = tema.id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema.cor);
    document.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === tema.id)));
    return tema.id;
  }

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
      chip.style.background = t.cor;
      const selo = el('i');
      selo.style.background = t.destaque;
      chip.append(selo, el('i'), el('i'));
      b.append(chip, el('span', null, t.nome));
      b.addEventListener('click', () => gravar(CHAVE_TEMA, aplicarTema(t.id)));
      box.append(b);
    });
  }

  // ---------- Renderização ----------
  function dataCurta() {
    return new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  }

  function renderDock() {
    const dock = $('dock');
    dock.replaceChildren();
    DIAS.forEach((d) => {
      const b = el('button', 'day' + (d.idx === hoje ? ' today' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(d.idx === selecionado));
      b.setAttribute('aria-label', d.nome + (d.idx === hoje ? ' (hoje)' : ''));
      b.append(el('span', null, d.curto), el('i', 'dot'));
      b.addEventListener('click', () => irParaDia(d.idx));
      dock.append(b);
    });
  }

  function irParaDia(idx) {
    if (idx === selecionado) return;
    // A nova ficha entra pelo lado do dia escolhido
    const sentido = Math.sign(posicao(idx) - posicao(selecionado));
    $('content').style.setProperty('--dx', sentido * 16 + 'px');
    selecionado = idx;
    render();
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
    hero.append(el('span', 'badge' + (ehHoje ? '' : ' dim'), ehHoje ? info.nome + ' · hoje' : info.nome));
    if (!vazia) hero.append(el('h1', 'title' + (musculo ? '' : ' dim'), musculo || 'Grupo muscular não definido'));
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
      c.append(card);
    } else if (f.exercicios.length === 0) {
      c.append(el('p', 'hint', 'Nenhum exercício na lista. Toque em Editar para adicionar.'));
    } else {
      const ul = el('ul', 'list glass');
      f.exercicios.forEach((nome) => ul.append(el('li', 'item', nome)));
      c.append(ul);
    }
    c.style.setProperty('--dx', '0px');
  }

  function render() {
    $('date').textContent = dataCurta();
    $('btn-today').hidden = selecionado === hoje;
    $('btn-edit').setAttribute('aria-label', 'Editar ficha de ' + diaInfo(selecionado).nome.toLowerCase());
    renderDock();
    renderConteudo();
  }

  // ---------- Folhas ----------
  const overlay = $('overlay');

  // Mantém a folha acima do teclado do iOS, que reduz a área visível
  function ajustarViewport() {
    const v = window.visualViewport;
    if (!v || overlay.hidden) return;
    overlay.style.top = v.offsetTop + 'px';
    overlay.style.height = v.height + 'px';
    overlay.style.bottom = 'auto';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', ajustarViewport);
    window.visualViewport.addEventListener('scroll', ajustarViewport);
  }

  function abrirSheet(id) {
    focoAnterior = document.activeElement;
    overlay.hidden = false;
    document.querySelectorAll('.sheet').forEach((s) => { s.hidden = s.id !== id; });
    document.body.classList.add('lock');
    ajustarViewport();
  }

  function fecharSheet() {
    overlay.hidden = true;
    overlay.style.top = overlay.style.height = overlay.style.bottom = '';
    document.body.classList.remove('lock');
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus({ preventScroll: true });
    render();
  }

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
    $('in-muscle').value = f.musculo;
    $('rows').replaceChildren();
    f.exercicios.forEach((x) => novaLinha(x, false));
    if (f.exercicios.length === 0) novaLinha('', false);
    const salvar = $('btn-save');
    salvar.disabled = false;
    salvar.textContent = 'Salvar';
    abrirSheet('sheet-edit');
  }

  $('form-edit').addEventListener('submit', (e) => {
    e.preventDefault();
    const salvar = $('btn-save');
    if (salvar.disabled) return;
    fichas[selecionado] = {
      musculo: $('in-muscle').value.trim(),
      exercicios: Array.from($('rows').querySelectorAll('input')).map((i) => i.value.trim()).filter(Boolean)
    };
    salvarFichas();
    // Confirmação visual breve antes de fechar
    salvar.disabled = true;
    salvar.textContent = 'Salvo ✓';
    setTimeout(fecharSheet, 450);
  });

  $('in-muscle').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const primeiro = $('rows').querySelector('input');
    if (primeiro) primeiro.focus();
  });

  $('btn-add').addEventListener('click', () => novaLinha('', true));
  $('btn-edit').addEventListener('click', abrirEdicao);
  $('btn-theme').addEventListener('click', () => abrirSheet('sheet-theme'));
  $('btn-today').addEventListener('click', () => irParaDia(hoje));
  overlay.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) fecharSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) fecharSheet(); });

  // ---------- Virada de dia ----------
  // Ao voltar para o app (ou à meia-noite com ele aberto), recalcula o dia pelo relógio do aparelho.
  // Só redesenha quando o dia mudou, para a lista não piscar à toa.
  function verificarDia() {
    const agora = new Date().getDay();
    if (agora === hoje) return;
    const seguia = selecionado === hoje;
    hoje = agora;
    if (seguia) selecionado = hoje;
    if (overlay.hidden) render();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) verificarDia(); });
  window.addEventListener('pageshow', verificarDia);
  window.addEventListener('focus', verificarDia);
  setInterval(verificarDia, 60000);

  // ---------- Início ----------
  montarTemas();
  aplicarTema(ler(CHAVE_TEMA));
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sem HTTPS (ex.: file://) */ });
    });
  }
})();
