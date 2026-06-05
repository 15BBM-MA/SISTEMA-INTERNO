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

  save(key, data) {
    localStorage.setItem('bbm_' + key, JSON.stringify(data));
  },

  load(key) {
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
