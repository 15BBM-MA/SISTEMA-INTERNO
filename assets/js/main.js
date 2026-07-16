// ============================================================
// SISTEMA 15º BBM — JS PRINCIPAL
// ============================================================

// Esconde o conteúdo até confirmar o login (evita "piscar" dados protegidos).
// Páginas de login/troca de senha não são ocultadas. Fallback revela em 6s.
(function () {
  if (!/(login|trocar-senha)\.html/.test(location.pathname)) {
    document.documentElement.style.visibility = 'hidden';
    setTimeout(() => { document.documentElement.style.visibility = ''; }, 6000);
  }
})();

// --- PWA: manifest + service worker (app instalável) ---
(function () {
  const ROOT = location.pathname.includes('/modulos/') ? '../../' : './';
  if (!document.querySelector('link[rel="manifest"]')) {
    const l = document.createElement('link');
    l.rel = 'manifest'; l.href = ROOT + 'manifest.webmanifest';
    document.head.appendChild(l);
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {}));
  }
})();

// --- Rótulos das tabelas no mobile (cada célula mostra o nome da coluna) ---
function bbmRotularTabelas(root) {
  (root || document).querySelectorAll('.table-wrap table').forEach(t => {
    const ths = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
    if (!ths.length) return;
    t.querySelectorAll('tbody tr').forEach(tr => {
      const cells = [...tr.children];
      cells.forEach((td, i) => {
        if (td.colSpan > 1 || cells.length === 1) { td.setAttribute('data-label', ''); return; }
        td.setAttribute('data-label', ths[i] || '');
      });
    });
  });
}
(function () {
  let agendado = false;
  const run = () => { agendado = false; bbmRotularTabelas(); };
  const obs = new MutationObserver(() => { if (!agendado) { agendado = true; requestAnimationFrame(run); } });
  document.addEventListener('DOMContentLoaded', () => {
    bbmRotularTabelas();
    obs.observe(document.body, { childList: true, subtree: true });
  });
})();

document.addEventListener('DOMContentLoaded', () => {

  // --- DATA/HORA ---
  const formatDate = () => {
    const now = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('pt-BR', opts);
  };

  const el = (id) => document.getElementById(id);

  if (el('topbarDate')) el('topbarDate').textContent = formatDate();
  if (el('heroDate')) {
    const now = new Date();
    el('heroDate').innerHTML =
      `<strong>${now.toLocaleDateString('pt-BR', { weekday:'long' })}</strong><br>
       ${now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}<br>
       ${now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`;
  }

  // Atualiza hora a cada minuto
  setInterval(() => {
    if (el('topbarDate')) el('topbarDate').textContent = formatDate();
    if (el('heroDate')) {
      const now = new Date();
      el('heroDate').innerHTML =
        `<strong>${now.toLocaleDateString('pt-BR', { weekday:'long' })}</strong><br>
         ${now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}<br>
         ${now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`;
    }
  }, 60000);

  // --- SIDEBAR TOGGLE (mobile) com backdrop e bloqueio de scroll ---
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle && sidebar) {
    // cria backdrop dinamicamente (não precisa estar no HTML de cada página)
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }
    const abrir = () => {
      sidebar.classList.add('open');
      backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
      menuToggle.setAttribute('aria-expanded', 'true');
    };
    const fechar = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
      document.body.style.overflow = '';
      menuToggle.setAttribute('aria-expanded', 'false');
    };
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.contains('open') ? fechar() : abrir();
    });
    backdrop.addEventListener('click', fechar);
    // fecha ao tocar num link do menu
    sidebar.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', fechar));
    // fecha com ESC e ao voltar pro desktop
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 768) fechar(); });
  }

  // --- MARK ACTIVE NAV ---
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(a => {
    if (path.includes(a.getAttribute('href').replace('../','').replace('index.html','')))
      a.classList.add('active');
  });

  // --- STATS (lê do localStorage) ---
  const stats = {
    statViaturas: 'viaturas',
    statEscala:   'escala',
    statMirins:   'mirins',
    statOS:       'os_abertas',
  };

  Object.entries(stats).forEach(([domId, key]) => {
    const elem = el(domId);
    if (!elem) return;
    const data = JSON.parse(localStorage.getItem('bbm_' + key) || '[]');
    elem.textContent = Array.isArray(data) ? data.length : '—';
  });

});

// ============================================================
// UTILITÁRIOS GLOBAIS
// ============================================================

