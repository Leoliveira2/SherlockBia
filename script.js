// script.js
// =====================================
// Module: StorageManager - Gerencia o localStorage
// =====================================
class StorageManager {
  static KEY = 'sbia_state_v1_9'; // Updated key for new version with randomness

  static defaultState() {
    return {
      user: { name: 'Bia', level: 1, points: 0, coins: 0, medals: [], settings: { largeFont: false, narration: false } },
      sessions: {},
      week: new Date().toISOString().slice(0, 10)
    };
  }

  static load() {
    try {
      const stored = localStorage.getItem(StorageManager.KEY);
      return stored ? JSON.parse(stored) : StorageManager.defaultState();
    } catch (e) {
      console.error('Falha ao carregar estado do localStorage:', e);
      return StorageManager.defaultState();
    }
  }

  static save(state) {
    try {
      localStorage.setItem(StorageManager.KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Falha ao salvar estado no localStorage:', e);
    }
  }
}

// =====================================
// Module: Utils - Funções de Utilidade Geral
// =====================================
class Utils {
  static fmtTime(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  static getCase(id) {
    return Data.CASES.find(c => c.id === id);
  }

  static addToast(txt, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${txt}</span>`;
    container.appendChild(t);

    t.offsetHeight;
    t.classList.add('show');

    setTimeout(() => {
      t.classList.remove('show');
      t.addEventListener('transitionend', () => t.remove());
    }, 2200);
  }

  static showCustomModal(title, message, optionsHtml, inputType = 'none') {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-modal');
      const modalTitle = document.getElementById('modal-title');
      const modalMessage = document.getElementById('modal-message');
      const modalInput = document.getElementById('modal-input');
      const modalOptions = document.getElementById('modal-options');

      modalTitle.textContent = title;
      modalMessage.innerHTML = message;
      modalOptions.innerHTML = optionsHtml;

      if (inputType === 'text') {
        modalInput.style.display = 'block';
        modalInput.value = '';
        modalInput.focus();
      } else {
        modalInput.style.display = 'none';
      }

      modal.classList.add('show');

      const handleModalClick = (e) => {
        if (e.target.dataset.value) {
          modal.classList.remove('show');
          modalOptions.removeEventListener('click', handleModalClick);
          resolve(e.target.dataset.value);
        } else if (e.target.id === 'modal-confirm-input') {
          modal.classList.remove('show');
          modalOptions.removeEventListener('click', handleModalClick);
          resolve(modalInput.value);
        } else if (e.target.id === 'modal-cancel-input' || e.target.dataset.action === 'cancel-modal') {
          modal.classList.remove('show');
          modalOptions.removeEventListener('click', handleModalClick);
          resolve(null);
        }
      };
      modalOptions.addEventListener('click', handleModalClick);
    });
  }

  static showConfirmationModal(message) {
    const options = `<button class="btn pri" data-value="true">Confirmar</button><button class="btn" data-value="false">Cancelar</button>`;
    return Utils.showCustomModal('🚨 Confirmar Ação', message, options);
  }

  static showPromptModal(title, message, placeholder = '') {
    const options = `<button class="btn pri" id="modal-confirm-input">Ok</button><button class="btn" id="modal-cancel-input">Cancelar</button>`;
    const originalInputDisplay = document.getElementById('modal-input').style.display;
    document.getElementById('modal-input').placeholder = placeholder;
    const promise = Utils.showCustomModal(title, message, options, 'text');
    promise.finally(() => {
        document.getElementById('modal-input').style.display = originalInputDisplay;
    });
    return promise;
  }

  static showOptionsModal(title, message, optionsArray, cancelable = true) {
    let optionsHtml = optionsArray.map((opt, idx) => `<button class="btn" data-value="${opt.value !== undefined ? opt.value : opt.label}">${opt.label}</button>`).join('');
    if (cancelable) {
        optionsHtml += `<button class="btn ghost" data-action="cancel-modal">Cancelar</button>`;
    }
    return Utils.showCustomModal(title, message, optionsHtml);
  }

  static showDialogueModal(title, message, options) {
    const optionsHtml = options.map((opt, idx) => `<button class="btn" data-value="${idx}">${opt.label}</button>`).join('');
    return Utils.showCustomModal(title, message, optionsHtml + `<button class="btn ghost" data-action="cancel-modal">Sair</button>`);
  }

  static showAccusationModal(caseData) {
    const suspectsHtml = caseData.suspects.map(s => `<button class="btn" data-value="${s.id}">${s.name}</button>`).join('');
    return Utils.showCustomModal('⚖️ Acusar Suspeito', 'Quem você acusa?', suspectsHtml + `<button class="btn ghost" data-action="cancel-modal">Cancelar</button>`);
  }

  static async showInventoryModal(caseData, session) {
    const cluesFound = session.clues || [];
    const cluesListHtml = cluesFound
      .map(clueId => {
        const clue = caseData.clues.find(c => c.id === clueId);
        if (clue && !clue.isHiddenHotspot) {
          const icon = clue.hs && clue.hs.icon ? clue.hs.icon : '&#x1F4D9;';
          return `<li style="text-align: left; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.2em;">${icon}</span>
                    <span><strong>${clue.text}</strong>${clue.weight ? ` <span class="small" style="white-space: nowrap;">(Peso: ${clue.weight})</span>` : ''}</span>
                  </li>`;
        }
        return '';
      })
      .join('') || '<li style="text-align: center;" class="small">Nenhuma pista encontrada ainda...</li>';

    const essentialClues = caseData.clues.filter(clue => !clue.isHiddenHotspot);
    const essentialCluesFound = essentialClues.filter(clue => cluesFound.includes(clue.id));

    const contentHtml = `
      <div style="text-align: center;">
        <p style="font-size: 1.1rem; margin-bottom: 15px;">Você encontrou ${essentialCluesFound.length} de ${essentialClues.length} pistas essenciais!</p>
        <ul style="list-style-type: none; padding: 0; max-height: 200px; overflow-y: auto; text-align: center;">
          ${cluesListHtml}
        </ul>
      </div>
    `;

    return Utils.showCustomModal(
      '🎒 Seu Inventário de Pistas',
      contentHtml,
      `<button class="btn pri" data-value="close">Fechar</button>`
    );
  }

  static async showPowerUpsModal(currentUserCoins) {
    let powerUpsListHtml = '<ul style="list-style-type: none; padding: 0;">';
    for (const puId in Data.POWER_UPS) {
      const pu = Data.POWER_UPS[puId];
      const canAfford = currentUserCoins >= pu.cost;
      powerUpsListHtml += `
        <li style="text-align: left; margin-bottom: 15px; border: 1px solid var(--line); padding: 10px; border-radius: 8px; background: var(--panel);">
          <strong>${pu.name}</strong> (${pu.cost} 🪙 moedas)
          <p style="font-size: 0.9em; color: var(--muted); margin-top: 5px; margin-bottom: 10px;">${pu.description}</p>
          <button class="btn ${canAfford ? 'pri' : ''}" data-action="purchase-powerup" data-value="${puId}" ${!canAfford ? 'disabled' : ''}>
            ${canAfford ? 'Comprar e Ativar' : 'Moedas Insuficientes'}
          </button>
        </li>
      `;
    }
    powerUpsListHtml += '</ul>';

    return Utils.showCustomModal(
      '✨ Power-Ups',
      powerUpsListHtml,
      `<button class="btn ghost" data-action="cancel-modal">Voltar</button>`
    );
  }
}

// =====================================
// Module: Data - Definições de Casos e Cenários
// =====================================
class Data {
  static CASES = [
    {
      id: 'c-001', title: 'O Relógio da Escola', chapter: 1, difficulty: 1,
      intro: 'O relógio da escola sumiu minutos antes do sinal. Quem pegou?',
      suspects: [
        { id: 'zico', name: 'Zico', traits: ['brincalhão'] },
        { id: 'lia', name: 'Lia', traits: ['perfeccionista'] },
        { id: 'nara', name: 'Dona Nara', traits: ['zelosa'] }
      ],
      solution: 'zico',
      clues: [
        { id: 'k1', text: 'Marca de graxa na porta', weight: 2, hs: { x: 8, y: 50, w: 22, h: 16, icon: '&#x1F527;' }, requiresReveal: true },
        { id: 'k2', text: 'Bilhete rasgado com a letra Z', weight: 1, requires: 'cipher', cipherText: 'Qeb troféu foi movido', hs: { x: 64, y: 28, w: 22, h: 16, icon: '&#x1F4DD;' } },
        { id: 'k3', text: 'Chave velha com etiqueta "Manutenção"', weight: 3, requires: 'pattern', patternSeq: [2, 4, 7, 11, 16], patternAnswer: 22, patternHint: '+2,+3,+4,+5...', hs: { x: 40, y: 70, w: 20, h: 16, icon: '&#x1F5DD;' }, patternOptions: [18, 20, 22, 24] },
        { id: 'z_conf', text: 'Confissão parcial de Zico', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "zico": {
          start: "z1",
          nodes: {
            "z1": {
              text: "Eu? Pegar o relógio? Só estava correndo…",
              options: [
                { label: "Perguntar sobre a graxa na porta", next: "z2", effect: { award: "z_conf", revealHotspot: "k1" } },
                { label: "Onde você estava às 10:10?", next: "z3" }
              ]
            },
            "z2": {
              text: "Tá… fui olhar a sala da manutenção. Tentei consertar o relógio.",
              options: [{ label: "Você mexeu no relógio?", next: "z4", effect: { award: "z_conf" } }]
            },
            "z3": { text: "Na Educação Física! Pergunta pra Lia.", options: [{ label: "Voltar", next: "z1" }] },
            "z4": { text: "Eu só queria ajudar! Não roubei nada.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "lia": {
          start: "l1",
          nodes: {
            "l1": {
              text: "Eu gosto de tudo certinho. Se o relógio sumiu, alguém bagunçou.",
              options: [{ label: "Viu alguém no corredor?", next: "l2" }, { label: "Tinha bilhete no quadro?", next: "l3" }]
            },
            "l2": { text: "Vi o Zico saindo da manutenção com as mãos sujas.", options: [{ label: "Encerrar", end: true }] },
            "l3": { text: "Tinha um bilhete rasgado… com a letra Z.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: corredor principal, porta da manutenção e quadro de avisos.',
      scene: 'corridor'
    },
    {
      id: 'c-002', title: 'O Mistério do Bolo', chapter: 1, difficulty: 2,
      intro: 'O bolo da diretora foi trocado por um de areia!',
      suspects: [
        { id: 'nino', name: 'Nino', traits: ['arteiro'] },
        { id: 'bia2', name: 'Bia 2', traits: ['curiosa'] },
        { id: 'teo', name: 'Chef Téo', traits: ['cozinheiro'] }
      ],
      solution: 'nino',
      clues: [
        { id: 'b1', text: 'Migalhas coloridas no chão', weight: 2, hs: { x: 30, y: 74, w: 20, h: 14, icon: '&#x1F36E;' } },
        { id: 'b2', text: 'Foto borrada de alguém na cozinha', weight: 2, requires: 'cipher', cipherText: 'Cozinha suja de farinha', hs: { x: 62, y: 30, w: 24, h: 16, icon: '&#x1F4F8;' } },
        { id: 'b3', text: 'Luvas pequenas atrás do palco', weight: 3, requires: 'pattern', patternSeq: [1, 2, 4, 8, 16], patternAnswer: 32, patternHint: 'Multiplicação por 2', hs: { x: 10, y: 50, w: 22, h: 16, icon: '&#x1F9E4;' }, patternOptions: [24, 28, 32, 36] }
      ],
      dialogues: {
        "nino": {
          start: "n1", nodes: {
            "n1": {
              text: "Eu? Nunca! Mas areia é engraçada, né?",
              options: [{ label: "Isso é uma confissão?", next: "n2" }, { label: "Onde você estava?", next: "n3" }]
            },
            "n2": { text: "Tá, eu troquei… era só uma brincadeira!", options: [{ label: "Encerrar", end: true }] },
            "n3": { text: "Eu estava na quadra. Pergunta pro Téo.", options: [{ label: "Voltar", next: "n1" }] }
          }
        },
        "teo": {
          start: "t1", nodes: {
            "t1": { text: "Na minha cozinha? Só com autorização!", options: [{ label: "Viu alguém?", next: "t2" }] },
            "t2": { text: "Um garoto pequeno com luvas…", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: salão de festas com cozinha ao fundo.',
      scene: 'kitchen'
    },
    {
      id: 'c-003', title: 'O Troféu Desaparecido', chapter: 2, difficulty: 3,
      intro: 'O troféu da olimpíada escolar sumiu da vitrine.',
      suspects: [
        { id: 'mara', name: 'Mara', traits: ['competitiva'] },
        { id: 'gui', name: 'Gui', traits: ['distraído'] },
        { id: 'jorge', name: 'Jorge', traits: ['zelador'] }
      ],
      solution: 'mara',
      clues: [
        { id: 't1', text: 'Pegada com sola em estrela', weight: 2, hs: { x: 74, y: 70, w: 20, h: 16, icon: '&#x1F463;' } },
        { id: 't2', text: 'Mapa com um X na quadra', weight: 2, requires: 'pattern', patternSeq: [100, 50, 25, 12.5], patternAnswer: 6.25, patternHint: 'Divisão por 2', hs: { x: 10, y: 28, w: 22, h: 16, icon: '&#x1F5FA;' }, patternOptions: [5, 6.25, 7.5, 10] },
        { id: 't3', text: 'Bilhete cifrado "Qeb troféu..."', weight: 3, requires: 'cipher', cipherText: 'Wkh wurohx zdv pdqdjhg', hs: { x: 46, y: 38, w: 22, h: 16, icon: '&#x1F4DD;' } }
      ],
      dialogues: {
        "mara": {
          start: "m1", nodes: {
            "m1": {
              text: "Se eu tivesse o troféu, mostraria!",
              options: [{ label: "Sobre a pegada de estrela", next: "m2" }, { label: "Quem tem acesso à vitrine?", next: "m3" }]
            },
            "m2": { text: "Tênis novos. Posso ter passado por lá…", options: [{ label: "Encerrar", end: true }] },
            "m3": { text: "Só o Jorge e a diretora. Eu não.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: saguão da escola com vitrine de troféus.',
      scene: 'hall'
    },
    {
      id: 'c-004', title: 'A Chave da Biblioteca Perdida', chapter: 2, difficulty: 2,
      intro: 'A chave mestra da biblioteca sumiu. Onde ela foi parar?',
      suspects: [
        { id: 'ana', name: 'Ana', traits: ['distraída'] },
        { id: 'caio', name: 'Professor Caio', traits: ['zeloso'] },
        { id: 'rosa', name: 'Dona Rosa', traits: ['organizada'] }
      ],
      solution: 'caio',
      clues: [
        { id: 'l1', text: 'Livro com anotações sobre a chave', weight: 2, hs: { x: 15, y: 40, w: 20, h: 16, icon: '&#x1F4DA;' } },
        { id: 'l2', text: 'Bilhete cifrado sobre o livro', weight: 3, requires: 'cipher', cipherText: 'Fqhu zlv qd elhqd', hs: { x: 60, y: 25, w: 24, h: 18, icon: '&#x1F4DD;' } },
        { id: 'l3', text: 'Criptograma no pedestal', weight: 2, requires: 'pattern', patternSeq: [1, 3, 6, 10, 15], patternAnswer: 21, patternHint: '+2,+3,+4,+5...', hs: { x: 80, y: 60, w: 20, h: 16, icon: '&#x1F5D2;' }, patternOptions: [18, 20, 21, 23] },
        { id: 'caio_conf', text: 'Confissão parcial do Professor Caio', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "ana": {
          start: "a1", nodes: {
            "a1": {
              text: "Eu estava aqui. Tentei arrumar os livros mas me perdi. Acho que deixei a chave em algum lugar...",
              options: [{ label: "Onde você a deixou?", next: "a2" }, { label: "Viu alguém estranho?", next: "a3" }]
            },
            "a2": { text: "Pode estar em algum livro ou no pedestal.", options: [{ label: "Encerrar", end: true }] },
            "a3": { text: "Vi o Professor Caio olhando o pedestal.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "caio": {
          start: "c1", nodes: {
            "c1": {
              text: "Estava verificando os livros de ciência. Aquela chave... não era minha.",
              options: [{ label: "Onde você a pegou?", next: "c2" }, { label: "Por que você a escondeu?", next: "c3", requiresReveal: 'l1' }]
            },
            "c2": { text: "Encontrei no chão. Achei que era uma pista para um desafio da gincana.", options: [{ label: "Encerrar", end: true }] },
            "c3": { text: "Escondi a chave atrás do livro 'Mistérios da Biologia'. Não queria que ninguém a pegasse. Pensei que era um jogo.", options: [{ label: "Voltar", next: "c1", effect: { award: "caio_conf" } }] }
          }
        }
      },
      description: 'Cena: biblioteca escolar com estantes e um pedestal no centro.',
      scene: 'library'
    },
    {
      id: 'c-005', title: 'O Tesouro do Jardim', chapter: 3, difficulty: 3,
      intro: 'Uma caixa de tesouro da diretora, cheia de moedas de chocolate, foi escondida no jardim.',
      suspects: [
        { id: 'lucas', name: 'Lucas', traits: ['jardineiro'] },
        { id: 'mariana', name: 'Mariana', traits: ['competitiva'] },
        { id: 'joao', name: 'João', traits: ['calmo'] }
      ],
      solution: 'joao',
      clues: [
        { id: 'g1', text: 'Pá com terra diferente', weight: 2, hs: { x: 78, y: 75, w: 20, h: 16, icon: '&#x1F530;' } },
        { id: 'g2', text: 'Bilhete rasgado com uma pista', weight: 3, requiresReveal: true, hs: { x: 18, y: 55, w: 20, h: 16, icon: '&#x1F4DD;' } },
        { id: 'g3', text: 'Caixa de madeira com um padrão', weight: 3, requires: 'pattern', patternSeq: [5, 10, 15, 20, 25], patternAnswer: 30, patternHint: 'Multiplicação de 5', hs: { x: 50, y: 40, w: 20, h: 16, icon: '&#x1F4E6;' }, patternOptions: [28, 30, 32, 35] },
        { id: 'joao_conf', text: 'Confissão de João', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "lucas": {
          start: "l1", nodes: {
            "l1": {
              text: "Eu estava cuidando das plantas, não vi nada. Mas alguém mexeu na minha pá.",
              options: [{ label: "Onde?", next: "l2", effect: { revealHotspot: "g2" } }, { label: "Quem estava no jardim?", next: "l3" }]
            },
            "l2": { text: "No canteiro de flores. Encontrei um bilhete que estava enterrado ali.", options: [{ label: "Onde está o bilhete?", next: "l4" }] },
            "l3": { text: "Vi o João por perto, ele gosta de coisas escondidas.", options: [{ label: "Encerrar", end: true }] },
            "l4": { text: "Eu o rasguei, mas posso te dar um pedaço. Estava escrito 'próximo ao...', não lembro mais.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "joao": {
          start: "j1", nodes: {
            "j1": {
              text: "O tesouro? Foi só uma brincadeira. Eu só queria ver se alguém era esperto o suficiente pra achar. Está na quadra de basquete.",
              options: [{ label: "Por que você o escondeu?", next: "j2", effect: { award: "joao_conf" } }]
            },
            "j2": { text: "Só queria que todos participassem da caça ao tesouro!", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: jardim escolar com flores, canteiro e uma pá.',
      scene: 'garden'
    },
    {
      id: 'c-006', title: 'O Livro de Magia Sumiu', chapter: 3, difficulty: 4,
      intro: 'O livro de feitiços de brinquedo da sala de artes desapareceu. Quem o levou?',
      suspects: [
        { id: 'gabi', name: 'Gabi', traits: ['sonhadora'] },
        { id: 'leo', name: 'Leo', traits: ['cético'] },
        { id: 'arthur', name: 'Professor Arthur', traits: ['brincalhão'] }
      ],
      solution: 'gabi',
      clues: [
        { id: 'm1', text: 'Resíduo de pó mágico no chão', weight: 2, hs: { x: 25, y: 70, w: 20, h: 16, icon: '&#x1F4D9;' } },
        { id: 'm2', text: 'Nota com instruções de feitiço', weight: 3, requires: 'cipher', cipherText: 'Vw rwd qhdwv vwrslwv', hs: { x: 70, y: 30, w: 24, h: 18, icon: '&#x1F4DD;' } },
        { id: 'm3', text: 'Cristais com uma sequência de cores', weight: 3, requires: 'pattern', patternSeq: [1, 1, 2, 3, 5, 8], patternAnswer: 13, patternHint: 'Sequência de Fibonacci', hs: { x: 45, y: 55, w: 22, h: 16, icon: '&#x1F52E;' }, patternOptions: [11, 12, 13, 14] },
        { id: 'gabi_conf', text: 'Confissão de Gabi', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "gabi": {
          start: "g1", nodes: {
            "g1": {
              text: "O livro? Eu só o levei emprestado para praticar a magia em casa. Não achei que fosse sumir de verdade. Ele está na sala dos professores.",
              options: [{ label: "Você viu alguém lá?", next: "g2", effect: { award: "gabi_conf" } }, { label: "Onde você o escondeu?", next: "g3" }]
            },
            "g2": { text: "Eu estava sozinha.", options: [{ label: "Encerrar", end: true }] },
            "g3": { text: "Achei que o Professor Arthur ia gostar. Deixei perto da mesa dele.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "leo": {
          start: "l1", nodes: {
            "l1": {
              text: "Mágica não existe. Alguém só o pegou para fazer uma brincadeira.",
              options: [{ label: "Você sabe quem?", next: "l2" }, { label: "Como você sabe que é uma brincadeira?", next: "l3" }]
            },
            "l2": { text: "Vi a Gabi na sala depois da aula.", options: [{ label: "Encerrar", end: true }] },
            "l3": { text: "O pó de purpurina no chão mostra que é só diversão.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: sala de artes com um baú de tesouro e um quadro de anotações.',
      scene: 'magic_classroom'
    },
    {
      id: 'c-007', title: 'O Lanche Roubado', chapter: 4, difficulty: 1,
      intro: 'O lanche especial da professora sumiu da cantina antes do recreio.',
      suspects: [
        { id: 'pedro', name: 'Pedro', traits: ['comilão'] },
        { id: 'lara', name: 'Lara', traits: ['organizada'] },
        { id: 'chef_rita', name: 'Chef Rita', traits: ['distraída'] }
      ],
      solution: 'pedro',
      clues: [
        { id: 'ln1', text: 'Embalagem de biscoito vazia', weight: 2, hs: { x: 10, y: 70, w: 20, h: 14, icon: '&#x1F36A;' }, requiresReveal: true },
        { id: 'ln2', text: 'Recibo rasgado do lanche', weight: 1, requires: 'cipher', cipherText: 'Cdwld jdufld ehpehp', hs: { x: 80, y: 25, w: 15, h: 10, icon: '&#x1F4DD;' } },
        { id: 'ln3', text: 'Mancha de molho na mesa', weight: 3, hs: { x: 45, y: 60, w: 25, h: 18, icon: '&#x1F9C8;' } },
        { id: 'pedro_conf', text: 'Confissão de Pedro', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "pedro": {
          start: "p1", nodes: {
            "p1": {
              text: "Lanche? Que lanche? Eu só estava com muita fome…",
              options: [
                { label: "Sobre a embalagem de biscoito", next: "p2", effect: { award: "pedro_conf", revealHotspot: "ln1" } },
                { label: "Onde você estava?", next: "p3" }
              ]
            },
            "p2": {
              text: "Ah, essa! Estava no chão, eu só joguei fora. Não peguei nada do lanche da professora.",
              options: [{ label: "Você pegou o lanche?", next: "p4", effect: { award: "pedro_conf" } }]
            },
            "p3": { text: "Estava na quadra. A Lara me viu lá.", options: [{ label: "Voltar", next: "p1" }] },
            "p4": { text: "Tá bom, eu peguei. Estava muito cheiroso e eu não resisti. Desculpe!", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "lara": {
          start: "la1", nodes: {
            "la1": {
              text: "Eu organizo a cantina todos os dias. O lanche estava lá, depois sumiu. Vi o Pedro por perto.",
              options: [{ label: "O que o Pedro estava fazendo?", next: "la2" }]
            },
            "la2": { text: "Ele estava rondando a mesa de lanches com um olhar suspeito.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "chef_rita": {
          start: "cr1", nodes: {
            "cr1": {
              text: "Meu lanche! Estava pronto para o recreio. Alguém deve ter pego. Não vi ninguém.",
              options: [{ label: "Verificou o recibo?", next: "cr2" }]
            },
            "cr2": { text: "Sim, estava rasgado no lixo. Nem prestei atenção na hora.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: cantina da escola com mesas e balcão de lanches.',
      scene: 'canteen'
    },
    {
      id: 'c-008', title: 'A Mensagem Secreta', chapter: 4, difficulty: 3,
      intro: 'Uma mensagem importante sobre a peça da escola foi enviada, mas ninguém consegue decifrá-la.',
      suspects: [
        { id: 'theo', name: 'Theo', traits: ['programador'] },
        { id: 'sofia', name: 'Sofia', traits: ['artista'] },
        { id: 'diretor', name: 'Diretor Silva', traits: ['ocupado'] }
      ],
      solution: 'theo',
      clues: [
        { id: 'ms1', text: 'Papel com código binário', weight: 2, hs: { x: 20, y: 40, w: 20, h: 16, icon: '&#x1F4BB;' } },
        { id: 'ms2', text: 'Chave de criptografia simples', weight: 3, requiresReveal: true, hs: { x: 75, y: 50, w: 15, h: 10, icon: '&#x1F511;' } },
        { id: 'ms3', text: 'Diagrama de fluxo estranho', weight: 2, requires: 'pattern', patternSeq: [1, 2, 6, 24, 120], patternAnswer: 720, patternHint: 'Multiplicando por 2, 3, 4, 5...', hs: { x: 45, y: 70, w: 25, h: 18, icon: '&#x1F4CA;' }, patternOptions: [600, 720, 840, 960] },
        { id: 'theo_conf', text: 'Confissão de Theo', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "theo": {
          start: "t1", nodes: {
            "t1": {
              text: "A mensagem? Ah, eu estava testando um novo algoritmo de criptografia. Não era para ser tão difícil.",
              options: [
                { label: "Você tem a chave?", next: "t2", effect: { award: "theo_conf", revealHotspot: "ms2" } },
                { label: "Por que você a fez?", next: "t3" }
              ]
            },
            "t2": {
              text: "A chave? Está em um post-it na minha mesa. Eu a deixei lá.",
              options: [{ label: "Você pode nos dar?", next: "t4", effect: { award: "theo_conf" } }]
            },
            "t3": { text: "Só queria um desafio. Sou bom em códigos.", options: [{ label: "Voltar", next: "t1" }] },
            "t4": { text: "Aqui está a chave. Foi divertido, mas acho que exagerei.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "sofia": {
          start: "s1", nodes: {
            "s1": {
              text: "Mensagens secretas? Que divertido! Eu estava desenhando novos figurinos. Não vi nada.",
              options: [{ label: "Você viu alguém na sala de informática?", next: "s2" }]
            },
            "s2": { text: "O Theo estava lá o dia todo, digitando muito rápido.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "diretor": {
          start: "d1", nodes: {
            "d1": {
              text: "Essa mensagem está atrasando tudo! Não entendo nada de códigos.",
              options: [{ label: "Alguém poderia ter feito isso de propósito?", next: "d2" }]
            },
            "d2": { text: "Não sei, talvez. Mas precisamos da mensagem decifrada logo!", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: sala de informática com computadores e quadros.',
      scene: 'computer_lab'
    },
    {
      id: 'c-009', title: 'O Instrumento Desafinado', chapter: 5, difficulty: 4,
      intro: 'O violino principal da orquestra escolar foi sabotado antes da apresentação.',
      suspects: [
        { id: 'clara', name: 'Clara', traits: ['ciumenta'] },
        { id: 'raul', name: 'Raul', traits: ['desorganizado'] },
        { id: 'maestro', name: 'Maestro Silva', traits: ['rigoroso'] }
      ],
      solution: 'clara',
      clues: [
        { id: 'id1', text: 'Cera de vela no estojo', weight: 2, hs: { x: 30, y: 70, w: 20, h: 14, icon: '&#x1F56F;' } },
        { id: 'id2', text: 'Partitura com anotações estranhas', weight: 3, requires: 'cipher', cipherText: 'Xfhv duh rswlplvwlf', hs: { x: 60, y: 35, w: 25, h: 18, icon: '&#x1F3BC;' }, requiresReveal: true },
        { id: 'id3', text: 'Marca de sapato no tapete do palco', weight: 2, requires: 'pattern', patternSeq: [1, 4, 9, 16, 25], patternAnswer: 36, patternHint: 'Números ao quadrado', hs: { x: 50, y: 55, w: 20, h: 16, icon: '&#x1F462;' }, patternOptions: [30, 32, 36, 40] },
        { id: 'clara_conf', text: 'Confissão de Clara', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "clara": {
          start: "c1", nodes: {
            "c1": {
              text: "Eu queria o solo do violino. Não achei que fosse um problema... Desafinei algumas cordas.",
              options: [
                { label: "Por que você fez isso?", next: "c2", effect: { award: "clara_conf", revealHotspot: "id2" } },
                { label: "Você viu alguém perto do violino?", next: "c3" }
              ]
            },
            "c2": {
              text: "Eu estava frustrada. Achei que era a única forma de conseguir o solo. A partitura com minhas anotações está no palco.",
              options: [{ label: "Encerrar", end: true }]
            },
            "c3": { text: "O Raul estava lá, mexendo nas coisas, como sempre.", options: [{ label: "Voltar", next: "c1" }] }
          }
        },
        "raul": {
          start: "r1", nodes: {
            "r1": {
              text: "Eu sou meio desorganizado, mas não estragaria um violino. Estava procurando minha palheta.",
              options: [{ label: "Onde você procurou?", next: "r2" }]
            },
            "r2": { text: "Perto do estojo do violino. Vi umas manchas de cera estranhas lá.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "maestro": {
          start: "m1", nodes: {
            "m1": {
              text: "Inaceitável! O violino está desafinado. Quem faria uma coisa dessas?",
              options: [{ label: "Alguém tinha inveja do violinista?", next: "m2" }]
            },
            "m2": { text: "A Clara sempre quis o solo principal. Ela é muito competitiva.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: sala de música com instrumentos e um palco pequeno.',
      scene: 'music_room'
    }
  ];

  static SCENE_BACKGROUNDS = {
    'corridor': './assets/school_hallway_cartoon.png',
    'kitchen': './assets/kitchen_cartoon.png',
    'hall': './assets/hall_cartoon.png',
    'library': './assets/library_cartoon.png',
    'garden': './assets/garden_cartoon.png',
    'magic_classroom': './assets/magic_classroom_cartoon.png',
    'canteen': './assets/canteen_cartoon.png', // Caminho corrigido
    'computer_lab': './assets/computer_lab_cartoon.png', // Caminho corrigido
    'music_room': './assets/music_room_cartoon.png' // Caminho corrigido
  };

  static POWER_UPS = {
    'eagleVision': {
      id: 'eagleVision',
      name: 'Visão de Águia',
      description: 'Revele todos os locais de interesse na cena atual por 15 segundos.',
      cost: 5,
      duration: 15,
      type: 'active'
    }
  };

  static decodeCaesar(s, shift) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const portugueseAlphabet = 'ÁÂÃÀÉÊÍÓÔÕÚÇ';
    const fullAlphabet = alphabet + portugueseAlphabet;
    const fullAlphabetLower = fullAlphabet.toLowerCase();

    return s.split('').map(ch => {
      let charIndex = fullAlphabet.indexOf(ch);
      let isUpperCase = true;

      if (charIndex === -1) {
        charIndex = fullAlphabetLower.indexOf(ch);
        isUpperCase = false;
      }

      if (charIndex !== -1) {
        const currentAlphabet = isUpperCase ? fullAlphabet : fullAlphabetLower;
        const newIndex = (charIndex - shift + currentAlphabet.length) % currentAlphabet.length;
        return currentAlphabet[newIndex];
      }
      return ch;
    }).join('');
  }
}

// =====================================
// Module: GameState - Gerencia o estado do jogo
// =====================================
class GameState {
  constructor() {
    this._state = StorageManager.load();
    this.timerIntervalId = null;
  }

  getState() { return this._state; }
  setState(newState) { this._state = newState; StorageManager.save(this._state); }

  updateUser(updates) {
    this._state.user = { ...this._state.user, ...updates };
    StorageManager.save(this._state);
  }

  getSession(caseId) {
    return this._state.sessions[caseId] || null;
  }

  updateSession(caseId, updates) {
    if (!this._state.sessions[caseId]) {
      this._state.sessions[caseId] = {
        caseId, start: Date.now(), status: 'open',
        clues: [], errors: 0, hints: 0,
        sessionId: `session_${caseId}_${Date.now()}`,
        revealedHotspots: [],
        activeEffects: { eagleVision: { active: false, endTime: 0 } }
      };
    }
    this._state.sessions[caseId] = { ...this._state.sessions[caseId], ...updates };
    StorageManager.save(this._state);
  }

  startTimer(sessionId) {
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);

    const session = this._state.sessions[sessionId];
    if (!session || session.status === 'solved') {
      return;
    }

    this.timerIntervalId = setInterval(() => {
        const currentSession = this._state.sessions[sessionId];
        if (!currentSession || currentSession.status === 'solved') {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
            return;
        }

        const elapsed = Math.floor((Date.now() - currentSession.start) / 1000);
        currentSession.timeSpent = elapsed;

        if (currentSession.activeEffects.eagleVision.active && Date.now() >= currentSession.activeEffects.eagleVision.endTime) {
            currentSession.activeEffects.eagleVision.active = false;
            Utils.addToast('Visão de Águia desativada.', 'info');
            this.updateSession(sessionId, { activeEffects: currentSession.activeEffects });
            App.instance.uiManager.renderCase(Utils.getCase(sessionId), this.getState());
        }

        const tEl = document.getElementById('timer');
        if (tEl) tEl.textContent = Utils.fmtTime(elapsed);
    }, 1000);
  }

  stopTimer() {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }
}

// =====================================
// Module: UIManager - Gerencia a renderização da interface
// =====================================
class UIManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.appElement = document.getElementById('app');
  }

  render(html) {
    this.appElement.innerHTML = html;
  }

  safeRender(renderFn) {
    try {
      renderFn(this.gameState.getState());
    } catch (err) {
      console.error('Erro de renderização:', err);
      Utils.addToast('Ocorreu um erro ao carregar a tela. Tentando voltar ao hub.', 'danger');
      try {
        this.renderHub(this.gameState.getState());
      } catch (e2) {
        console.error('Falha ao retornar ao Hub:', e2);
        Utils.addToast('Erro grave! Por favor, recarregue a página.', 'danger');
      }
    }
  }

  renderWelcome(state) {
    this.render(`
      <div class="welcome">
        <div class="logo">🕵️‍♀️ Sherlock Bia</div>
        <p>Bem-vinda, <strong>${state.user.name}</strong>! Você está no nível <strong>${state.user.level}</strong>.</p>
        <div class="stats">
          <div class="stat">⭐ ${state.user.points} pontos</div>
          <div class="stat">🪙 ${state.user.coins} moedas</div>
          <div class="stat">🏆 ${state.user.medals.length} medalhas</div>
        </div>
        <div class="row" style="margin-top:20px">
          <button class="btn pri" data-action="start-game">🗺️ Começar Investigação</button>
          <button class="btn" data-action="go-parents">👪 Painel dos Pais</button>
        </div>
        <div class="row" style="margin-top:10px">
          <label class="switch" for="fontToggle">
            <input id="fontToggle" type="checkbox" data-action="toggle-font" ${state.user?.settings?.largeFont ? 'checked' : ''}>
            <span class="small">Fonte grande</span>
          </label>
        </div>
      </div>
    `);
  }

  renderHub(state) {
    // Shuffle the cases array for randomness each time the hub is rendered
    const shuffledCases = [...Data.CASES].sort(() => Math.random() - 0.5);

    const cards = shuffledCases.map(c => {
      const session = this.gameState.getSession(c.id);
      const stars = session?.result?.stars || 0;
      const isLocked = false; // Add logic here if you want to lock cases based on level or previous completion

      return `
        <div class="card ${isLocked ? 'locked' : ''}">
          <h3>${c.title}</h3>
          <div class="row">
            <span class="badge">Cap. ${c.chapter}</span>
            <span class="badge">Dif. ${c.difficulty}</span>
            ${stars > 0 ? `<span class="badge" style="color:var(--gold)">⭐ ${stars}</span>` : ''}
          </div>
          <p class="small">${c.intro}</p>
          <div class="row" style="margin-top:8px">
            ${isLocked ?
              '<button class="btn" disabled>🔒 Bloqueado</button>' :
              `<button class="btn pri" data-action="start-case" data-case-id="${c.id}">🔍 Investigar</button>`
            }
          </div>
        </div>
      `;
    }).join('');

    this.render(`
      <div class="grid">
        ${cards}
      </div>
      <div class="row" style="margin-top:16px; justify-content:center">
        <button class="btn" data-action="go-welcome">⟵ Voltar ao Início</button>
      </div>
    `);
  }

  renderCase(caseData, state) {
    let session = this.gameState.getSession(caseData.id);
    if (!session) {
      this.gameState.updateSession(caseData.id, {
          caseId: caseData.id,
          start: Date.now(),
          status: 'open',
          clues: [],
          errors: 0,
          hints: 0
      });
      session = this.gameState.getSession(caseData.id);
    }

    const currentSession = session;
    const cluesFound = currentSession.clues || [];
    const timeSpent = currentSession.timeSpent || (currentSession.start ? Math.floor((Date.now() - currentSession.start) / 1000) : 0);

    const essentialClues = caseData.clues.filter(clue => !clue.isHiddenHotspot);
    const essentialCluesFound = essentialClues.filter(clue => cluesFound.includes(clue.id));

    const suspectsList = caseData.suspects
      .map(suspect => `
        <button class="btn" data-action="talk-suspect" data-suspect-id="${suspect.id}" data-case-id="${caseData.id}">
          💬 ${suspect.name}
        </button>
      `).join('');

    const isEagleVisionActive = currentSession.activeEffects?.eagleVision?.active;
    const sceneClass = `scene ${isEagleVisionActive ? 'eagle-vision-active' : ''}`;

    this.render(`
      <div class="card">
        <h3>${caseData.title}</h3>
        <p>${caseData.intro}</p>
        <div class="stats">
          <div class="stat">⏱️ <b id="timer">${Utils.fmtTime(timeSpent)}</b></div>
          <div class="stat">🪙 ${state.user.coins} moedas</div>
          <div class="stat">❌ <b id="err">${currentSession.errors || 0}</b> erros</div>
        </div>
      </div>

      <div class="${sceneClass}">
        ${SceneRenderer.buildScene(caseData, currentSession)}
      </div>

      <div class="row" style="margin-top:8px">
        ${(caseData.clues || []).filter(k => !k.hs && !k.isHiddenHotspot).map(k => {
            const found = currentSession.clues.includes(k.id);
            return `<button class="btn" data-action="tap-clue" data-session-id="${currentSession.sessionId}" data-clue-id="${k.id}" data-case-id="${caseData.id}">${found ? '✔️' : '🔍'} ${k.text}</button>`
        }).join('')}
      </div>

      <hr>

      <div class="grid">
        <button class="card" data-action="open-inventory">
          <h3>🎒 Inventário de Pistas (${essentialCluesFound.length}/${essentialClues.length})</h3>
          <p class="small">Clique para ver suas pistas e itens coletados.</p>
        </button>
        <div class="card">
          <h3>👥 Interrogatórios</h3>
          <p class="small">Converse para obter pistas (respostas certas liberam itens).</p>
          <div class="row" style="flex-wrap:wrap; gap:8px">
            ${suspectsList}
          </div>
          <div class="row" style="margin-top:12px">
            <button class="btn pri" data-action="make-accusation" data-case-id="${caseData.id}" data-session-id="${currentSession.sessionId}">⚖️ Fazer Acusação</button>
          </div>
        </div>
      </div>

      <div class="row" style="margin-top:16px; justify-content:center">
        <button class="btn" data-action="go-hub">⟵ Voltar ao Mapa</button>
        <button class="btn ghost" data-action="give-hint" data-session-id="${currentSession.sessionId}">💡 Dica (−1 moeda)</button>
        <button class="btn" data-action="open-powerups">✨ Power-Ups</button>
      </div>
    `);
    this.gameState.startTimer(currentSession.sessionId);
  }

  renderResult(caseId, res) {
    this.render(`
      <div class="card">
        <h3>✅ Caso resolvido!</h3>
        <p>Pontuação: <b>${res.score}</b> • Estrelas: ${'⭐'.repeat(res.stars)}</p>
        <p class="small">Condições: ${res.allFound ? 'Todas as pistas; ' : ''}${res.clean ? 'sem erros/dicas; ' : ''}${res.fast ? 'rápido; ' : ''}</p>
        <div class="row">
          <button class="btn pri" data-action="go-hub">Concluir</button>
          <button class="btn" data-action="start-case" data-case-id="${caseId}">Rejogar</button>
        </div>
      </div>
    `);
    this.gameState.stopTimer();
  }

  renderParents(state) {
    const rows = Object.values(state.sessions).map(s => {
      const c = Utils.getCase(s.caseId) || { title: '(Caso removido)' };
      const t = s.timeSpent || (s.start ? Math.floor((Date.now() - s.start) / 1000) : 0);
      return `<tr><td>${new Date(s.start || Date.now()).toLocaleDateString()}</td><td>${c.title}</td><td>${s.status || 'open'}</td><td>${Utils.fmtTime(t)}</td><td>${s.errors || 0}</td><td>${s.hints || 0}</td><td>${s.result ? s.result.stars : '-'}</td></tr>`;
    }).join('') || `<tr><td colspan="7" class="small">Sem dados ainda…</td></tr>`;

    this.render(`
      <div class="card">
        <h3>👪 Painel dos Pais</h3>
        <div class="row" style="justify-content:space-between">
          <label class="switch" for="narToggle">
            <input id="narToggle" type="checkbox" data-action="toggle-narration" ${state.user?.settings?.narration ? 'checked' : ''}>
            <span class="small">Leitura em voz alta (mock)</span>
          </label>
          <label class="switch" for="fontToggle2">
            <input id="fontToggle2" type="checkbox" data-action="toggle-font" ${state.user?.settings?.largeFont ? 'checked' : ''}>
            <span class="small">Fonte grande</span>
          </label>
        </div>
        <table class="table" style="margin-top:8px">
          <tr><th>Data</th><th>Caso</th><th>Status</th><th>Tempo</th><th>Erros</th><th>Dicas</th><th>⭐</th></tr>
          ${rows}
        </table>
        <div class="row" style="margin-top:10px"><button class="btn" data-action="go-hub">⟵ Voltar</button></div>
      </div>
    `);
  }
}

// =====================================
// Module: SceneRenderer - Lógica de renderização de cenas
// =====================================
class SceneRenderer {
  static buildScene(caseData, session) {
    const sceneType = caseData.scene || 'corridor';
    const backgroundImage = Data.SCENE_BACKGROUNDS[sceneType] || './assets/placeholder_scene.png'; // Fallback to a generic local placeholder if type not found

    const isEagleVisionActive = session.activeEffects?.eagleVision?.active;

    const hotspots = caseData.clues
      .filter(clue => {
        if (!clue.hs || session.clues.includes(clue.id)) return false;

        if (isEagleVisionActive) {
            return true;
        }

        if (clue.requiresReveal) {
          return session.revealedHotspots && session.revealedHotspots.includes(clue.id);
        }

        return true;
      })
      .map(clue => {
        const { x, y, w, h, icon } = clue.hs;
        return `<div class="hotspot" style="left:${x}%; top:${y}%; width:${w}%; height:${h}%;"
                data-action="tap-clue" data-clue-id="${clue.id}" data-session-id="${session.sessionId}" data-case-id="${caseData.id}">${icon || '&#x1F50D;'}</div>`;
      }).join('');

    return `
        <img src="${backgroundImage}" alt="Cenário ${sceneType}" class="scene-background" onerror="this.src='./assets/placeholder_scene.png';" />
        ${SceneRenderer.buildSceneSVG(sceneType)}
        ${hotspots}
    `;
  }

  static buildSceneSVG(kind) {
    if (kind === 'corridor') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <rect x="180" y="80" width="180" height="170" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
          <rect x="790" y="50" width="300" height="150" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="12" opacity="0.5"/>
        </svg>
      `;
    }
    if (kind === 'kitchen') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <rect x="50" y="160" width="150" height="120" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="8" opacity="0.5"/>
          <ellipse cx="600" cy="210" rx="60" ry="25" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" opacity="0.5"/>
        </svg>
      `;
    }
    if (kind === 'library') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <rect x="100" y="50" width="250" height="300" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
          <rect x="750" y="50" width="250" height="300" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
        </svg>
      `;
    }
    if (kind === 'garden') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <path d="M50 350 Q 150 250, 300 350 T 600 350 T 900 350 T 1150 350" stroke="#93c5fd" stroke-width="2" fill="none" stroke-dasharray="5,5"/>
          <circle cx="200" cy="200" r="40" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5"/>
        </svg>
      `;
    }
    if (kind === 'magic_classroom') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <path d="M500 100 L600 200 L500 300 Z" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5"/>
          <rect x="100" y="100" width="200" height="200" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="15"/>
        </svg>
      `;
    }
    if (kind === 'canteen') {
        return `
            <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
                <rect x="100" y="150" width="150" height="80" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="5"/>
                <rect x="400" y="180" width="200" height="100" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="8"/>
            </svg>
        `;
    }
    if (kind === 'computer_lab') {
        return `
            <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
                <rect x="150" y="100" width="180" height="120" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="5"/>
                <rect x="650" y="120" width="200" height="140" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="8"/>
            </svg>
        `;
    }
    if (kind === 'music_room') {
        return `
            <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
                <circle cx="200" cy="250" r="60" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5"/>
                <rect x="700" y="100" width="150" height="200" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10"/>
            </svg>
        `;
    }

