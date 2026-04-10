// Sherlock Bia — engine principal
// Implementa navegação, renderização de cenas e interação com pistas/diálogos

const SCENE_BACKGROUNDS = {
  school_hallway: "assets/scenarios/corredor.png",
  corridor: "assets/scenarios/corredor.png",
  hall: "assets/scenarios/hall_trofeus.png",
  library: "assets/scenarios/biblioteca.png",
  kitchen: "assets/scenarios/cozinha.png",
  canteen: "assets/scenarios/refeitorio.png",
  garden: "assets/scenarios/jardim.png",
  computer_lab: "assets/scenarios/lab_informatica.png",
  music_room: "assets/scenarios/sala_musica.png",
  classroom: "assets/scenarios/hall_trofeus.png",
  laboratory: "assets/scenarios/laboratorio.png",
  court: "assets/scenarios/quadra.png"
};

const CHARACTER_PORTRAITS = {
  programador_gui: "assets/icons/programador_gui.png",
  prof_ciencias: "assets/icons/prof_ciencias.png",
  sofia: "assets/icons/sofia.png",
  zelador_carlos: "assets/icons/zelador_carlos.png",
  treinador_marcos: "assets/icons/treinador_marcos.png",
  bia: "assets/icons/bia.png",
  leo: "assets/icons/leo.png",
  pedro: "assets/icons/pedro.png",
  prof_arthur: "assets/icons/prof_arthur.png",
  diretora_helena: "assets/icons/diretora_helena.png",
  aluna_rita: "assets/icons/aluna_rita.png",
  aluno_traquinas: "assets/icons/aluno_traquinas.png",
  cozinheira_ana: "assets/icons/cozinheira_ana.png",
  jardineiro_joao: "assets/icons/jardineiro_joao.png",
  prof_quimica: "assets/icons/prof_quimica.png"
};

const SKILLS = [
  { id: "detetive_rapido", name: "Detetive Rápido", cost: 50, description: "Recebe 1 dica extra por caso.", effect: { extraClue: true } },
  { id: "olhos_de_agua", name: "Olhos de Águia", cost: 40, description: "Hotspots maiores para facilitar o clique.", effect: { hotspotBoost: true } },
  { id: "logica_afiada", name: "Lógica Afiada", cost: 60, description: "Ganhe +10 XP por acerto de enigma.", effect: { puzzleBonus: 10 } }
];

const Storage = {
  load: () => {
    try {
      return JSON.parse(localStorage.getItem("sherlock_bia") || "{}");
    } catch (e) {
      return {};
    }
  },
  save: (data) => localStorage.setItem("sherlock_bia", JSON.stringify(data))
};

// Helpers: small, reliable utilities
const Utils = {
  safeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },
  clueKindLabel(type) {
    const map = {
      observation: "🟡 Observação",
      testimony: "🔵 Depoimento",
      critical: "🔴 Evidência",
      dialogue: "🔵 Depoimento",
      hotspot: "🟡 Observação",
      cipher: "🧩 Enigma",
      pattern: "🧩 Enigma"
    };
    return map[type] || type;
  },
  isCritical(clue) {
    return Boolean(clue.critical) || (clue.weight || 0) >= 3;
  },
  nowIso() {
    return new Date().toISOString();
  }
};

