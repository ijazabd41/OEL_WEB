// Core list + mode logic
(function () {
  const STORAGE_KEYS = {
    ITEMS: "dualNature_items",
    STATS: "dualNature_stats",
    MODE: "dualNature_mode",
  };

  const XP_PER_COMPLETE = 10;
  const XP_PER_DELETE_COMPLETED = -10;
  const XP_LEVEL_STEP = 40;

  const modeToggle = document.getElementById("modeToggle");
  const body = document.body;

  const itemForm = document.getElementById("itemForm");
  const itemInput = document.getElementById("itemInput");
  const itemList = document.getElementById("itemList");

  const statLevel = document.getElementById("statLevel");
  const statXP = document.getElementById("statXP");
  const statStreak = document.getElementById("statStreak");
  const statCompleted = document.getElementById("statCompleted");
  const xpFill = document.getElementById("xpFill");
  const achievementList = document.getElementById("achievements");
  const confettiLayer = document.getElementById("confettiLayer");
  const questStatus = document.getElementById("questStatus");
  const questFill = document.getElementById("questFill");
  const comboBadge = document.getElementById("comboBadge");
  const hypeMessage = document.getElementById("hypeMessage");
  const controllerEgg = document.getElementById("controllerEgg");
  const cheerAudio = document.getElementById("cheerAudio");

  let items = [];
  let stats = {
    level: 1,
    xp: 0,
    streak: 0,
    completedTotal: 0,
    lastCompletedDay: null,
    achievements: [],
    combo: 0,
    lastCompletionAt: null,
    dailyQuestTarget: 5,
    dailyQuestProgress: 0,
    dailyQuestDay: null,
    foundControllerEgg: false,
  };

  function loadState() {
    try {
      const savedItems = window.localStorage.getItem(STORAGE_KEYS.ITEMS);
      const savedStats = window.localStorage.getItem(STORAGE_KEYS.STATS);
      const savedMode = window.localStorage.getItem(STORAGE_KEYS.MODE);
      if (savedItems) items = JSON.parse(savedItems);
      if (savedStats) stats = { ...stats, ...JSON.parse(savedStats) };
      if (savedMode === "engaged") {
        body.classList.add("mode-engaged");
        modeToggle.textContent = "Switch to Focus Mode";
      }
    } catch (_) {
      // ignore storage errors – app still works
    }
  }

  function persistState() {
    try {
      window.localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      window.localStorage.setItem(
        STORAGE_KEYS.STATS,
        JSON.stringify({
          level: stats.level,
          xp: stats.xp,
          streak: stats.streak,
          completedTotal: stats.completedTotal,
          lastCompletedDay: stats.lastCompletedDay,
          achievements: stats.achievements,
          combo: stats.combo,
          lastCompletionAt: stats.lastCompletionAt,
          dailyQuestTarget: stats.dailyQuestTarget,
          dailyQuestProgress: stats.dailyQuestProgress,
          dailyQuestDay: stats.dailyQuestDay,
          foundControllerEgg: stats.foundControllerEgg,
        })
      );
      window.localStorage.setItem(
        STORAGE_KEYS.MODE,
        body.classList.contains("mode-engaged") ? "engaged" : "minimal"
      );
    } catch (_) {
      // ignore if storage not available
    }
  }

  function renderItems() {
    itemList.innerHTML = "";
    if (!items.length) return;
    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "item" + (item.completed ? " completed" : "");
      li.dataset.id = item.id;

      const left = document.createElement("div");
      left.className = "item-left";

      const checkbox = document.createElement("button");
      checkbox.type = "button";
      checkbox.className = "checkbox-minimal";
      checkbox.setAttribute("aria-label", "Toggle completed");
      checkbox.innerHTML = "<span>✓</span>";

      const text = document.createElement("span");
      text.className = "item-text";
      text.textContent = item.text;

      left.appendChild(checkbox);
      left.appendChild(text);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "item-toggle";
      toggleBtn.textContent = item.completed ? "Undo" : "Done";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "item-delete";
      deleteBtn.textContent = "Delete";

      actions.appendChild(toggleBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(left);
      li.appendChild(actions);

      itemList.appendChild(li);
    });
  }

  function renderStats() {
    if (!statLevel) return;
    statLevel.textContent = stats.level;
    statXP.textContent = stats.xp;
    statStreak.textContent = stats.streak;
    statCompleted.textContent = stats.completedTotal;

    const xpWithinLevel = stats.xp % XP_LEVEL_STEP;
    const pct = Math.max(
      0,
      Math.min(100, Math.round((xpWithinLevel / XP_LEVEL_STEP) * 100))
    );
    if (xpFill) xpFill.style.width = pct + "%";

    if (achievementList) {
      achievementList.innerHTML = "";
      stats.achievements.slice(-5).forEach((ach) => {
        const li = document.createElement("li");
        li.className = "achievement";
        li.innerHTML = `<span>${ach.title}</span> · ${ach.description}`;
        achievementList.appendChild(li);
      });
    }

    if (questStatus && questFill) {
      const today = todayKey();
      if (stats.dailyQuestDay !== today) {
        stats.dailyQuestDay = today;
        stats.dailyQuestProgress = 0;
      }
      const target = stats.dailyQuestTarget || 5;
      const progress = Math.min(stats.dailyQuestProgress, target);
      questStatus.textContent = `${progress} / ${target} today`;
      const pctQuest = Math.max(
        0,
        Math.min(100, Math.round((progress / target) * 100))
      );
      questFill.style.width = pctQuest + "%";
    }

    if (comboBadge) {
      const combo = Math.max(0, stats.combo || 0);
      comboBadge.textContent = combo > 1 ? `Combo x${combo}` : "Combo x1";
    }

    if (hypeMessage) {
      // keep last message; nothing to update here automatically
    }
  }

  function awardXP(delta, context) {
    stats.xp = Math.max(0, stats.xp + delta);
    const newLevel = Math.floor(stats.xp / XP_LEVEL_STEP) + 1;
    if (newLevel > stats.level) {
      stats.level = newLevel;
      addAchievement("Level up!", `You reached level ${newLevel}.`);
      spawnConfetti("level");
      showLevelUpEffects();
      setHypeMessage(
        ["Level up!", "You evolved!", "New tier unlocked!"],
        "You leveled up!"
      );
    } else if (context === "complete") {
      spawnConfetti("small");
    }
  }

  function setHypeMessage(options, fallback) {
    if (!hypeMessage) return;
    const source = Array.isArray(options) && options.length ? options : [fallback];
    const choice = source[Math.floor(Math.random() * source.length)];
    hypeMessage.textContent = choice;
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function handleCompletionStreak() {
    const today = todayKey();
    if (stats.lastCompletedDay === today) return;
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yKey = `${yesterdayDate.getFullYear()}-${
      yesterdayDate.getMonth() + 1
    }-${yesterdayDate.getDate()}`;

    if (stats.lastCompletedDay === yKey) {
      stats.streak += 1;
    } else {
      stats.streak = 1;
    }
    stats.lastCompletedDay = today;

    if (stats.streak === 3) {
      addAchievement("3‑day streak", "You completed items three days in a row.");
    } else if (stats.streak === 7) {
      addAchievement("7‑day streak", "One full week of momentum!");
    }
  }

  function updateComboAndQuest() {
    const now = Date.now();
    const COMBO_WINDOW_MS = 10000;

    if (stats.lastCompletionAt && now - stats.lastCompletionAt <= COMBO_WINDOW_MS) {
      stats.combo = (stats.combo || 0) + 1;
    } else {
      stats.combo = 1;
    }
    stats.lastCompletionAt = now;

    if (comboBadge && stats.combo > 1) {
      comboBadge.classList.add("combo-badge--hot");
      window.setTimeout(() => {
        comboBadge.classList.remove("combo-badge--hot");
      }, 800);
    }

    const today = todayKey();
    if (stats.dailyQuestDay !== today) {
      stats.dailyQuestDay = today;
      stats.dailyQuestProgress = 0;
    }
    stats.dailyQuestProgress += 1;

    if (
      stats.dailyQuestProgress === stats.dailyQuestTarget &&
      stats.dailyQuestTarget > 0
    ) {
      awardXP(20, "quest");
      addAchievement(
        "Quest complete",
        `You finished today's quest of ${stats.dailyQuestTarget} items.`
      );
      setHypeMessage(
        ["Quest complete!", "Daily mission cleared!", "You crushed today's goal!"],
        "Quest complete!"
      );
    }

    if (stats.combo >= 3) {
      awardXP(3, "combo");
      if (stats.combo === 3) {
        addAchievement("Combo starter", "Hit a 3‑item completion combo.");
      } else if (stats.combo === 5) {
        addAchievement("On fire", "5 quick completions in a row!");
      }
      setHypeMessage(
        ["Combo!", "You're on fire!", "Keep the chain going!"],
        "Nice combo!"
      );
    } else {
      setHypeMessage(
        ["Nice!", "Good job!", "One more?", "Momentum started."],
        "Nice work!"
      );
    }
  }

  function addAchievement(title, description) {
    stats.achievements.push({ title, description, at: Date.now() });
  }

  function spawnConfetti(kind) {
    if (!confettiLayer || !body.classList.contains("mode-engaged")) return;
    const colors =
      kind === "level"
        ? ["#22c55e", "#22d3ee", "#6366f1", "#ec4899", "#facc15"]
        : ["#22c55e", "#22d3ee", "#6366f1"];
    const count = kind === "level" ? 40 : 18;
    const rect = confettiLayer.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const bit = document.createElement("div");
      bit.className = "confetti-bit";
      bit.style.left = rect.width / 2 + (Math.random() * 80 - 40) + "px";
      bit.style.top = rect.height / 3 + (Math.random() * 30 - 15) + "px";
      bit.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      bit.style.animationDelay = Math.random() * 0.25 + "s";
      confettiLayer.appendChild(bit);
      bit.addEventListener("animationend", () => bit.remove());
    }
  }

  function runBikeOverItem(li) {
    if (!body.classList.contains("mode-engaged") || !li || !confettiLayer) return;
    const rect = li.getBoundingClientRect();
    const bike = document.createElement("div");
    bike.className = "bike-run";
    bike.style.top = rect.top - 24 + "px";
    bike.style.left = rect.left - 60 + "px";
    confettiLayer.appendChild(bike);
    bike.addEventListener("animationend", () => {
      bike.remove();
    });
  }

  function playCheer() {
    if (!cheerAudio || !body.classList.contains("mode-engaged")) return;
    try {
      cheerAudio.currentTime = 0;
      cheerAudio.volume = 0.55;
      cheerAudio.play();
      window.setTimeout(() => {
        try {
          cheerAudio.pause();
        } catch (_) {
          // ignore
        }
      }, 5000);
    } catch (_) {
      // audio might be blocked or missing; ignore
    }
  }

  function showLevelUpEffects() {
    if (!confettiLayer || !body.classList.contains("mode-engaged")) return;
    const trophy = document.createElement("div");
    trophy.className = "levelup-trophy";
    const fireworks = document.createElement("div");
    fireworks.className = "levelup-fireworks";
    confettiLayer.appendChild(fireworks);
    confettiLayer.appendChild(trophy);
    const cleanup = () => {
      fireworks.remove();
      trophy.remove();
    };
    setTimeout(cleanup, 1900);
  }

  function addItem(text) {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(16).slice(2),
      text: text.trim(),
      completed: false,
    };
    items.unshift(item);
    renderItems();
    persistState();
  }

  function toggleItem(id, liElement) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const wasCompleted = item.completed;
    item.completed = !item.completed;
    if (!wasCompleted && item.completed) {
      stats.completedTotal += 1;
      awardXP(XP_PER_COMPLETE, "complete");
      handleCompletionStreak();
      updateComboAndQuest();
      playCheer();
      if (liElement) {
        runBikeOverItem(liElement);
      }
      if (stats.completedTotal === 1) {
        addAchievement("First completion", "You completed your first item.");
      } else if (stats.completedTotal === 10) {
        addAchievement("10 items", "Ten items completed. Momentum unlocked.");
      }
    } else if (wasCompleted && !item.completed) {
      awardXP(XP_PER_DELETE_COMPLETED, "undo");
    }
    renderItems();
    renderStats();
    persistState();
  }

  function deleteItem(id) {
    const item = items.find((i) => i.id === id);
    items = items.filter((i) => i.id !== id);
    if (item && item.completed) {
      awardXP(XP_PER_DELETE_COMPLETED, "deleteCompleted");
    }
    renderItems();
    renderStats();
    persistState();
  }

  function toggleMode() {
    const engaged = body.classList.toggle("mode-engaged");
    modeToggle.textContent = engaged
      ? "Switch to Focus Mode"
      : "Switch to Play Mode";
    persistState();
  }

  // Event wiring
  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      toggleMode();
    });
  }

  if (itemForm) {
    itemForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = itemInput.value.trim();
      if (!value) return;
      addItem(value);
      itemInput.value = "";
      itemInput.focus();
    });
  }

  if (itemList) {
    itemList.addEventListener("click", (e) => {
      const target = e.target;
      const li = target.closest(".item");
      if (!li) return;
      const id = li.dataset.id;
      if (target.classList.contains("item-toggle") || target.closest(".checkbox-minimal")) {
        toggleItem(id, li);
      } else if (target.classList.contains("item-delete")) {
        deleteItem(id);
      }
    });
  }

  if (controllerEgg) {
    controllerEgg.addEventListener("mouseenter", () => {
      controllerEgg.classList.add("controller-egg--wiggle");
      window.setTimeout(() => {
        controllerEgg.classList.remove("controller-egg--wiggle");
      }, 800);

      if (!stats.foundControllerEgg) {
        stats.foundControllerEgg = true;
        awardXP(5, "egg");
        addAchievement(
          "Secret found",
          "You discovered the hidden controller. Gamer mode unlocked."
        );
        setHypeMessage(
          ["You found the secret controller!", "Gamer mode: ON", "Hidden easter egg unlocked!"],
          "Secret found!"
        );
        renderStats();
        persistState();
      } else {
        setHypeMessage(
          ["Controller vibes.", "Tap tap tap.", "Press start to continue."],
          "Nice controller hover!"
        );
      }
    });
  }

  loadState();
  renderItems();
  renderStats();
})();