    return `
      <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
        <rect x="80" y="80" width="280" height="200" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
        <rect x="450" y="80" width="300" height="210" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="15" opacity="0.5"/>
      </svg>
    `;
  }
}

// =====================================
// Module: GameLogic - Contém a lógica central do jogo
// =====================================
class GameLogic {
  constructor(gameState, uiManager) {
    this.gameState = gameState;
    this.uiManager = uiManager;
  }

  async handleClueClick(clueId, sessionId, caseId) {
    const caseData = Utils.getCase(caseId);
    const clue = caseData.clues.find(c => c.id === clueId);
    const session = this.gameState.getSession(caseId);

    if (!clue || session.clues.includes(clueId)) {
      Utils.addToast('Pista já registrada ou inválida.', 'info');
      return;
    }

    let clueResolved = false;
    if (clue.requires === 'cipher') {
      const answer = await Utils.showPromptModal('🧩 Cifra de César', `Decifre: ${clue.cipherText}\nDica: Deslocamento de 3 letras para trás.`, 'Digite o texto decifrado...');
      if (answer === null) {
          Utils.addToast('Cifra cancelada.', 'info');
          return;
      }
      const expected = Data.decodeCaesar(clue.cipherText, 3).toLowerCase();
      if (answer.trim().toLowerCase() === expected) {
        Utils.addToast('✅ Cifra resolvida!');
        clueResolved = true;
      } else {
        Utils.addToast('❌ Resposta incorreta!', 'error');
        this.gameState.updateSession(caseId, { errors: (session.errors || 0) + 1 });
      }
    } else if (clue.requires === 'pattern') {
        const optionsToDisplay = clue.patternOptions || this._generatePatternOptions(clue.patternAnswer);
        const choice = await Utils.showOptionsModal('🧩 Padrões & Sequências', `Complete a sequência: ${clue.patternSeq.join(', ')}, ??\nDica: ${clue.patternHint}`,
            optionsToDisplay.map(opt => ({ label: String(opt), value: opt }))
        );

        if (choice === null) {
            Utils.addToast('Padrão cancelado.', 'info');
            return;
        }

        if (parseFloat(choice) === clue.patternAnswer) {
            Utils.addToast('✅ Padrão resolvido!');
            clueResolved = true;
        } else {
            Utils.addToast('❌ Resposta incorreta!', 'error');
            this.gameState.updateSession(caseId, { errors: (session.errors || 0) + 1 });
        }
    } else {
      clueResolved = true;
    }

    if (clueResolved) {
      session.clues.push(clueId);
      this.gameState.updateSession(caseId, { clues: session.clues });
      Utils.addToast(`🔍 Pista encontrada: ${clue.text}`);
    }

    this.uiManager.renderCase(caseData, this.gameState.getState());
  }