const Toast = {
  container: null,
  init() {
    this.container = document.getElementById("toast-container");
  },
  show(message, type = "info") {
    if (!this.container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
};

const Modal = {
  overlay: null,
  title: null,
  message: null,
  input: null,
  actions: null,
  init() {
    this.overlay = document.getElementById("custom-modal");
    this.title = document.getElementById("modal-title");
    this.message = document.getElementById("modal-message");
    this.input = document.getElementById("modal-input");
    this.actions = document.getElementById("modal-options");
  },
  close() {
    this.overlay.classList.remove("show");
    this.message.innerHTML = "";
    this.title.textContent = "";
    this.input.style.display = "none";
    this.input.value = "";
    this.actions.innerHTML = "";
  },
  // Basic prompt (backwards compatible). Supports either plain text (message) or HTML (messageHtml).
  prompt({ title, message = "", messageHtml = "", placeholder = "", onConfirm, showInput = false, options = [] }) {
    this.title.textContent = title;
    this.message.innerHTML = messageHtml || Utils.safeHtml(message);
    this.actions.innerHTML = "";

    if (showInput) {
      this.input.style.display = "block";
      this.input.placeholder = placeholder;
      this.input.value = "";
    } else {
      this.input.style.display = "none";
    }

    if (options.length) {
      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = opt.label;
        btn.addEventListener("click", () => {
          onConfirm(opt.value ?? opt.label, opt);
          this.close();
        });
        this.actions.appendChild(btn);
      });
    } else {
      const confirmBtn = document.createElement("button");
      confirmBtn.className = "btn";
      confirmBtn.textContent = "Confirmar";
      confirmBtn.addEventListener("click", () => {
        onConfirm(this.input.value);
        this.close();
      });
      this.actions.appendChild(confirmBtn);
    }

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn ghost";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => this.close());
    this.actions.appendChild(cancelBtn);

    this.overlay.classList.add("show");
  }
};

// Promise-based helper (prevents callback hell and makes flows reliable)
Modal.ask = function({ title, message = "", messageHtml = "", placeholder = "", showInput = false, options = [] }) {
  return new Promise((resolve) => {
    Modal.prompt({
      title,
      message,
      messageHtml,
      placeholder,
      showInput,
      options,
      onConfirm: (value, opt) => resolve({ value, opt })
    });
    // If user closes modal via Cancel, we treat as null.
    const cancelBtn = Modal.actions.querySelector("button.btn.ghost");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => resolve({ value: null, opt: null }), { once: true });
    }
  });
};

// Fully custom modal with HTML body and arbitrary buttons.
Modal.openHtml = function({ title, html, buttons = [{ label: "Ok", value: "ok", primary: true }], cancellable = true, autoClose = true }) {
  return new Promise((resolve) => {
    Modal.title.textContent = title;
    Modal.message.innerHTML = html;
    Modal.input.style.display = "none";
    Modal.input.value = "";
    Modal.actions.innerHTML = "";

    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.className = b.primary ? "btn" : "btn ghost";
      btn.textContent = b.label;
      btn.addEventListener("click", () => {
        if (autoClose) Modal.close();
        resolve(b.value);
      });
      Modal.actions.appendChild(btn);
    });
    if (cancellable) {
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "btn ghost";
      cancelBtn.textContent = "Cancelar";
      cancelBtn.addEventListener("click", () => {
        if (autoClose) Modal.close();
        resolve(null);
      });
      Modal.actions.appendChild(cancelBtn);
    }

    Modal.overlay.classList.add("show");
  });
};

