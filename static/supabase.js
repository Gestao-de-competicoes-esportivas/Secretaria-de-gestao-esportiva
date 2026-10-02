const SGCE_SUPABASE_URL = 'https://tnenollrrmwxpbsdkevz.supabase.co';
const SGCE_SUPABASE_KEY = 'sb_publishable_eudls2KFroh4dZ_sPPDCHg_V0wWddTw';
const SGCE_REST_URL = `${SGCE_SUPABASE_URL}/rest/v1`;

const SGCE_HEADERS = {
  apikey: SGCE_SUPABASE_KEY,
  'Content-Type': 'application/json'
};

async function sgceGet(endpoint) {
  const resposta = await fetch(`${SGCE_REST_URL}/${endpoint}`, {
    method: 'GET',
    headers: SGCE_HEADERS
  });

  let dados = null;
  try { dados = await resposta.json(); } catch { dados = null; }

  if (!resposta.ok) {
    throw new Error(dados?.message || dados?.details || 'Erro ao consultar o Supabase.');
  }

  return dados || [];
}

async function sgceRpc(funcao, parametros) {
  const resposta = await fetch(`${SGCE_REST_URL}/rpc/${funcao}`, {
    method: 'POST',
    headers: SGCE_HEADERS,
    body: JSON.stringify(parametros)
  });

  let dados = null;
  try { dados = await resposta.json(); } catch { dados = null; }

  if (!resposta.ok) {
    throw new Error(dados?.message || dados?.details || 'Não foi possível concluir a operação.');
  }

  return dados;
}