  _generatePatternOptions(correctAnswer) {
      const options = new Set();
      options.add(correctAnswer);
      options.add(correctAnswer - 2);
      options.add(correctAnswer + 2);
      if (correctAnswer > 0) options.add(correctAnswer / 2);
      options.add(correctAnswer * 2);

      const sortedOptions = Array.from(options).sort((a, b) => a - b);
      if (sortedOptions.length > 5) {
          return sortedOptions.slice(0, 5);
      }
      return sortedOptions;
  }

  async handleSuspectTalk(suspectId, caseId) {
    const caseData = Utils.getCase(caseId);
    const dialogue = caseData.dialogues[suspectId];

    if (!dialogue) {
      Utils.addToast('Este suspeito não tem nada a dizer.', 'info');
      return;
    }

    let currentNodeId = dialogue.start;
    let keepTalking = true;

    while (keepTalking) {
      const node = dialogue.nodes[currentNodeId];
      if (!node) {
        Utils.addToast('Fim do diálogo.', 'info');
        keepTalking = false;
        break;
      }

      const options = node.options || [];
      const choiceIndex = await Utils.showDialogueModal(`💬 Interrogando: ${caseData.suspects.find(s=>s.id===suspectId).name}`, node.text, options);

      if (choiceIndex === null || choiceIndex === undefined) {
        keepTalking = false;
        Utils.addToast('Conversa encerrada.', 'info');
        break;
      }

      const selectedOption = options[parseInt(choiceIndex)];

      if (selectedOption) {
        if (selectedOption.effect?.award) {
          const session = this.gameState.getSession(caseId);
          if (!session.clues.includes(selectedOption.effect.award)) {
            session.clues.push(selectedOption.effect.award);
            this.gameState.updateSession(caseId, { clues: session.clues });
            Utils.addToast(`🔍 Nova pista obtida através do diálogo: "${Utils.getCase(caseId).clues.find(c => c.id === selectedOption.effect.award).text}"`);
          } else {
            Utils.addToast('Você já tem essa pista.', 'info');
          }
        }
        if (selectedOption.effect?.revealHotspot) {
          const session = this.gameState.getSession(caseId);
          if (!session.revealedHotspots.includes(selectedOption.effect.revealHotspot)) {
            session.revealedHotspots.push(selectedOption.effect.revealHotspot);
            this.gameState.updateSession(caseId, { revealedHotspots: session.revealedHotspots });
            Utils.addToast(`🔍 Novo local de interesse revelado!`);
          }
        }

        if (selectedOption.end) {
          Utils.addToast('Diálogo encerrado.', 'info');
          keepTalking = false;
        } else if (selectedOption.next) {
          currentNodeId = selectedOption.next;
        } else {
          keepTalking = false;
          Utils.addToast('Opção inválida ou diálogo encerrado.', 'info');
        }
      } else {
        keepTalking = false;
        Utils.addToast('Opção inválida ou diálogo encerrado.', 'info');
      }
    }
    this.uiManager.renderCase(caseData, this.gameState.getState());
  }

