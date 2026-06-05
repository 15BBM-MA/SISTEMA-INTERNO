// ============================================================
// SISTEMA 15º BBM — JS PRINCIPAL
// ============================================================

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

  // Cria os usuários da corporação (roda em qualquer página, garante login disponível)
  seedUsuarios() {
    const jaTem = this.load('usuarios');
    if (localStorage.getItem('bbm_usuarios_seed_v1') && jaTem.length) return jaTem;
    const permTodos = (nivel) => { const o = {}; this.MODULOS_SIS.forEach(m => o[m.key]=nivel); return o; };
    const oficiais = [
      { nome:'Major Martins',          posto:'Maj BM',     login:'martins',   senha:'martins15', admin:false },
      { nome:'Capitão Oliveira',       posto:'Cap BM',     login:'oliveira',  senha:'oliveira22',admin:false },
      { nome:'Capitão Daniel',         posto:'Cap BM',     login:'daniel',    senha:'daniel31',  admin:false },
      { nome:'1º Ten Araújo',          posto:'1º Ten BM',  login:'araujo',    senha:'araujo47',  admin:false },
      { nome:'1º Ten Paulo José',      posto:'1º Ten BM',  login:'paulojose', senha:'paulo58',   admin:false },
      { nome:'Aspirante Felipe Souza', posto:'Asp Of BM',  login:'felipe',    senha:'admin15',   admin:true  },
    ];
    const pracasRaw = [
      ['monteiro','1º Sgt P Monteiro','1º Sgt BM'], ['dene','2º Sgt Dene','2º Sgt BM'],
      ['costabarros','2º Sgt Costa Barros','2º Sgt BM'], ['ribeiro','2º Sgt Ribeiro','2º Sgt BM'],
      ['eliziane','3º Sgt Eliziane','3º Sgt BM'], ['fernando','3º Sgt Fernando','3º Sgt BM'],
      ['lisboa','3º Sgt Lisboa Santos','3º Sgt BM'], ['isac','3º Sgt Isac Teixeira','3º Sgt BM'],
      ['andrade','3º Sgt Andrade Silva','3º Sgt BM'], ['belarmino','3º Sgt Belarmino','3º Sgt BM'],
      ['igor','3º Sgt Igor','3º Sgt BM'], ['duarte','BC Duarte','Bombeiro Civil'],
      ['eloi','BC Eloi Neto','Bombeiro Civil'],
    ];
    const users = [];
    oficiais.forEach(o => users.push({
      id:this.generateId(), nome:o.nome, posto:o.posto, categoria:'Oficial',
      login:o.login, senha:o.senha, role:o.admin?'admin':'usuario',
      permissoes:permTodos('edicao'), precisaTrocar:true,
    }));
    pracasRaw.forEach(p => users.push({
      id:this.generateId(), nome:p[1], posto:p[2], categoria:'Praça/BC',
      login:'praca.'+p[0], senha:'bombeiro123', role:'usuario',
      permissoes:permTodos('visualizacao'), precisaTrocar:true,
    }));
    this.save('usuarios', users);
    localStorage.setItem('bbm_usuarios_seed_v1','1');
    return users;
  },

  // Define nova senha (primeiro acesso ou troca) e atualiza sessão
  trocarSenha(userId, novaSenha) {
    const users = this.load('usuarios');
    const i = users.findIndex(u => u.id === userId);
    if (i < 0) return false;
    users[i].senha = novaSenha;
    users[i].precisaTrocar = false;
    this.save('usuarios', users);
    const s = this.session();
    if (s && s.id === userId) { s.precisaTrocar = false; localStorage.setItem('bbm_sessao', JSON.stringify(s)); }
    return true;
  },

  // raiz relativa (./ no dashboard, ../../ dentro de /modulos/x/)
  root() { return location.pathname.includes('/modulos/') ? '../../' : './'; },

  // usuário logado (ou null)
  session() {
    try { return JSON.parse(localStorage.getItem('bbm_sessao') || 'null'); }
    catch { return null; }
  },

  login(login, senha) {
    const users = this.seedUsuarios();   // garante que os usuários existam
    const u = users.find(x => (x.login||'').toLowerCase() === (login||'').toLowerCase().trim() && x.senha === senha);
    if (!u) return null;
    const sess = { id:u.id, nome:u.nome, login:u.login, role:u.role, permissoes:u.permissoes||{}, precisaTrocar: !!u.precisaTrocar };
    localStorage.setItem('bbm_sessao', JSON.stringify(sess));
    return sess;
  },

  logout() { localStorage.removeItem('bbm_sessao'); },

  // módulo atual a partir do caminho
  moduloAtual() {
    const m = location.pathname.match(/\/modulos\/([^\/]+)\//);
    return m ? m[1] : null;
  },

  // nível de acesso do usuário logado ao módulo: 'edicao' | 'visualizacao' | 'nenhum'
  nivel(modKey) {
    const s = this.session();
    if (!s) return 'edicao';            // sem login = acesso total (modo compatível)
    if (s.role === 'admin') return 'edicao';
    if (modKey === 'acessos') return 'nenhum';
    return (s.permissoes && s.permissoes[modKey]) || 'nenhum';
  },

};