window.BBM = {

  toast(msg, type = 'ok') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  },

  openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  },

  // ---------- CAMADA DE DADOS (localStorage + nuvem) ----------
  _cache: {},                 // cache em memória das coleções na nuvem
  _cloudFail: {},             // coleções que caíram para localStorage (tabela ausente/erro)

  // mapeia a chave do app para (módulo, coleção) na nuvem; null = fica no localStorage
  _keyMap(key) {
    if (key && key.indexOf('mirim_') === 0) return { modulo: 'bombeiro-mirim', colecao: key.slice(6) };
    if (key && key.indexOf('dat_') === 0) return { modulo: 'dat', colecao: key.slice(4) };
    if (key && key.indexOf('escala_') === 0) return { modulo: 'escala', colecao: key.slice(7) };
    if (key && key.indexOf('estrutura_') === 0) return { modulo: 'estrutura', colecao: key.slice(10) };
    if (key && key.indexOf('viaturas_') === 0) return { modulo: 'viaturas', colecao: key.slice(9) };
    return null;
  },

  // pré-carrega coleções da nuvem antes de a página renderizar
  async ready(keys, cb) {
    await this.initAuth();
    for (const k of (keys || [])) {
      const map = this._keyMap(k);
      if (!map) continue;
      try {
        const sb = await this.sb();
        const { data, error } = await sb.from('app_dados').select('dados')
          .eq('modulo', map.modulo).eq('colecao', map.colecao);
        if (error) throw error;
        this._cache[k] = (data || []).map(r => r.dados);
      } catch (e) {
        // tabela ainda não criada ou sem acesso → usa localStorage para não quebrar
        this._cloudFail[k] = true;
        try { this._cache[k] = JSON.parse(localStorage.getItem('bbm_' + k)) || []; }
        catch { this._cache[k] = []; }
      }
    }
    if (cb) cb();
  },

  // rebusca uma coleção da nuvem e mantém o cache coerente.
  // usar sempre que a página precisar de dados frescos — nunca consultar
  // o Supabase por fora, senão _cache fica defasado e o _sync deixa de apagar.
  async refresh(key) {
    const map = this._keyMap(key);
    if (!map) return this.load(key);
    try {
      const sb = await this.sb();
      const { data, error } = await sb.from('app_dados').select('dados')
        .eq('modulo', map.modulo).eq('colecao', map.colecao);
      if (error) throw error;
      this._cache[key] = (data || []).map(r => r.dados);
      delete this._cloudFail[key]; // nuvem respondeu: volta a sincronizar
      return this._cache[key];
    } catch (e) {
      return this.load(key);
    }
  },

  save(key, data) {
    const map = this._keyMap(key);
    if (!map || this._cloudFail[key]) {
      localStorage.setItem('bbm_' + key, JSON.stringify(data));
      if (map) this._cache[key] = data;
      return Promise.resolve({ ok: false, local: true });
    }
    const prev = this._cache[key] || [];
    this._cache[key] = data;
    // sincroniza com a nuvem; retorna promise para o chamador tratar erros
    return this._sync(map, prev, data).then(() => ({ ok: true })).catch(e => ({ ok: false, error: e }));
  },

  async _sync(map, prev, data) {
    const sb = await this.sb();
    const novoIds = new Set(data.map(x => x.id));
    const rows = data.map(x => ({ modulo: map.modulo, colecao: map.colecao, item_id: x.id, dados: x, atualizado: new Date().toISOString() }));
    if (rows.length) {
      const { error } = await sb.from('app_dados').upsert(rows, { onConflict: 'modulo,colecao,item_id' });
      if (error) throw error;
    }
    const remover = prev.map(x => x.id).filter(id => !novoIds.has(id));
    for (const id of remover) {
      await sb.from('app_dados').delete().eq('modulo', map.modulo).eq('colecao', map.colecao).eq('item_id', id);
    }
  },

  load(key) {
    const map = this._keyMap(key);
    if (map && !this._cloudFail[key]) return this._cache[key] || [];
    try { return JSON.parse(localStorage.getItem('bbm_' + key)) || []; }
    catch { return []; }
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  formatDate(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  },

  // Padroniza nomes próprios: "MARIA DE LOURDES" -> "Maria de Lourdes"
  padronizarNome(nome) {
    if (!nome) return '';
    const minusculas = ['de','da','do','das','dos','e','di','du','del','von','van'];
    return nome.toLowerCase().trim().replace(/\s+/g, ' ').split(' ').map((p, i) => {
      if (!p) return p;
      if (i > 0 && minusculas.includes(p)) return p;
      // mantém apóstrofos e hífens com capitalização correta (ex: d'Avila, Maria-Clara)
      return p.replace(/(^|['\-])([a-zà-ÿ])/g, (m, sep, ch) => sep + ch.toUpperCase());
    }).join(' ');
  },

  // ===================== CONTROLE DE ACESSO =====================
  MODULOS_SIS: [
    { key:'viaturas',       label:'Viaturas' },
    { key:'almoxarifado',   label:'Almoxarifado' },
    { key:'escala',         label:'Escala de Serviço' },
    { key:'bombeiro-mirim', label:'Bombeiro Mirim' },
    { key:'estrutura',      label:'Estrutura Interna' },
    { key:'manutencao',     label:'Manutenção' },
    { key:'dat',            label:'DAT — Atividades Técnicas' },
  ],

  // ---------- SUPABASE / AUTENTICAÇÃO ----------
  SB_URL: (window.SUPABASE_URL || 'https://czujticzdtmmiugjajgh.supabase.co'),
  SB_KEY: (window.SUPABASE_KEY || 'sb_publishable_YFyNxDKAGSpZiGESF7f55w_3EpkAUB-'),
  _sb: null,
  _perfil: null,
  _authReady: false,
  _readyCbs: [],

  // cliente Supabase (carregado sob demanda)
  async sb() {
    if (!this._sb) {
      const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      this._sb = m.createClient(this.SB_URL, this.SB_KEY);
    }
    return this._sb;
  },

  // carrega a sessão atual + o perfil do banco (uma vez por página)
  async initAuth() {
    try {
      const sb = await this.sb();
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        const { data: perfil } = await sb.from('perfis').select('*').eq('id', session.user.id).single();
        this._perfil = perfil || null;
      } else {
        this._perfil = null;
      }
    } catch (e) { this._perfil = null; }
    this._authReady = true;
    const u = this._perfil;
    this._readyCbs.splice(0).forEach(cb => { try { cb(u); } catch (_) {} });
    return this._perfil;
  },

  // executa um callback quando a autenticação terminar de carregar
  onReady(cb) { if (this._authReady) cb(this._perfil); else this._readyCbs.push(cb); },

  // perfil do usuário logado (síncrono, disponível após initAuth)
  session() { return this._perfil; },
  currentUser() { return this._perfil; },

  // login por usuário (mapeado para e-mail interno) via Supabase Auth
  async login(login, senha) {
    const sb = await this.sb();
    const email = (login || '').trim().toLowerCase() + '@15bbm.app';
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) return { error: error.message };
    const { data: perfil } = await sb.from('perfis').select('*').eq('id', data.user.id).single();
    this._perfil = perfil || null;
    return { perfil: this._perfil };
  },

  async logout() {
    try { const sb = await this.sb(); await sb.auth.signOut(); } catch (_) {}
    this._perfil = null;
  },

  // troca a senha do PRÓPRIO usuário logado (1º acesso ou voluntária)
  async trocarMinhaSenha(novaSenha) {
    const sb = await this.sb();
    const { error } = await sb.auth.updateUser({ password: novaSenha });
    if (error) return { error: error.message };
    await sb.rpc('marcar_senha_trocada');
    if (this._perfil) this._perfil.precisa_trocar = false;
    return { ok: true };
  },

  // raiz relativa (./ no dashboard, ../../ dentro de /modulos/x/)
  root() { return location.pathname.includes('/modulos/') ? '../../' : './'; },

  // módulo atual a partir do caminho
  moduloAtual() {
    const m = location.pathname.match(/\/modulos\/([^\/]+)\//);
    return m ? m[1] : null;
  },

  // lista o efetivo do cadastro central (perfis) — para Escala, Estrutura, etc.
  async militares() {
    try {
      const sb = await this.sb();
      const { data, error } = await sb.rpc('listar_militares');
      if (error) throw error;
      return data || [];
    } catch (e) { return []; }
  },

  // nível de acesso do usuário logado ao módulo: 'edicao' | 'visualizacao' | 'nenhum'
  nivel(modKey) {
    const p = this._perfil;
    if (!p) return 'nenhum';
    if (p.role === 'admin') return 'edicao';
    if (modKey === 'acessos') return 'nenhum';
    return (p.permissoes && p.permissoes[modKey]) || 'nenhum';
  },

};

// ============================================================
// GUARD DE PERMISSÃO + MENU DE CONTA (roda em todas as páginas)
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const ROOT = BBM.root();
  const ehLogin = /login\.html(?:$|\?)/.test(location.pathname);
  const ehTroca = /trocar-senha\.html(?:$|\?)/.test(location.pathname);

  await BBM.initAuth();
  const user = BBM.currentUser();

  // páginas de autenticação cuidam do próprio fluxo
  if (ehLogin || ehTroca) { document.documentElement.style.visibility = ''; return; }

  // exige login
  if (!user) { location.replace(ROOT + 'login.html'); return; }
  // primeiro acesso: força definir senha pessoal
  if (user.precisa_trocar) { location.replace(ROOT + 'trocar-senha.html'); return; }

  // libera o conteúdo (estava oculto para evitar flash antes da checagem)
  document.documentElement.style.visibility = '';

  // ---- Menu de conta na top bar ----
  const right = document.querySelector('.topbar-right');
  if (right) {
    const wrap = document.createElement('div');
    wrap.className = 'acct';
    const iniciais = (user.nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    wrap.innerHTML = `
      <button class="acct-btn" id="acctBtn" aria-haspopup="true" aria-expanded="false">
        <span class="acct-avatar">${iniciais}</span>
        <span class="acct-name">${user.nome}${user.role === 'admin' ? ' <span class="acct-tag">ADMIN</span>' : ''}</span>
        <span class="acct-chev">▾</span>
      </button>
      <div class="acct-menu" id="acctMenu">
        ${user.role === 'admin' ? `<a href="${ROOT}modulos/acessos/index.html">⚙ Controle de Acessos</a>` : ''}
        <a href="${ROOT}trocar-senha.html">🔑 Trocar minha senha</a>
        <button id="acctLogout">⎋ Sair</button>
      </div>`;
    right.appendChild(wrap);
    const btn = wrap.querySelector('#acctBtn');
    const menu = wrap.querySelector('#acctMenu');
    btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); btn.setAttribute('aria-expanded', menu.classList.contains('open')); });
    document.addEventListener('click', () => menu.classList.remove('open'));
    wrap.querySelector('#acctLogout').addEventListener('click', async () => {
      await BBM.logout(); location.href = ROOT + 'login.html';
    });
  }

  // ---- Injeta o item DAT no menu lateral (em todas as páginas, se tiver acesso) ----
  const navEl = document.querySelector('.sidebar-nav');
  if (navEl && BBM.moduloAtual() !== 'dat' && BBM.nivel('dat') !== 'nenhum') {
    const a = document.createElement('a');
    a.className = 'nav-item';
    a.href = ROOT + 'modulos/dat/index.html';
    a.innerHTML = '<span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span><span class="nav-text">DAT</span><span class="nav-arrow">›</span>';
    navEl.appendChild(a);
  }

  // ---- Enforcement de acesso ao módulo ----
  const modAtual = BBM.moduloAtual();
  if (user.role !== 'admin' && modAtual) {
    const nivel = BBM.nivel(modAtual);
    if (nivel === 'nenhum') { location.replace(ROOT + 'index.html'); return; }
    if (nivel === 'visualizacao') {
      document.body.classList.add('somente-leitura');
      const content = document.querySelector('.content');
      if (content) {
        const b = document.createElement('div');
        b.className = 'view-banner';
        b.innerHTML = '👁 <strong>Modo somente leitura</strong> — você pode visualizar, mas não editar este módulo.';
        content.insertBefore(b, content.firstChild);
      }
      const intent = /(nov[oa]|adicion|cadastr|lan[çc]|registr|movimenta|agendar|gerar|abrir|editar|excluir|salvar|remover|importar)/i;
      const sweep = () => {
        document.querySelectorAll('.content .btn-primary, .content .action-btn, .modal .btn-primary').forEach(b => b.style.display = 'none');
        document.querySelectorAll('.content .btn-ghost, .content button').forEach(b => {
          if (intent.test(b.textContent || '') && !/voltar/i.test(b.textContent || '')) b.style.display = 'none';
        });
      };
      sweep();
      const mo = new MutationObserver(() => sweep());
      mo.observe(document.querySelector('.content') || document.body, { childList: true, subtree: true });
    }
  }

  // página de acessos: somente admin
  if (location.pathname.includes('/modulos/acessos/') && user.role !== 'admin') {
    location.replace(ROOT + 'index.html');
  }
});