  async handleAccusation(caseId, sessionId) {
    const caseData = Utils.getCase(caseId);
    const session = this.gameState.getSession(caseId);

    const accusedSuspectId = await Utils.showAccusationModal(caseData);

    if (accusedSuspectId === null) {
      Utils.addToast('Acusação cancelada.', 'info');
      return;
    }

    const isCorrect = accusedSuspectId === caseData.solution;

    if (!session.timeSpent && session.start) {
      session.timeSpent = Math.floor((Date.now() - session.start) / 1000);
    }

    if (isCorrect) {
      session.status = 'solved';
      const res = this._evaluate(session);
      session.result = res;
      this._grantRewards(this.gameState.getState(), res);
      this.gameState.updateSession(caseId, session);
      Utils.addToast('🎉 Caso resolvido!', 'ok');
      this.uiManager.renderResult(caseId, res);
    } else {
      this.gameState.updateSession(caseId, { errors: (session.errors || 0) + 1 });
      Utils.addToast('❌ Acusação incorreta! Continue investigando.', 'error');
      this.uiManager.renderCase(caseData, this.gameState.getState());
    }
  }

  _evaluate(sess) {
    const c = Utils.getCase(sess.caseId);
    if (!c) return { score: 0, stars: 0, foundCount: 0, allFound: false, fast: false, clean: false };

    const found = c.clues.filter(k => sess.clues.includes(k.id));
    const weights = found.reduce((a, k) => a + (k.weight || 0), 0);
    const penalties = Math.min(30, (sess.errors * 3) + (sess.hints * 5));
    const minutes = Math.round((sess.timeSpent || 0) / 60);
    const timeBonus = Math.max(0, 20 - minutes);

    const score = weights - penalties + timeBonus;
    const allRequiredFound = c.clues.every(k => sess.clues.includes(k.id) || k.falsePositive || k.isHiddenHotspot);
    const fast = minutes <= 5;
    const clean = sess.errors === 0 && sess.hints === 0;

    let stars = 1;
    if (allRequiredFound) stars++;
    if (clean) stars++;
    if (fast) stars = Math.min(3, stars);

    return { score, stars, foundCount: found.length, allFound: allRequiredFound, fast, clean };
  }