// ============================================================
// GUARD DE PERMISSÃO + MENU DE CONTA (roda em todas as páginas)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  BBM.seedUsuarios();               // garante usuários cadastrados em qualquer página
  const ROOT = BBM.root();
  const sess = BBM.session();
  const modAtual = BBM.moduloAtual();

  // ---- Menu de conta na top bar ----
  const right = document.querySelector('.topbar-right');
  if (right) {
    const wrap = document.createElement('div');
    wrap.className = 'acct';
    if (sess) {
      const iniciais = (sess.nome||'?').split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase();
      wrap.innerHTML = `
        <button class="acct-btn" id="acctBtn" aria-haspopup="true" aria-expanded="false">
          <span class="acct-avatar">${iniciais}</span>
          <span class="acct-name">${sess.nome}${sess.role==='admin'?' <span class="acct-tag">ADMIN</span>':''}</span>
          <span class="acct-chev">▾</span>
        </button>
        <div class="acct-menu" id="acctMenu">
          ${sess.role==='admin'?`<a href="${ROOT}modulos/acessos/index.html">⚙ Controle de Acessos</a>`:''}
          <a href="${ROOT}trocar-senha.html">🔑 Trocar minha senha</a>
          <button id="acctLogout">⎋ Sair</button>
        </div>`;
      right.appendChild(wrap);
      const btn = wrap.querySelector('#acctBtn');
      const menu = wrap.querySelector('#acctMenu');
      btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); btn.setAttribute('aria-expanded', menu.classList.contains('open')); });
      document.addEventListener('click', () => menu.classList.remove('open'));
      wrap.querySelector('#acctLogout').addEventListener('click', () => {
        BBM.logout(); BBM.toast('Sessão encerrada.'); setTimeout(()=>location.href = ROOT+'login.html', 400);
      });
    } else {
      wrap.innerHTML = `<a class="acct-login" href="${ROOT}login.html">⎆ Entrar</a>`;
      right.appendChild(wrap);
    }
  }

  // ---- Enforcement de acesso ao módulo ----
  if (sess && sess.role !== 'admin' && modAtual) {
    const nivel = BBM.nivel(modAtual);
    if (nivel === 'nenhum') {
      alert('Você não tem permissão para acessar este módulo.');
      location.href = ROOT + 'index.html';
      return;
    }
    if (nivel === 'visualizacao') {
      document.body.classList.add('somente-leitura');
      // banner informativo
      const content = document.querySelector('.content');
      if (content) {
        const b = document.createElement('div');
        b.className = 'view-banner';
        b.innerHTML = '👁 <strong>Modo somente leitura</strong> — você pode visualizar, mas não editar este módulo.';
        content.insertBefore(b, content.firstChild);
      }
      // esconde botões de edição (primários, ações de linha e ghost com intenção de editar)
      const intent = /(nov[oa]|adicion|cadastr|lan[çc]|registr|movimenta|agendar|gerar|abrir|editar|excluir|salvar|remover|importar)/i;
      const sweep = () => {
        document.querySelectorAll('.content .btn-primary, .content .action-btn, .modal .btn-primary').forEach(b => b.style.display='none');
        document.querySelectorAll('.content .btn-ghost, .content button').forEach(b => {
          if (intent.test(b.textContent||'') && !/voltar/i.test(b.textContent||'')) b.style.display='none';
        });
      };
      sweep();
      // re-aplica após renders dinâmicos
      const mo = new MutationObserver(() => sweep());
      mo.observe(document.querySelector('.content') || document.body, { childList:true, subtree:true });
    }
  }

  // bloqueia página de acessos para não-admin acessada diretamente
  if (location.pathname.includes('/modulos/acessos/') && sess && sess.role !== 'admin') {
    alert('Acesso restrito ao administrador.');
    location.href = ROOT + 'index.html';
  }
});
