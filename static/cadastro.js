document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('form-cadastro');
  const listaJogadores = document.getElementById('lista-jogadores');
  const botaoAdicionar = document.getElementById('adicionar-jogador');
  const selectTorneio = document.getElementById('torneio');
  const selectGrupo = document.getElementById('grupo');
  const botaoCadastrar = document.querySelector('.botao-cadastrar');
  const mensagem = document.getElementById('mensagem-form');

  function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem-form mostrar ${tipo}`;
    mensagem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function limparMensagem() {
    mensagem.textContent = '';
    mensagem.className = 'mensagem-form';
  }

  function renumerarJogadores() {
    [...listaJogadores.querySelectorAll('.jogador')].forEach((jogador, i) => {
      const titulo = jogador.querySelector('.jogador-cabecalho h3');
      if (titulo) titulo.textContent = `Jogador ${i + 1}`;
    });
  }

  function adicionarJogador() {
    if (listaJogadores.querySelectorAll('.jogador').length >= 30) {
      mostrarMensagem('O limite é de 30 jogadores por inscrição.', 'erro');
      return;
    }

    const numero = listaJogadores.querySelectorAll('.jogador').length + 1;
    const jogador = document.createElement('div');
    jogador.className = 'jogador';
    jogador.innerHTML = `
      <div class="jogador-cabecalho">
        <h3>Jogador ${numero}</h3>
        <button type="button" class="remover-jogador">Remover</button>
      </div>
      <div class="grade-form">
        <div class="campo campo-grande">
          <label>Nome completo *</label>
          <input type="text" name="jogador_nome[]" placeholder="Ex.: Pedro Henrique" maxlength="120" required>
        </div>
        <div class="campo">
          <label>Data de nascimento</label>
          <input type="date" name="jogador_nascimento[]">
        </div>
        <div class="campo">
          <label>Documento</label>
          <input type="text" name="jogador_documento[]" placeholder="CPF ou documento" maxlength="60">
        </div>
        <div class="campo">
          <label>Telefone</label>
          <input type="tel" name="jogador_telefone[]" placeholder="(84) 99999-9999" maxlength="30">
        </div>
        <div class="campo">
          <label>Número da camisa</label>
          <input type="number" name="jogador_numero[]" min="0" max="99" placeholder="10">
        </div>
      </div>`;

    jogador.querySelector('.remover-jogador').addEventListener('click', () => {
      jogador.remove();
      renumerarJogadores();
    });

    listaJogadores.appendChild(jogador);
  }

  async function carregarTorneios() {
    try {
      const [torneios, modalidades, relacoes] = await Promise.all([
        sgceGet('torneios?select=id,nome,status&order=nome.asc'),
        sgceGet('modalidades?select=id,nome'),
        sgceGet('torneio_modalidades?select=torneio_id,modalidade_id')
      ]);

      const modalidadesMap = new Map(modalidades.map(m => [String(m.id), m.nome]));
      selectTorneio.innerHTML = '<option value="">Selecione uma competição</option>';

      torneios
        .filter(t => !['encerrado', 'cancelado'].includes(t.status))
        .forEach(torneio => {
          const relacao = relacoes.find(r => String(r.torneio_id) === String(torneio.id));
          const modalidade = modalidadesMap.get(String(relacao?.modalidade_id)) || 'Modalidade';
          const option = document.createElement('option');
          option.value = torneio.id;
          option.textContent = `${torneio.nome} - ${modalidade}`;
          selectTorneio.appendChild(option);
        });

      const torneioUrl = new URLSearchParams(location.search).get('torneio_id');
      if (torneioUrl && [...selectTorneio.options].some(o => o.value === torneioUrl)) {
        selectTorneio.value = torneioUrl;
      }
    } catch (erro) {
      console.error(erro);
      selectTorneio.innerHTML = '<option value="">Erro ao carregar competições</option>';
      mostrarMensagem('Não foi possível carregar as competições do Supabase.', 'erro');
    }
  }

  function coletarJogadores() {
    const nomes = [...form.querySelectorAll('[name="jogador_nome[]"]')];
    const nascimentos = [...form.querySelectorAll('[name="jogador_nascimento[]"]')];
    const documentos = [...form.querySelectorAll('[name="jogador_documento[]"]')];
    const telefones = [...form.querySelectorAll('[name="jogador_telefone[]"]')];
    const numeros = [...form.querySelectorAll('[name="jogador_numero[]"]')];

    return nomes.map((input, i) => ({
      nome: input.value.trim(),
      data_nascimento: nascimentos[i]?.value || '',
      documento: documentos[i]?.value.trim() || '',
      telefone: telefones[i]?.value.trim() || '',
      numero: numeros[i]?.value || ''
    }));
  }

  botaoAdicionar.addEventListener('click', () => {
    limparMensagem();
    adicionarJogador();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    limparMensagem();

    const jogadores = coletarJogadores();
    const torneioId = Number(selectTorneio.value);

    if (!torneioId) {
      mostrarMensagem('Selecione uma competição.', 'erro');
      return;
    }

    if (!jogadores.length || jogadores.some(j => !j.nome)) {
      mostrarMensagem('Preencha o nome de todos os jogadores.', 'erro');
      return;
    }

    const payload = {
      tecnico: {
        nome: document.getElementById('nome').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefone: document.getElementById('telefone').value.trim()
      },
      equipe: {
        nome: document.getElementById('nome_equipe').value.trim(),
        categoria: document.getElementById('categoria').value
      },
      torneio_id: torneioId,
      grupo: selectGrupo?.value || '',
      jogadores
    };

    botaoCadastrar.disabled = true;
    const textoOriginal = botaoCadastrar.innerHTML;
    botaoCadastrar.textContent = 'Cadastrando...';

    try {
      const resultado = await sgceRpc('registrar_equipe_publica', { p_dados: payload });
      mostrarMensagem(`Equipe cadastrada com sucesso. Grupo: ${resultado?.grupo || 'definido automaticamente'}.`, 'sucesso');

      form.reset();
      [...listaJogadores.querySelectorAll('.jogador')].slice(1).forEach(j => j.remove());
      const primeiro = listaJogadores.querySelector('.jogador');
      primeiro?.querySelectorAll('input').forEach(i => i.value = '');
      renumerarJogadores();

      setTimeout(() => {
        location.href = `tabela.html?torneio_id=${torneioId}`;
      }, 900);
    } catch (erro) {
      console.error(erro);
      mostrarMensagem(erro.message, 'erro');
    } finally {
      botaoCadastrar.disabled = false;
      botaoCadastrar.innerHTML = textoOriginal;
    }
  });

  await carregarTorneios();
});