  _grantRewards(state, res) {
    const pts = Math.max(0, res.score);
    state.user.points += pts;
    state.user.coins += res.stars;

    if (res.clean && !state.user.medals.includes('Sem Erros/Dicas')) {
      state.user.medals.push('Sem Erros/Dicas');
      Utils.addToast('🎖️ Nova Medalha: Sem Erros/Dicas!', 'ok');
    }
    if (res.allFound && !state.user.medals.includes('Olho de Águia')) {
      state.user.medals.push('Olho de Águia');
      Utils.addToast('🎖️ Nova Medalha: Olho de Águia!', 'ok');
    }
    if (res.fast && !state.user.medals.includes('Relâmpago')) {
      state.user.medals.push('Relâmpago');
      Utils.addToast('🎖️ Nova Medalha: Relâmpago!', 'ok');
    }
  }

  async handlePurchasePowerUp(powerUpId, caseId, sessionId) {
    const powerUp = Data.POWER_UPS[powerUpId];
    if (!powerUp) {
      Utils.addToast('Power-Up não encontrado.', 'error');
      return;
    }

    const currentState = this.gameState.getState();
    if (currentState.user.coins < powerUp.cost) {
      Utils.addToast('Moedas insuficientes!', 'warn');
      return;
    }

    const updatedUser = { coins: currentState.user.coins - powerUp.cost };
    this.gameState.updateUser(updatedUser);
    Utils.addToast(`${powerUp.name} comprado!`, 'ok');

    if (powerUp.id === 'eagleVision') {
      const session = this.gameState.getSession(caseId);
      const endTime = Date.now() + (powerUp.duration * 1000);
      this.gameState.updateSession(caseId, {
        activeEffects: {
          ...session.activeEffects,
          eagleVision: { active: true, endTime: endTime }
        }
      });
      Utils.addToast(`Visão de Águia ativada por ${powerUp.duration} segundos!`, 'info');
      this.uiManager.renderCase(Utils.getCase(caseId), this.gameState.getState());
    }
  }
}

