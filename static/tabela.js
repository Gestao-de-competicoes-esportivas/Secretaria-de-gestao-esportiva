document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('grupos-container');
  const select = document.getElementById('filtro-torneio');
  let torneios = [];
  let modalidades = [];
  let equipes = [];
  let classificacao = [];

  function mostrarCarregamento() {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-circulo" aria-hidden="true"></div>
        <p>Carregando classificação...</p>
      </div>`;
  }

  function escapar(valor) {
    return String(valor ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function atualizarEstatisticas(lista) {
    document.getElementById('stat-total-times').textContent = lista.length;
    const grupos = new Set(lista.map(e => `${e.torneio_id}-${e.grupo || 'Sem grupo'}`));
    document.getElementById('stat-total-grupos').textContent = grupos.size;
  }

  function ordenar(lista) {
    return [...lista].sort((a, b) =>
      Number(b.pontos) - Number(a.pontos) ||
      Number(b.vitorias) - Number(a.vitorias) ||
      Number(b.saldo_gols) - Number(a.saldo_gols) ||
      Number(b.gols_pro) - Number(a.gols_pro)
    );
  }

  function criarGrupo(nomeGrupo, times) {
    const card = document.createElement('article');
    card.className = 'grupo-card';

    const header = document.createElement('div');
    header.className = 'grupo-header';
    header.innerHTML = `<h2>${escapar(nomeGrupo)}</h2><span class="badge-count">${times.length} equipe(s)</span>`;

    const controles = document.createElement('div');
    controles.className = 'slider-controles';
    controles.innerHTML = `
      <span>Deslize para ver mais</span>
      <div class="slider-botoes">
        <button type="button" class="slider-btn slider-esquerda" aria-label="Mover tabela para esquerda">‹</button>
        <button type="button" class="slider-btn slider-direita" aria-label="Mover tabela para direita">›</button>
      </div>`;

    const responsivo = document.createElement('div');
    responsivo.className = 'table-responsive';

    const tabela = document.createElement('table');
    tabela.className = 'table-grupo';
    tabela.innerHTML = `
      <thead><tr>
        <th>#</th><th>Equipe</th><th class="ponto-highlight">P</th><th>J</th>
        <th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th>
      </tr></thead><tbody></tbody>`;

    const tbody = tabela.querySelector('tbody');

    ordenar(times).forEach((time, index) => {
      const tr = document.createElement('tr');
      const saldo = Number(time.saldo_gols) > 0 ? `+${time.saldo_gols}` : time.saldo_gols;
      tr.innerHTML = `
        <td class="posicao">${index + 1}º</td>
        <td>
          <div class="time-info">
            <span class="time-nome">${escapar(time.nome)}</span>
            <span class="time-torneio">${escapar(time.modalidade)}${time.categoria ? ' · ' + escapar(time.categoria) : ''}</span>
          </div>
        </td>
        <td class="ponto-highlight">${Number(time.pontos) || 0}</td>
        <td>${Number(time.jogos) || 0}</td>
        <td>${Number(time.vitorias) || 0}</td>
        <td>${Number(time.empates) || 0}</td>
        <td>${Number(time.derrotas) || 0}</td>
        <td>${Number(time.gols_pro) || 0}</td>
        <td>${Number(time.gols_contra) || 0}</td>
        <td>${saldo ?? 0}</td>`;
      tbody.appendChild(tr);
    });

    responsivo.appendChild(tabela);
    card.append(header, controles, responsivo);

    controles.querySelector('.slider-esquerda').addEventListener('click', () => {
      responsivo.scrollBy({ left: -responsivo.clientWidth * .75, behavior: 'smooth' });
    });
    controles.querySelector('.slider-direita').addEventListener('click', () => {
      responsivo.scrollBy({ left: responsivo.clientWidth * .75, behavior: 'smooth' });
    });

    return card;
  }

  function renderizar(torneioId = '') {
    container.innerHTML = '';

    let lista = classificacao.map(item => {
      const equipe = equipes.find(e => String(e.id) === String(item.equipe_id));
      const torneio = torneios.find(t => String(t.id) === String(item.torneio_id));
      const modalidade = modalidades.find(m => String(m.id) === String(item.modalidade_id));
      return {
        ...item,
        nome: equipe?.nome || `Equipe ${item.equipe_id}`,
        categoria: equipe?.categoria || '',
        torneio: torneio?.nome || 'Competição',
        modalidade: modalidade?.nome || 'Modalidade'
      };
    });

    if (torneioId) lista = lista.filter(e => String(e.torneio_id) === String(torneioId));
    atualizarEstatisticas(lista);

    if (!lista.length) {
      container.innerHTML = '<div class="loading-state"><p>Ainda não há equipes na classificação desta competição.</p></div>';
      return;
    }

    const porTorneio = new Map();
    lista.forEach(e => {
      const chave = String(e.torneio_id);
      if (!porTorneio.has(chave)) porTorneio.set(chave, []);
      porTorneio.get(chave).push(e);
    });

    porTorneio.forEach(timesTorneio => {
      const bloco = document.createElement('section');
      bloco.className = 'torneio-bloco';

      if (!torneioId) {
        const titulo = document.createElement('h3');
        titulo.className = 'torneio-cabecalho';
        titulo.textContent = timesTorneio[0].torneio;
        bloco.appendChild(titulo);
      }

      const grupos = new Map();
      timesTorneio.forEach(e => {
        const grupo = e.grupo || 'Sem grupo';
        if (!grupos.has(grupo)) grupos.set(grupo, []);
        grupos.get(grupo).push(e);
      });

      [...grupos.keys()].sort().forEach(grupo => bloco.appendChild(criarGrupo(grupo, grupos.get(grupo))));
      container.appendChild(bloco);
    });
  }

  try {
    mostrarCarregamento();

    [torneios, modalidades, equipes, classificacao] = await Promise.all([
      sgceGet('torneios?select=id,nome&order=nome.asc'),
      sgceGet('modalidades?select=id,nome&order=nome.asc'),
      sgceGet('equipes?select=id,nome,categoria&order=nome.asc'),
      sgceGet('equipe_torneios?select=id,equipe_id,torneio_id,modalidade_id,grupo,pontos,jogos,vitorias,empates,derrotas,gols_pro,gols_contra,saldo_gols')
    ]);

    select.innerHTML = '<option value="">Todos os torneios</option>';
    torneios.forEach(t => {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.nome;
      select.appendChild(option);
    });

    const urlId = new URLSearchParams(location.search).get('torneio_id') || '';
    if (urlId && [...select.options].some(o => o.value === urlId)) select.value = urlId;
    renderizar(urlId);

    select.addEventListener('change', () => {
      const id = select.value;
      const url = new URL(location.href);
      if (id) url.searchParams.set('torneio_id', id);
      else url.searchParams.delete('torneio_id');
      history.replaceState({}, '', `${url.pathname}${url.search}`);
      renderizar(id);
    });
  } catch (erro) {
    console.error(erro);
    container.innerHTML = `<div class="loading-state"><p>Não foi possível carregar a classificação.</p><p>${escapar(erro.message)}</p></div>`;
  }
});
