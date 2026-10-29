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
    { id: 'floresta', nome: 'Floresta', cor: '#1d2a26', grad: 'linear-gradient(135deg,#5f8470,#bad1c3)' },
    { id: 'terra', nome: 'Terra', cor: '#261c15', grad: 'linear-gradient(135deg,#7b5a3c,#e3c7a4)' },
    { id: 'oliva', nome: 'Oliva', cor: '#212717', grad: 'linear-gradient(135deg,#6b7a4f,#c3cf9f)' },
    { id: 'musgo', nome: 'Musgo', cor: '#1d2a26', grad: 'linear-gradient(135deg,#7b5a3c,#5f8470)' }
  ];

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
    try {
      const bruto = JSON.parse(ler(CHAVE_DADOS) || '{}');
      const fichas = {};
      for (let i = 0; i < 7; i++) {
        const f = bruto && bruto[i];
        fichas[i] = {
          musculo: f && typeof f.musculo === 'string' ? f.musculo : '',
          exercicios: f && Array.isArray(f.exercicios) ? f.exercicios.filter((x) => typeof x === 'string') : []
        };
      }
      return fichas;
    } catch (_) {
      const vazio = {};
      for (let i = 0; i < 7; i++) vazio[i] = { musculo: '', exercicios: [] };
      return vazio;
    }
  }

  const fichas = carregarFichas();
  const salvarFichas = () => gravar(CHAVE_DADOS, JSON.stringify(fichas));

  // ---------- Estado ----------
  let hoje = new Date().getDay();
  let selecionado = hoje;
  let focoAnterior = null;

  const diaInfo = (idx) => DIAS.find((d) => d.idx === idx);

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
      const chip = el('div', 'chip');
      chip.style.background = t.grad;
      b.append(chip, el('span', null, t.nome));
      b.addEventListener('click', () => gravar(CHAVE_TEMA, aplicarTema(t.id)));
      box.append(b);
    });
  }

  // ---------- Renderização ----------
  function dataPorExtenso() {
    const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
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
      b.addEventListener('click', () => { selecionado = d.idx; render(); });
      dock.append(b);
    });
  }

  function renderConteudo() {
    const c = $('content');
    const f = fichas[selecionado];
    const info = diaInfo(selecionado);
    const vazia = !f.musculo.trim() && f.exercicios.length === 0;
    c.replaceChildren();

    const hero = el('section', 'hero');
    const ehHoje = selecionado === hoje;
    hero.append(el('span', 'badge' + (ehHoje ? '' : ' dim'), ehHoje ? 'Treino de hoje' : 'Outro dia'));
    hero.append(el('p', 'dayname', info.nome));
    hero.append(vazia
      ? el('h1', 'muscle empty', 'Sem ficha')
      : el('h1', f.musculo.trim() ? 'muscle' : 'muscle empty', f.musculo.trim() || 'Grupo muscular não definido'));
    c.append(hero);

    if (vazia) {
      const card = el('div', 'empty-card glass');
      card.append(el('div', 'emoji', '🏋️'));
      card.append(el('h2', null, 'Nenhum treino cadastrado'));
      card.append(el('p', null, 'Toque em Editar para escolher o grupo muscular e listar os exercícios de ' + info.nome.toLowerCase() + '.'));
      const b = el('button', 'pill primary', 'Cadastrar ficha');
      b.type = 'button';
      b.addEventListener('click', abrirEdicao);
      card.append(b);
      c.append(card);
      return;
    }

    if (f.exercicios.length === 0) {
      c.append(el('p', 'hint', 'Nenhum exercício na lista. Toque em Editar para adicionar.'));
      return;
    }

    const ul = el('ul', 'list');
    f.exercicios.forEach((nome, i) => {
      const li = el('li', 'item glass', nome);
      li.style.animationDelay = Math.min(i, 12) * 40 + 'ms';
      ul.append(li);
    });
    c.append(ul);
  }

  function render() {
    $('date').textContent = dataPorExtenso();
    $('btn-today').hidden = selecionado === hoje;
    renderDock();
    renderConteudo();
  }

  // ---------- Sheets ----------
  const overlay = $('overlay');

  function abrirSheet(id) {
    focoAnterior = document.activeElement;
    overlay.hidden = false;
    document.querySelectorAll('.sheet').forEach((s) => { s.hidden = s.id !== id; });
    document.body.classList.add('lock');
  }

  function fecharSheet() {
    overlay.hidden = true;
    document.body.classList.remove('lock');
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus({ preventScroll: true });
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
    const rm = el('button', 'rm', '×');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Remover exercício');
    rm.addEventListener('click', () => li.remove());
    li.append(inp, rm);
    $('rows').append(li);
    if (focar) inp.focus();
  }

  function abrirEdicao() {
    const f = fichas[selecionado];
    $('edit-title').textContent = 'Editar ' + diaInfo(selecionado).nome.toLowerCase();
    $('in-muscle').value = f.musculo;
    $('rows').replaceChildren();
    f.exercicios.forEach((x) => novaLinha(x, false));
    if (f.exercicios.length === 0) novaLinha('', false);
    abrirSheet('sheet-edit');
  }

  $('form-edit').addEventListener('submit', (e) => {
    e.preventDefault();
    fichas[selecionado] = {
      musculo: $('in-muscle').value.trim(),
      exercicios: Array.from($('rows').querySelectorAll('input')).map((i) => i.value.trim()).filter(Boolean)
    };
    salvarFichas();
    fecharSheet();
    render();
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
  $('btn-today').addEventListener('click', () => { selecionado = hoje; render(); });
  overlay.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) fecharSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) fecharSheet(); });

  // ---------- Virada de dia ----------
  // Ao voltar para o app (ou à meia-noite com ele aberto), recalcula o dia pelo relógio do aparelho.
  function verificarDia() {
    const agora = new Date().getDay();
    if (agora !== hoje) {
      const seguia = selecionado === hoje;
      hoje = agora;
      if (seguia) selecionado = hoje;
    }
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