// =====================================
// Module: EventHandler - Gerencia os eventos da interface
// =====================================
class EventHandler {
  constructor(appInstance) {
    this.app = appInstance;
    this.init();
  }

  init() {
    document.getElementById('app').addEventListener('click', this.handleClick.bind(this));
    document.querySelector('header').addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('change', this.handleChange.bind(this));
  }

  async handleClick(e) {
    const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    const elementWithData = e.target.dataset.action ? e.target : e.target.closest('[data-action]');

    const sessionId = elementWithData?.dataset.sessionId;
    const caseId = elementWithData?.dataset.caseId;
    const clueId = elementWithData?.dataset.clueId;
    const suspectId = elementWithData?.dataset.suspectId;
    const powerUpId = elementWithData?.dataset.value;

    switch (action) {
      case 'go-welcome':
        this.app.goWelcome();
        break;
      case 'go-hub':
        this.app.goHub();
        break;
      case 'go-parents':
        this.app.goParents();
        break;
      case 'start-game':
      case 'start-case':
        this.app.startCase(caseId || 'c-001');
        break;
      case 'tap-clue':
        if (clueId && sessionId && caseId) {
            this.app.gameLogic.handleClueClick(clueId, sessionId, caseId);
        } else {
            console.warn('Dados ausentes para tap-clue:', { clueId, sessionId, caseId });
        }
        break;
      case 'give-hint':
        if (sessionId) {
            this.app.giveHint(sessionId);
        }
        break;
      case 'talk-suspect':
        if (suspectId && caseId) {
            this.app.gameLogic.handleSuspectTalk(suspectId, caseId);
        }
        break;
      case 'make-accusation':
        if (caseId && sessionId) {
            this.app.gameLogic.handleAccusation(caseId, sessionId);
        }
        break;
      case 'reset-progress':
        this.app.resetProgress();
        break;
      case 'toggle-font':
        this.app.toggleFont();
        break;
      case 'toggle-narration':
        this.app.toggleNarration();
        break;
      case 'open-inventory':
        this.app.openInventory();
        break;
      case 'open-powerups':
        this.app.openPowerUps();
        break;
      case 'purchase-powerup':
        const currentCaseSession = Object.values(this.app.gameState.getState().sessions).find(s => s.status === 'open');
        if (powerUpId && currentCaseSession) {
            this.app.gameLogic.handlePurchasePowerUp(powerUpId, currentCaseSession.caseId, currentCaseSession.sessionId);
        } else if (powerUpId) {
            Utils.addToast('Power-Up comprado, mas não há caso ativo para usá-lo.', 'warn');
        }
        break;
      case 'cancel-modal':
        break;
      default:
        break;
    }
  }

