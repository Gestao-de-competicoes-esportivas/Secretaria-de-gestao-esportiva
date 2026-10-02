const ADMIN_SUPABASE_URL = 'https://tnenollrrmwxpbsdkevz.supabase.co';
const ADMIN_SUPABASE_KEY = 'sb_publishable_eudls2KFroh4dZ_sPPDCHg_V0wWddTw';
const adminClient = window.supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_KEY);

const form = document.getElementById('form-login');
const mensagem = document.getElementById('mensagem');
const botao = document.getElementById('btn-login');

function mostrar(texto, tipo='erro') {
  mensagem.textContent = texto;
  mensagem.className = `mensagem mostrar ${tipo}`;
}

async function validarAdmin(userId) {
  const { data, error } = await adminClient
    .from('admins')
    .select('user_id,nome')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

(async () => {
  const { data: { session } } = await adminClient.auth.getSession();
  if (session?.user && await validarAdmin(session.user.id)) {
    location.replace('painel.html');
  }
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  mensagem.className = 'mensagem';
  botao.disabled = true;
  botao.textContent = 'Entrando...';

  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('senha').value;

    const { data, error } = await adminClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const admin = await validarAdmin(data.user.id);
    if (!admin) {
      await adminClient.auth.signOut();
      throw new Error('Esta conta não possui permissão de administrador.');
    }

    mostrar('Login realizado. Abrindo painel...', 'sucesso');
    location.replace('painel.html');
  } catch (erro) {
    console.error(erro);
    mostrar(erro.message || 'Não foi possível entrar.');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
});
