document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = '<h3>Carregado</h3>';

  const buttons = document.querySelectorAll('button[data-action]');

  const actions = {
    welcome() {
      app.innerHTML = '<h3>Início</h3>';
    },
    hub() {
      app.innerHTML = '<h3>Mapa de Casos</h3>';
    },
    parents() {
      app.innerHTML = '<h3>Painel dos Pais</h3>';
    },
    reset() {
      app.innerHTML = '';
    }
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      (actions[action] || (() => {
        app.innerHTML = `<h3>${action}</h3>`;
      }))();
    });
  });
});