  handleChange(e) {
    const action = e.target.dataset.action;
    if (!action) return;

    switch (action) {
      case 'toggle-font':
        this.app.toggleFont();
        break;
      case 'toggle-narration':
        this.app.toggleNarration();
        break;
    }
  }
}

// =====================================
// Module: App - Ponto de Entrada da Aplicação
// =====================================
class App {
  constructor() {
    this.gameState = new GameState();
    this.uiManager = new UIManager(this.gameState);
    this.gameLogic = new GameLogic(this.gameState, this.uiManager);
    this.eventHandler = new EventHandler(this);
  }

  goWelcome() {
    this.uiManager.safeRender(this.uiManager.renderWelcome.bind(this.uiManager));
  }

  goHub() {
    this.gameState.stopTimer();
    this.uiManager.safeRender(this.uiManager.renderHub.bind(this.uiManager));
  }

  goParents() {
    this.uiManager.safeRender(this.uiManager.renderParents.bind(this.uiManager));
  }

  async resetProgress() {
    const confirmed = await Utils.showConfirmationModal('Zerar todo o progresso? Isso não poderá ser desfeito.');
    if (confirmed === 'true') {
      this.gameState.setState(StorageManager.defaultState());
      Utils.addToast('Progresso zerado!', 'ok');
      this.goWelcome();
    } else {
      Utils.addToast('Ação cancelada.', 'info');
    }
  }