const Game = {
  app: null,
  cases: [],
  state: {
    coins: 0,
    xp: 0,
    unlockedSkills: [],
    completedCases: {},
    sessions: {},
    onboarded: false,
    telemetry: { totalClicks: 0, wrongAccusations: 0 }
  },
  currentCase: null,

  async init() {
    console.log("Iniciando Sherlock Bia v2.0...");
    this.app = document.getElementById("app");
    if (!this.app) console.error("Elemento #app não encontrado!");
    Toast.init();
    Modal.init();
    this.state = { ...this.state, ...Storage.load() };
    console.log("Estado carregado:", this.state);
    this.cases = await this.loadCases();
    console.log("Casos carregados:", this.cases.length);
    this.bindNavigation();
    UI.renderWelcome();

    // First-time onboarding (learning-first, not game-first)
    if (!this.state.onboarded) {
      this.state.onboarded = true;
      Storage.save(this.state);
      Modal.openHtml({
        title: "🕵️ Como jogar (rápido)",
        html: `
          <div class="onboard">
            <p><b>1)</b> Explore o cenário e toque nos pontos brilhantes.</p>
            <p><b>2)</b> Questione as pessoas e escolha <b>perguntas</b> (não é só conversar!).</p>
            <p><b>3)</b> Antes de acusar, escolha as <b>pistas</b> que sustentam sua hipótese.</p>
            <p class="small">Dica: se clicar e não tiver nada, a Bia vai avisar 😉</p>
          </div>
        `,
        buttons: [{ label: "Entendi!", value: "ok", primary: true }],
        cancellable: false
      });
    }
  },

  async loadCases() {
    try {
      const response = await fetch("cases.json");
      if (!response.ok) throw new Error("Falha ao carregar casos.");
      return await response.json();
    } catch (err) {
      console.error(err);
      Toast.show("Erro ao carregar os casos do jogo.", "error");
      return [];
    }
  },

  bindNavigation() {
    document.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        if (action === "reset-progress") {
          if (confirm("Tem certeza que deseja zerar o progresso?")) {
            Storage.save({});
            location.reload();
          }
          return;
        }
        UI.handleNavigation(action);
      });
    });
  },

  selectCulprit(caseData, seed) {
    const rng = new Math.seedrandom(seed || caseData.id);
    const index = Math.floor(rng() * caseData.culpritPool.length);
    return caseData.culpritPool[index];
  },

  startCase(caseId) {
    const caseData = this.cases.find((c) => c.id === caseId);
    if (!caseData) return;

    // Session (local only) for reliability + analytics
    const existingSession = this.state.sessions[caseId];
    const session = existingSession && existingSession.status === "open"
      ? { ...existingSession }
      : {
          caseId,
          status: "open",
          startIso: Utils.nowIso(),
          startTs: Date.now(),
          timeSpentSec: 0,
          errors: 0,
          hints: 0,
          wrongAccusations: 0,
          clicks: 0,
          lastActionTs: Date.now(),
          visitedScene: false,
          lastAccusation: null
        };
    this.state.sessions[caseId] = session;
    Storage.save(this.state);

    // Each new session can generate a different story (culprit), while remaining stable when resuming.
    const culprit = session.culpritId || this.selectCulprit(caseData, `${caseData.id}::${session.startIso}`);
    session.culpritId = culprit;
    this.state.sessions[caseId] = session;
    Storage.save(this.state);

    const clues = this.prepareClues(caseData, culprit);

    this.currentCase = {
      ...caseData,
      culprit,
      allClues: clues,
      foundClues: (session.foundClueIds || []).map((id) => clues.find((c) => c.id === id)).filter(Boolean),
      solved: false
    };

    UI.renderCase(this.currentCase);
  },

  prepareClues(caseData, culprit) {
    // Deterministic RNG per case + culprit (stable hotspots between sessions)
    const rng = new Math.seedrandom(`${caseData.id}::${culprit}`);
    const pool = [];
    Object.entries(caseData.clueSets).forEach(([suspectId, clues]) => {
      clues.forEach((clue) => {
        const choice = clue.hs?.potentialPositions?.length
          ? clue.hs.potentialPositions[Math.floor(rng() * clue.hs.potentialPositions.length)]
          : [30, 50, 12, 10];
        // Normalize learning-centric metadata
        const normalizedType = clue.learningType || clue.type || (clue.type === "dialogue" ? "testimony" : "observation");
        const critical = Utils.isCritical(clue);
        pool.push({ ...clue, suspectId, position: choice, learningType: critical ? "critical" : normalizedType, critical });
      });
    });

    // bônus se habilidade extraClue ativa e suspeito é culpado
    if (this.hasSkill("detetive_rapido")) {
      const extra = caseData.clueSets[culprit]?.find((c) => c.type === "hotspot");
      if (extra) {
        pool.push({
          ...extra,
          id: `${extra.id}_bonus`,
          text: `${extra.text} (dica bônus)`,
          suspectId: culprit,
          position: extra.hs?.potentialPositions?.[0] || [40, 40, 14, 10]
        });
      }
    }

    return pool;
  },

  markClueFound(clue) {
    if (this.currentCase.foundClues.some((c) => c.id === clue.id)) return;
    this.currentCase.foundClues.push(clue);

    // persist in session
    const sess = this.state.sessions[this.currentCase.id];
    const ids = new Set(sess.foundClueIds || []);
    ids.add(clue.id);
    sess.foundClueIds = Array.from(ids);
    sess.lastActionTs = Date.now();
    this.state.sessions[this.currentCase.id] = sess;
    Storage.save(this.state);

    this.addReward(clue.weight || 1, clue.type === "pattern" || clue.type === "cipher");
    UI.updateClueList(this.currentCase);

    // Reflection prompt for critical evidence (teaches investigation explicitly)
    if (clue.critical || clue.learningType === "critical") {
      Modal.openHtml({
        title: "🔴 Evidência importante!", 
        html: `
          <div class="reflection">
            <p><b>${Utils.safeHtml(clue.text)}</b></p>
            <p class="small">Pergunta rápida: o que essa evidência sugere?</p>
            <ul class="small" style="text-align:left; margin:10px 0 0; padding-left:18px;">
              <li>Ela <b>confirma</b> alguém no local?</li>
              <li>Ela <b>contradiz</b> algum depoimento?</li>
              <li>Qual seria a próxima pergunta a fazer?</li>
            </ul>
          </div>
        `,
        buttons: [{ label: "Continuar", value: "ok", primary: true }],
        cancellable: false
      });
    }
  },

  addReward(weight, isPuzzle = false) {
    const bonus = isPuzzle && this.hasSkill("logica_afiada") ? 10 : 0;
    this.state.coins += weight * 5;
    this.state.xp += weight * 8 + bonus;
    Storage.save(this.state);
    UI.renderHud();
  },

  hasSkill(skillId) {
    return this.state.unlockedSkills.includes(skillId);
  },

  unlockSkill(skill) {
    if (this.state.unlockedSkills.includes(skill.id)) return;
    if (this.state.coins < skill.cost) {
      Toast.show("Moedas insuficientes para desbloquear", "error");
      return;
    }
    this.state.coins -= skill.cost;
    this.state.unlockedSkills.push(skill.id);
    Storage.save(this.state);
    Toast.show(`${skill.name} desbloqueada!`, "success");
    UI.renderSkillTree();
    UI.renderHud();
  },

  openDialogue(suspectId) {
    if (!this.currentCase) return;
    const dialogue = this.currentCase.dialogues?.[suspectId];
    if (!dialogue) {
      Toast.show("Este personagem não tem falas registradas.", "warning");
      return;
    }

    this.showDialogueNode(dialogue, dialogue.start);
  },

  showDialogueNode(dialogue, nodeId) {
    const node = dialogue.nodes[nodeId];
    if (!node) return;
    Modal.prompt({
      title: "Conversa",
      message: node.text,
      options: node.options.map((opt) => ({ label: opt.label, value: opt })),
      onConfirm: (_, opt) => {
        const option = opt.value;

        // Effects: award clue(s), reveal hotspot(s), add small penalties for misleading answers
        try {
          if (option?.effect?.awardClueId) {
            const awarded = this.currentCase.allClues.find((c) => c.id === option.effect.awardClueId);
            if (awarded) this.markClueFound(awarded);
          }
          if (option?.effect?.awardClueTag) {
            const targets = this.currentCase.allClues.filter((c) => c.tags?.includes(option.effect.awardClueTag));
            targets.forEach((c) => this.markClueFound(c));
          }
          if (option?.effect?.revealHotspotId) {
            UI.revealHotspot(option.effect.revealHotspotId);
          }
          if (option?.effect?.misleading) {
            const sess = this.state.sessions[this.currentCase.id];
            sess.errors = (sess.errors || 0) + 1;
            this.state.sessions[this.currentCase.id] = sess;
            Storage.save(this.state);
            Toast.show("Resposta confusa… anote e confirme com outras pistas.", "warning");
          }
        } catch (err) {
          console.warn("Dialogue effect failed:", err);
        }

        if (option.end) return;
        const nextId = option.next || dialogue.start;
        this.showDialogueNode(dialogue, nextId);
      }
    });
  },

  async accuseWithReasoning(suspectId) {
    if (!this.currentCase) return;
    const sess = this.state.sessions[this.currentCase.id];
    const found = this.currentCase.foundClues || [];
    if (found.length < 1) {
      Toast.show("Colete pelo menos 1 pista antes de acusar.", "warning");
      return;
    }

    // Step 1: choose 1–2 supporting clues (forces explicit reasoning)
    const choicesHtml = `
      <div class="reasoning">
        <p class="small">Selecione <b>1 ou 2</b> pistas que sustentam sua acusação:</p>
        <div class="checklist">
          ${found
            .map((c, idx) => `
              <label class="check">
                <input type="checkbox" data-clue="${Utils.safeHtml(c.id)}"> 
                <span><span class="badge kind-${Utils.safeHtml(c.learningType || c.type)}">${Utils.safeHtml(Utils.clueKindLabel(c.learningType || c.type))}</span> ${Utils.safeHtml(c.text)}</span>
              </label>
            `)
            .join("")}
        </div>
        <p class="small" style="margin-top:10px;">Depois, a Bia te mostra um resumo do seu raciocínio.</p>
      </div>
    `;

    const confirm = await Modal.openHtml({
      title: "🧠 Antes de acusar…", 
      html: choicesHtml,
      buttons: [
        { label: "Confirmar", value: "ok", primary: true },
        { label: "Cancelar", value: null, ghost: true }
      ],
      cancellable: false,
      autoClose: false
    });
    if (confirm !== "ok") {
      try { Modal.close(); } catch (_) {}
      return;
    }

    const checked = Array.from(document.querySelectorAll('#custom-modal input[type="checkbox"][data-clue]:checked'))
      .map((el) => el.getAttribute("data-clue"))
      .slice(0, 2);

    if (!checked.length) {
      Toast.show("Escolha pelo menos 1 pista para justificar.", "warning");
      // Modal stays open (autoClose: false)
      return;
    }

    // Close the modal now that we captured state
    Modal.close();

    const success = suspectId === this.currentCase.culprit;
    const caseResult = {
      culprit: this.currentCase.culprit,
      foundClues: this.currentCase.foundClues.map((c) => c.id),
      success,
      reasoning: { accused: suspectId, supportClues: checked }
    };
    this.state.completedCases[this.currentCase.id] = caseResult;
    Storage.save(this.state);
    this.currentCase.solved = success;

    // Update session stats
    sess.lastAccusation = { accused: suspectId, supportClues: checked, ts: Date.now() };
    if (!success) {
      sess.wrongAccusations = (sess.wrongAccusations || 0) + 1;
      this.state.telemetry.wrongAccusations = (this.state.telemetry.wrongAccusations || 0) + 1;
      Storage.save(this.state);
    } else {
      sess.status = "solved";
      sess.timeSpentSec = Math.max(0, Math.floor((Date.now() - sess.startTs) / 1000));
      Storage.save(this.state);
    }

    if (success) {
      this.addReward(5);
      Toast.show("Caso resolvido! Você acertou o culpado!", "success");

      // Debrief: teach how the conclusion was reached
      const suspectName = this.currentCase.baseSuspects.find((s) => s.id === this.currentCase.culprit)?.name || this.currentCase.culprit;
      const supportTexts = checked
        .map((id) => this.currentCase.allClues.find((c) => c.id === id))
        .filter(Boolean)
        .map((c) => `• ${Utils.safeHtml(c.text)}`)
        .join("<br>");

      const criticalFound = (this.currentCase.foundClues || []).filter((c) => c.critical || c.learningType === "critical");
      const criticalHtml = criticalFound.length
        ? criticalFound.map((c) => `• ${Utils.safeHtml(c.text)}`).join("<br>")
        : "(nenhuma evidência crítica coletada)";

      Modal.openHtml({
        title: "✅ Resumo do Caso", 
        html: `
          <div class="debrief">
            <p><b>Culpado:</b> ${Utils.safeHtml(suspectName)}</p>
            <p class="small"><b>Suas pistas de apoio:</b><br>${supportTexts}</p>
            <hr style="opacity:.2; margin:10px 0;">
            <p class="small"><b>Evidências importantes que você encontrou:</b><br>${criticalHtml}</p>
            <div class="small" style="margin-top:10px; text-align:left;">
              <b>Perguntas para reflexão</b>
              <ul style="margin:6px 0 0; padding-left:18px;">
                <li>Que pista foi <b>decisiva</b>?</li>
                <li>Qual pergunta você faria <b>primeiro</b> na próxima vez?</li>
                <li>Como você evitaria uma acusação por <b>chute</b>?</li>
              </ul>
            </div>
          </div>
        `,
        buttons: [{ label: "Concluir", value: "ok", primary: true }],
        cancellable: false
      });
    } else {
      Toast.show("Acusação incorreta. Continue investigando!", "error");

      // Guided negative feedback (teaches comparison)
      const accusedName = this.currentCase.baseSuspects.find((s) => s.id === suspectId)?.name || suspectId;
      Modal.openHtml({
        title: "🔎 Vamos pensar melhor…",
        html: `
          <div class="wrong">
            <p class="small">Você acusou <b>${Utils.safeHtml(accusedName)}</b>. Agora compare hipóteses:</p>
            <ul class="small" style="text-align:left; padding-left:18px;">
              <li>Qual pista <b>não combina</b> com essa pessoa?</li>
              <li>Quem teria <b>acesso</b> ao local?</li>
              <li>Qual depoimento precisa ser <b>confirmado</b>?</li>
            </ul>
            <p class="small" style="margin-top:8px;">Dica prática: volte ao cenário e procure uma <b>evidência vermelha</b> (🔴).</p>
          </div>
        `,
        buttons: [{ label: "Entendi", value: "ok", primary: true }],
        cancellable: false
      });
    }
    UI.renderCase(this.currentCase);
  }
};

