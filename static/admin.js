const ADMIN_SUPABASE_URL = 'https://tnenollrrmwxpbsdkevz.supabase.co';
const ADMIN_SUPABASE_KEY = 'sb_publishable_eudls2KFroh4dZ_sPPDCHg_V0wWddTw';
const db = window.supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_KEY);

let sessao = null;
let torneios = [];
let modalidades = [];
let relacoes = [];
let equipes = [];
let atletas = [];
let equipeTorneios = [];
let inscricoes = [];
let tecnicos = [];

const secoesInfo = {
  dashboard:['Visão geral','Resumo atual do SGCE.'],
  competicoes:['Competições','Crie e atualize campeonatos.'],
  inscricoes:['Inscrições','Aprove ou rejeite inscrições.'],
  equipes:['Equipes','Consulte e edite equipes.'],
  classificacao:['Classificação','Atualize o desempenho dos times.']
};

function esc(v='') {
  return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function statusLabel(v) {
  return ({planejado:'Planejado',inscricoes_abertas:'Inscrições abertas',em_andamento:'Em andamento',encerrado:'Encerrado',cancelado:'Cancelado',pendente:'Pendente',aprovada:'Aprovada',rejeitada:'Rejeitada',cancelada:'Cancelada'})[v] || v;
}

async function garantirAdmin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) { location.replace('login.html'); return false; }

  const { data, error } = await db.from('admins').select('user_id,nome').eq('user_id',session.user.id).maybeSingle();
  if (error || !data) {
    await db.auth.signOut();
    location.replace('login.html');
    return false;
  }

  sessao = session;
  document.getElementById('usuario-email').textContent = session.user.email;
  return true;
}

async function carregarDados() {
  const consultas = await Promise.all([
    db.from('torneios').select('*').order('id'),
    db.from('modalidades').select('*').order('nome'),
    db.from('torneio_modalidades').select('*'),
    db.from('equipes').select('*').order('nome'),
    db.from('atletas').select('*').order('nome_completo'),
    db.from('equipe_torneios').select('*'),
    db.from('inscricoes').select('*').order('created_at',{ascending:false}),
    db.from('tecnicos').select('id,nome_completo,email,telefone')
  ]);

  const erro = consultas.find(r => r.error)?.error;
  if (erro) throw erro;

  [torneios,modalidades,relacoes,equipes,atletas,equipeTorneios,inscricoes,tecnicos] = consultas.map(r => r.data || []);
  renderTudo();
}

function modalidadeDoTorneio(torneioId) {
  const rel = relacoes.find(r => String(r.torneio_id) === String(torneioId));
  return modalidades.find(m => String(m.id) === String(rel?.modalidade_id));
}

function equipeDoVinculo(id) {
  const et = equipeTorneios.find(x => String(x.id) === String(id));
  return { et, equipe:equipes.find(e => String(e.id) === String(et?.equipe_id)), torneio:torneios.find(t => String(t.id) === String(et?.torneio_id)) };
}

function renderResumo() {
  document.getElementById('resumo-torneios').textContent = torneios.length;
  document.getElementById('resumo-equipes').textContent = equipes.length;
  document.getElementById('resumo-atletas').textContent = atletas.length;
  document.getElementById('resumo-pendentes').textContent = inscricoes.filter(i => i.status === 'pendente').length;

  const recentes = inscricoes.slice(0,8);
  document.getElementById('recentes').innerHTML = recentes.length ? tabelaInscricoes(recentes,false) : '<div class="estado">Nenhuma inscrição ainda.</div>';
}

function renderTorneios() {
  const selectModalidade = document.getElementById('torneio-modalidade');
  selectModalidade.innerHTML = '<option value="">Selecione</option>' + modalidades.map(m => `<option value="${m.id}">${esc(m.nome)}</option>`).join('');

  const html = torneios.map(t => {
    const mod = modalidadeDoTorneio(t.id);
    return `<tr><td>${esc(t.nome)}</td><td>${esc(mod?.nome || '—')}</td><td>${esc(t.local || '—')}</td><td>${esc(t.data_inicio || '—')}</td><td><span class="badge">${esc(statusLabel(t.status))}</span></td><td><div class="acoes"><button class="btn btn-outline btn-sm" onclick="editarTorneio(${t.id})">Editar</button></div></td></tr>`;
  }).join('');

  document.getElementById('lista-torneios').innerHTML = torneios.length ? `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Nome</th><th>Modalidade</th><th>Local</th><th>Início</th><th>Status</th><th>Ações</th></tr></thead><tbody>${html}</tbody></table></div>` : '<div class="estado">Nenhuma competição cadastrada.</div>';

  const opts = '<option value="">Todas as competições</option>' + torneios.map(t => `<option value="${t.id}">${esc(t.nome)}</option>`).join('');
  document.getElementById('filtro-torneio-inscricao').innerHTML = opts;
  document.getElementById('filtro-torneio-classificacao').innerHTML = opts;
}