  startCase(caseId) {
    const caseData = Utils.getCase(caseId);
    if (!caseData) {
      Utils.addToast('Caso não encontrado!', 'danger');
      return;
    }
    this.uiManager.safeRender(() => this.uiManager.renderCase(caseData, this.gameState.getState()));
  }

  giveHint(sessionId) {
    const session = this.gameState.getSession(sessionId);
    if (!session) return;

    if ((this.gameState.getState().user.coins || 0) <= 0) {
      Utils.addToast('Sem moedas para dica.', 'warn');
      return;
    }
    const updatedUser = { coins: (this.gameState.getState().user.coins || 0) - 1 };
    this.gameState.updateUser(updatedUser);
    
    this.gameState.updateSession(sessionId, { hints: (session.hints || 0) + 1 });
    Utils.addToast('Dica: observe letras cifradas e padrões numéricos!', 'info');
    this.uiManager.safeRender(() => this.uiManager.renderCase(Utils.getCase(session.caseId), this.gameState.getState()));
  }

  async openInventory() {
    const currentCaseSession = Object.values(this.gameState.getState().sessions).find(s => s.status === 'open');
    if (!currentCaseSession) {
      Utils.addToast('Nenhum caso ativo para abrir o inventário.', 'info');
      return;
    }
    const caseData = Utils.getCase(currentCaseSession.caseId);
    await Utils.showInventoryModal(caseData, currentCaseSession);
  }

  async openPowerUps() {
    const currentState = this.gameState.getState();
    const currentCaseSession = Object.values(currentState.sessions).find(s => s.status === 'open');
    
    if (!currentCaseSession) {
        Utils.addToast('Nenhum caso ativo para usar Power-Ups.', 'info');
        return;
    }

    const selectedPowerUpId = await Utils.showPowerUpsModal(currentState.user.coins);
    
    if (selectedPowerUpId && selectedPowerUpId !== 'close') {
        this.gameLogic.handlePurchasePowerUp(selectedPowerUpId, currentCaseSession.caseId, currentCaseSession.sessionId);
    }
  }

  toggleFont() {
    const state = this.gameState.getState();
    const updatedSettings = { largeFont: !state.user.settings.largeFont };
    this.gameState.updateUser({ settings: updatedSettings });
    Utils.addToast('Preferência de fonte salva.', 'info');
    document.body.classList.toggle('large-font', this.gameState.getState().user.settings.largeFont);

    const currentCaseSession = Object.values(this.gameState.getState().sessions).find(s => s.status === 'open');
    if (currentCaseSession) {
        this.uiManager.safeRender(() => this.uiManager.renderCase(Utils.getCase(currentCaseSession.caseId), this.gameState.getState()));
    } else if (this.uiManager.appElement.innerHTML.includes('Painel dos Pais')) {
        this.uiManager.safeRender(this.uiManager.renderParents.bind(this.uiManager));
    } else {
        this.uiManager.safeRender(this.uiManager.renderHub.bind(this.uiManager));
    }
  }

  toggleNarration() {
    const state = this.gameState.getState();
    const updatedSettings = { narration: !state.user.settings.narration };
    this.gameState.updateUser({ settings: updatedSettings });
    Utils.addToast('Configuração salva. (Função de narração não implementada neste protótipo)', 'info');
  }

  init() {
    const params = new URLSearchParams(location.search);
    if (params.get('autoplay') === '1') {
      this.startCase('c-001');
    } else {
      this.goWelcome();
    }
  }
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  App.instance = window.app;
  window.app.init();
});