const UI = {
  handleNavigation(action) {
    switch (action) {
      case "go-welcome":
        this.renderWelcome();
        break;
      case "go-hub":
        this.renderHub();
        break;
      case "go-parents":
        this.renderParentsPanel();
        break;
      case "go-skill-tree":
        this.renderSkillTree();
        break;
    }
  },

  renderHud() {
    const hud = document.querySelector(".hud");
    if (!hud) return;
    hud.innerHTML = `
      <div><strong>XP:</strong> ${Game.state.xp}</div>
      <div><strong>Moedas:</strong> ${Game.state.coins}</div>
      <div><strong>Habilidades:</strong> ${Game.state.unlockedSkills.length}</div>
    `;
  },

  renderWelcome() {
    Game.currentCase = null;
    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Bem-vindo(a) ao Sherlock Bia!</h2>
        <p>Explore casos, encontre pistas e descubra o culpado usando lógica e observação.</p>
        <div class="stats">
          <div class="stat-card"><span class="stat-number">${Object.keys(Game.state.completedCases).length}</span><span class="stat-label">Casos concluídos</span></div>
          <div class="stat-card"><span class="stat-number">${Game.state.xp}</span><span class="stat-label">XP</span></div>
          <div class="stat-card"><span class="stat-number">${Game.state.coins}</span><span class="stat-label">Moedas</span></div>
        </div>
        <div class="cta">
          <button class="btn" data-action="go-hub">Ir para o Mapa de Casos</button>
          <button class="btn ghost" data-action="go-skill-tree">Ver Habilidades</button>
        </div>
      </section>
    `;
    this.renderHud();
  },

  renderHub() {
    const cards = Game.cases
      .map((c) => {
        const solved = Game.state.completedCases[c.id]?.success;
        const sess = Game.state.sessions?.[c.id];
        const inProgress = sess && sess.status === "open" && (sess.foundClueIds?.length || 0) > 0;
        const story = (c.culpritPool?.length || 0) > 1
          ? `<span class="badge mini neutral">🔀 História muda</span>`
          : "";
        return `
          <article class="case-card">
            <div class="case-meta">Capítulo ${c.chapter} • Dificuldade ${"★".repeat(c.difficulty)} ${story}</div>
            <h3>${c.title}</h3>
            <p>${c.intro}</p>
            <div class="case-footer">
              <span class="badge ${solved ? "success" : inProgress ? "warning" : "neutral"}">${solved ? "Resolvido" : inProgress ? "Em andamento" : "Disponível"}</span>
              <button class="btn" data-case-id="${c.id}">${inProgress ? "Continuar" : "Investigar"}</button>
            </div>
          </article>`;
      })
      .join("");

    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Mapa de Casos</h2>
        <div class="case-grid">${cards}</div>
      </section>
    `;
    this.renderHud();

    document.querySelectorAll("button[data-case-id]").forEach((btn) => {
      btn.addEventListener("click", () => Game.startCase(btn.getAttribute("data-case-id")));
    });
  },

  renderParentsPanel() {
    const completed = Object.entries(Game.state.completedCases);
    const entries = completed
      .map(([caseId, result]) => {
        const caseData = Game.cases.find((c) => c.id === caseId);
        return `<li><strong>${caseData?.title || caseId}</strong> — ${result.success ? "Resolvido" : "Tentativa"} (Clues: ${result.foundClues.length})</li>`;
      })
      .join("") || "<li>Nenhum caso finalizado ainda.</li>";

    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Painel dos Pais</h2>
        <p>Acompanhe o progresso do jovem detetive.</p>
        <ul class="progress-list">${entries}</ul>
      </section>
    `;
    this.renderHud();
  },

  renderSkillTree() {
    const skillCards = SKILLS.map((skill) => {
      const unlocked = Game.state.unlockedSkills.includes(skill.id);
      return `
        <article class="skill-card ${unlocked ? "unlocked" : ""}">
          <div class="skill-header">
            <h3>${skill.name}</h3>
            <span class="badge">${skill.cost} moedas</span>
          </div>
          <p>${skill.description}</p>
          <button class="btn" ${unlocked ? "disabled" : ""} data-skill="${skill.id}">${unlocked ? "Desbloqueada" : "Desbloquear"}</button>
        </article>`;
    }).join("");

    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Árvore de Habilidades</h2>
        <div class="skill-tree-container">${skillCards}</div>
      </section>
    `;
    this.renderHud();

    document.querySelectorAll("button[data-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const skill = SKILLS.find((s) => s.id === btn.getAttribute("data-skill"));
        if (skill) Game.unlockSkill(skill);
      });
    });
  },

  renderCase(caseData) {
    const bg = SCENE_BACKGROUNDS[caseData.scene] || "school_hallway_cartoon.png";
    const suspectCards = caseData.baseSuspects
      .map((suspect) => {
        const portrait = CHARACTER_PORTRAITS[suspect.id] || CHARACTER_PORTRAITS.bia;
        const traits = suspect.traits?.join(", ") || "";
        return `
          <article class="suspect-card">
            <img src="${portrait}" alt="${suspect.name}">
            <div>
              <h4>${suspect.name}</h4>
              <p class="traits">${traits}</p>
              <button class="btn ghost" data-dialogue="${suspect.id}">Questionar</button>
            </div>
          </article>`;
      })
      .join("");

    const solvedBanner = caseData.solved
      ? `<div class="case-status success">Caso resolvido! O culpado era ${caseData.culprit}.</div>`
      : "";

    Game.app.innerHTML = `
      <section class="case-layout">
        <div class="scene-wrapper" style="background-image: url('${bg}')">
          <div class="scene-overlay" id="scene-overlay"></div>
          ${solvedBanner}
        </div>
        <aside class="case-sidebar">
          <div class="hud"></div>
          <h2>${caseData.title}</h2>
          <p>${caseData.intro}</p>
          <div class="panel">
            <h3>Pistas encontradas</h3>
            <ul class="clue-list" id="clue-list"></ul>
          </div>
          <div class="panel">
            <h3>Personagens</h3>
            <div class="suspect-list">${suspectCards}</div>
          </div>
          <div class="panel">
            <h3>Acusar</h3>
            <select id="accuse-select" class="input">
              ${caseData.baseSuspects.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}
            </select>
            <button class="btn full" id="accuse-btn">Fazer acusação</button>
          </div>
        </aside>
      </section>
    `;

    this.renderHud();
    this.renderHotspots(caseData);
    this.updateClueList(caseData);

    // Negative feedback on "empty clicks" (teaches visual scanning)
    const scene = document.querySelector(".scene-wrapper");
    if (scene) {
      scene.addEventListener("click", (ev) => {
        // If clicked a hotspot/button, ignore
        if (ev.target?.closest(".difference-hotspot")) return;
        Toast.show("Nada aqui… observe melhor!", "info");
      });
    }

    document.querySelectorAll("button[data-dialogue]").forEach((btn) => {
      btn.addEventListener("click", () => Game.openDialogue(btn.getAttribute("data-dialogue")));
    });

    document.getElementById("accuse-btn").addEventListener("click", () => {
      const suspectId = document.getElementById("accuse-select").value;
      Game.accuseWithReasoning(suspectId);
    });
  },

  renderHotspots(caseData) {
    const overlay = document.getElementById("scene-overlay");
    overlay.innerHTML = "";
    const boost = Game.hasSkill("olhos_de_agua") ? 1.3 : 1;
    // Visual guidance: pulse/glow on the first visit of a case
    const sess = Game.state.sessions?.[caseData.id];
    const firstVisit = sess && !sess.visitedScene;
    if (sess && firstVisit) {
      sess.visitedScene = true;
      Storage.save(Game.state);
    }

    caseData.allClues.forEach((clue) => {
      if (!clue.hs) return; // somente pistas com hotspot visual
      const [x, y, w, h] = clue.position;
      const btn = document.createElement("button");
      const alreadyFound = (caseData.foundClues || []).some((c) => c.id === clue.id);
      btn.className = `difference-hotspot ${firstVisit && !alreadyFound ? "pulse" : ""} ${clue.critical || clue.learningType === "critical" ? "critical" : ""}`;
      btn.dataset.clueId = clue.id;
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      btn.style.width = `${w * boost}%`;
      btn.style.height = `${h * boost}%`;
      btn.innerHTML = clue.hs.icon || "?";
      btn.setAttribute("aria-label", clue.text);
      if (alreadyFound) btn.classList.add("found");
      btn.addEventListener("click", () => this.handleHotspotClick(clue, btn));
      overlay.appendChild(btn);
    });
  },

  // Highlights a hotspot after a dialogue hint (helps children link testimony → search)
  revealHotspot(clueId) {
    const el = document.querySelector(`.difference-hotspot[data-clue-id="${CSS.escape(clueId)}"]`);
    if (el) {
      el.classList.add("hinted");
      setTimeout(() => el.classList.remove("hinted"), 6000);
      Toast.show("Dica: procure um ponto brilhante no cenário!", "info");
    }
  },

  handleHotspotClick(clue, element) {
    // telemetry
    try {
      Game.state.telemetry.totalClicks = (Game.state.telemetry.totalClicks || 0) + 1;
      const sess = Game.state.sessions?.[Game.currentCase?.id];
      if (sess) {
        sess.clicks = (sess.clicks || 0) + 1;
        sess.lastActionTs = Date.now();
        Game.state.sessions[Game.currentCase.id] = sess;
      }
      Storage.save(Game.state);
    } catch (_) {}

    if (Game.currentCase?.foundClues.some((c) => c.id === clue.id)) {
      Toast.show("Você já coletou essa pista.", "warning");
      return;
    }

    const processSuccess = () => {
      element.classList.add("found");
      Toast.show("Pista coletada!", "success");
      Game.markClueFound(clue);
    };

    if (clue.type === "cipher" || clue.type === "pattern") {
      const message = clue.type === "cipher"
        ? "Decifre a mensagem para validar a pista"
        : clue.hint || "Resolva o padrão numérico";
      const options = clue.options?.length
        ? clue.options.map((opt) => ({ label: opt.toString(), value: opt }))
        : [];
      Modal.prompt({
        title: "Enigma",
        message,
        showInput: !options.length,
        placeholder: "Resposta...",
        options,
        onConfirm: (value) => {
          const normalized = typeof value === "string" ? value.trim() : value;
          if (normalized == clue.solution) {
            processSuccess();
          } else {
            Toast.show("Resposta incorreta. Tente novamente!", "error");
          }
        }
      });
      return;
    }

    processSuccess();
  },

  updateClueList(caseData) {
    const list = document.getElementById("clue-list");
    if (!list) return;
    if (!caseData.foundClues.length) {
      list.innerHTML = "<li>Nenhuma pista coletada ainda.</li>";
      return;
    }
    list.innerHTML = caseData.foundClues
      .map((clue) => {
        const kind = clue.learningType || clue.type;
        const label = Utils.clueKindLabel(kind);
        const criticalMark = clue.critical ? " <span class=\"badge critical\">🔴</span>" : "";
        return `<li><span class="badge kind-${Utils.safeHtml(kind)}">${Utils.safeHtml(label)}</span>${criticalMark} ${Utils.safeHtml(clue.text)}</li>`;
      })
      .join("");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Game.init();
});