function tabelaInscricoes(lista,acoes=true) {
  const linhas = lista.map(i => {
    const atleta = atletas.find(a => String(a.id) === String(i.atleta_id));
    const { equipe, torneio } = equipeDoVinculo(i.equipe_torneio_id);
    const botoes = acoes ? `<div class="acoes"><button class="btn btn-outline btn-sm" onclick="mudarStatusInscricao(${i.id},'aprovada')">Aprovar</button><button class="btn btn-perigo btn-sm" onclick="mudarStatusInscricao(${i.id},'rejeitada')">Rejeitar</button><button class="btn btn-outline btn-sm" onclick="mudarStatusInscricao(${i.id},'cancelada')">Cancelar</button></div>` : '';
    return `<tr><td>${esc(atleta?.nome_completo || 'Atleta')}</td><td>${esc(equipe?.nome || '—')}</td><td>${esc(torneio?.nome || '—')}</td><td><span class="badge ${esc(i.status)}">${esc(statusLabel(i.status))}</span></td>${acoes?`<td>${botoes}</td>`:''}</tr>`;
  }).join('');

  return `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Atleta</th><th>Equipe</th><th>Competição</th><th>Status</th>${acoes?'<th>Ações</th>':''}</tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function renderInscricoes() {
  const status = document.getElementById('filtro-status-inscricao').value;
  const torneioId = document.getElementById('filtro-torneio-inscricao').value;
  let lista = [...inscricoes];
  if (status) lista = lista.filter(i => i.status === status);
  if (torneioId) lista = lista.filter(i => String(equipeDoVinculo(i.equipe_torneio_id).et?.torneio_id) === String(torneioId));
  document.getElementById('lista-inscricoes').innerHTML = lista.length ? tabelaInscricoes(lista,true) : '<div class="estado">Nenhuma inscrição encontrada.</div>';
}

function renderEquipes() {
  const linhas = equipes.map(e => {
    const tecnico = tecnicos.find(t => String(t.id) === String(e.tecnico_id));
    const jogadores = equipeTorneios.filter(et => String(et.equipe_id) === String(e.id)).length;
    return `<tr><td>${esc(e.nome)}</td><td>${esc(e.categoria || '—')}</td><td>${esc(tecnico?.nome_completo || '—')}</td><td>${esc(tecnico?.email || '—')}</td><td>${jogadores}</td><td><button class="btn btn-outline btn-sm" onclick="editarEquipe(${e.id})">Editar</button></td></tr>`;
  }).join('');
  document.getElementById('lista-equipes').innerHTML = equipes.length ? `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Equipe</th><th>Categoria</th><th>Técnico</th><th>E-mail</th><th>Competições</th><th>Ações</th></tr></thead><tbody>${linhas}</tbody></table></div>` : '<div class="estado">Nenhuma equipe cadastrada.</div>';
}

function renderClassificacao() {
  const torneioId = document.getElementById('filtro-torneio-classificacao').value;
  let lista = [...equipeTorneios];
  if (torneioId) lista = lista.filter(et => String(et.torneio_id) === String(torneioId));

  const linhas = lista.map(et => {
    const equipe = equipes.find(e => String(e.id) === String(et.equipe_id));
    const torneio = torneios.find(t => String(t.id) === String(et.torneio_id));
    return `<tr><td>${esc(equipe?.nome || '—')}</td><td>${esc(torneio?.nome || '—')}</td><td>${esc(et.grupo || '—')}</td><td>${et.pontos}</td><td>${et.jogos}</td><td>${et.vitorias}</td><td>${et.empates}</td><td>${et.derrotas}</td><td>${et.gols_pro}</td><td>${et.gols_contra}</td><td>${et.saldo_gols}</td><td><button class="btn btn-outline btn-sm" onclick="editarClassificacao(${et.id})">Editar</button></td></tr>`;
  }).join('');

  document.getElementById('lista-classificacao').innerHTML = lista.length ? `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Equipe</th><th>Competição</th><th>Grupo</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Ações</th></tr></thead><tbody>${linhas}</tbody></table></div>` : '<div class="estado">Nenhuma equipe na classificação.</div>';
}

function renderTudo() { renderResumo(); renderTorneios(); renderInscricoes(); renderEquipes(); renderClassificacao(); }

async function mudarStatusInscricao(id,status) {
  const { error } = await db.from('inscricoes').update({status}).eq('id',id);
  if (error) return alert(error.message);
  const item = inscricoes.find(i => String(i.id) === String(id)); if (item) item.status = status;
  renderResumo(); renderInscricoes();
}
window.mudarStatusInscricao = mudarStatusInscricao;

function abrirModal(titulo,campos,onSubmit) {
  const modal = document.getElementById('modal-edicao');
  const form = document.getElementById('modal-form');
  document.getElementById('modal-titulo').textContent = titulo;
  form.innerHTML = campos + '<div class="campo campo-full"><button class="btn btn-verde" type="submit">Salvar alterações</button></div>';
  form.onsubmit = async e => { e.preventDefault(); await onSubmit(new FormData(form)); };
  modal.classList.add('aberto');
}
function fecharModal(){document.getElementById('modal-edicao').classList.remove('aberto')}
document.getElementById('modal-fechar').addEventListener('click',fecharModal);
document.getElementById('modal-edicao').addEventListener('click',e=>{if(e.target.id==='modal-edicao')fecharModal()});

function editarTorneio(id) {
  const t = torneios.find(x => String(x.id) === String(id));
  abrirModal('Editar competição',`
    <div class="campo campo-full"><label>Nome</label><input name="nome" value="${esc(t.nome)}" required></div>
    <div class="campo"><label>Local</label><input name="local" value="${esc(t.local||'')}"></div>
    <div class="campo"><label>Início</label><input name="data_inicio" type="date" value="${esc(t.data_inicio||'')}"></div>
    <div class="campo"><label>Fim</label><input name="data_fim" type="date" value="${esc(t.data_fim||'')}"></div>
    <div class="campo"><label>Status</label><select name="status">${['planejado','inscricoes_abertas','em_andamento','encerrado','cancelado'].map(s=>`<option value="${s}" ${s===t.status?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></div>`,async f=>{
      const { error } = await db.from('torneios').update({nome:f.get('nome'),local:f.get('local')||null,data_inicio:f.get('data_inicio')||null,data_fim:f.get('data_fim')||null,status:f.get('status')}).eq('id',id);
      if(error)return alert(error.message); fecharModal(); await carregarDados();
    });
}
window.editarTorneio = editarTorneio;

function editarEquipe(id) {
  const e = equipes.find(x => String(x.id) === String(id));
  abrirModal('Editar equipe',`
    <div class="campo campo-full"><label>Nome</label><input name="nome" value="${esc(e.nome)}" required></div>
    <div class="campo campo-full"><label>Categoria</label><input name="categoria" value="${esc(e.categoria||'')}"></div>`,async f=>{
      const { error } = await db.from('equipes').update({nome:f.get('nome'),categoria:f.get('categoria')||null}).eq('id',id);
      if(error)return alert(error.message); fecharModal(); await carregarDados();
    });
}
window.editarEquipe = editarEquipe;

function editarClassificacao(id) {
  const et = equipeTorneios.find(x => String(x.id) === String(id));
  const nums = ['pontos','jogos','vitorias','empates','derrotas','gols_pro','gols_contra'];
  abrirModal('Editar classificação',`
    <div class="campo"><label>Grupo</label><input name="grupo" value="${esc(et.grupo||'')}"></div>
    ${nums.map(n=>`<div class="campo"><label>${n.replaceAll('_',' ')}</label><input type="number" min="0" name="${n}" value="${Number(et[n]||0)}"></div>`).join('')}`,async f=>{
      const dados={grupo:f.get('grupo')||null}; nums.forEach(n=>dados[n]=Number(f.get(n)||0)); dados.saldo_gols=dados.gols_pro-dados.gols_contra;
      const { error } = await db.from('equipe_torneios').update(dados).eq('id',id);
      if(error)return alert(error.message); fecharModal(); await carregarDados();
    });
}
window.editarClassificacao = editarClassificacao;

document.getElementById('form-torneio').addEventListener('submit',async e=>{
  e.preventDefault();
  const nome=document.getElementById('torneio-nome').value.trim();
  const modalidade_id=Number(document.getElementById('torneio-modalidade').value);
  if(!modalidade_id)return alert('Selecione uma modalidade.');
  const { data,error }=await db.from('torneios').insert({nome,local:document.getElementById('torneio-local').value.trim()||null,data_inicio:document.getElementById('torneio-inicio').value||null,data_fim:document.getElementById('torneio-fim').value||null,status:document.getElementById('torneio-status').value}).select('id').single();
  if(error)return alert(error.message);
  const rel=await db.from('torneio_modalidades').insert({torneio_id:data.id,modalidade_id});
  if(rel.error)return alert(rel.error.message);
  e.target.reset(); await carregarDados();
});

document.getElementById('filtro-status-inscricao').addEventListener('change',renderInscricoes);
document.getElementById('filtro-torneio-inscricao').addEventListener('change',renderInscricoes);
document.getElementById('filtro-torneio-classificacao').addEventListener('change',renderClassificacao);

document.querySelectorAll('.sidebar nav button').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.sidebar nav button').forEach(b=>b.classList.remove('ativo')); btn.classList.add('ativo');
  document.querySelectorAll('.painel-secao').forEach(s=>s.classList.remove('ativa'));
  const id=btn.dataset.secao; document.getElementById(`secao-${id}`).classList.add('ativa');
  document.getElementById('titulo-secao').textContent=secoesInfo[id][0]; document.getElementById('descricao-secao').textContent=secoesInfo[id][1];
  document.getElementById('sidebar').classList.remove('aberta');
}));

document.getElementById('mobile-menu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('aberta'));
document.getElementById('btn-sair').addEventListener('click',async()=>{await db.auth.signOut();location.replace('login.html')});

(async()=>{try{if(await garantirAdmin()) await carregarDados()}catch(e){console.error(e);alert(e.message||'Erro ao carregar painel.')}})();
