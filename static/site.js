document.addEventListener('DOMContentLoaded', () => {
  const botaoMenu = document.querySelector('.menu-mobile');
  const menu = document.querySelector('.navegacao');

  if (!botaoMenu || !menu) return;

  function fecharMenu() {
    menu.classList.remove('navegacao-aberta');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
  }

  botaoMenu.addEventListener('click', () => {
    const aberto = menu.classList.toggle('navegacao-aberta');
    botaoMenu.setAttribute('aria-expanded', String(aberto));
    botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  });

  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', fecharMenu));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('navegacao-aberta')) {
      fecharMenu();
      botaoMenu.focus();
    }
  });
});
