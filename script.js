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
  const itemPriority = document.getElementById("itemPriority");
  const itemList = document.getElementById("itemList");

  const userNameLabel = document.getElementById("userNameLabel");
  const logoutBtn = document.getElementById("logoutBtn");

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
  const levelToast = document.getElementById("levelToast");
  const levelToastText = document.getElementById("levelToastText");
  const levelUpModal = document.getElementById("levelUpModal");
  const levelUpMessage = document.getElementById("levelUpMessage");
  const levelUpOk = document.getElementById("levelUpOk");
  const profileModal = document.getElementById("profileModal");
  const profileClose = document.getElementById("profileClose");
  const profileBtn = document.getElementById("profileBtn");
  const profileName = document.getElementById("profileName");
  const profileUsername = document.getElementById("profileUsername");
  const profileEmail = document.getElementById("profileEmail");
  const profileLevel = document.getElementById("profileLevel");
  const profileXP = document.getElementById("profileXP");
  const profileStreak = document.getElementById("profileStreak");
  const profileCompleted = document.getElementById("profileCompleted");

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

  const API_BASE = "http://localhost:4000/api";
  let authToken = null;
  let isGuest = false;
  let currentUserEmail = null;
  let currentUserName = null;
  let currentUserUsername = null;

  function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function loadState() {
    try {
      const savedItems = window.localStorage.getItem(STORAGE_KEYS.ITEMS);
      const savedStats = window.localStorage.getItem(STORAGE_KEYS.STATS);
      const savedMode = window.localStorage.getItem(STORAGE_KEYS.MODE);
      const savedToken = window.localStorage.getItem("dualNature_token");
      const savedGuest = window.localStorage.getItem("dualNature_guest");
      const savedEmail = window.localStorage.getItem("dualNature_email");
      const savedName = window.localStorage.getItem("dualNature_name");
      const savedUsername = window.localStorage.getItem("dualNature_username");
      if (savedItems) {
        items = JSON.parse(savedItems);
        // Ensure all items have priority and createdAt
        const now = Date.now();
        items = items.map((item, index) => ({
          ...item,
          priority: item.priority || "medium",
          createdAt: item.createdAt || (now - (items.length - index) * 1000),
        }));
      }
      if (savedStats) stats = { ...stats, ...JSON.parse(savedStats) };
      if (savedToken) authToken = savedToken;
      if (savedGuest === "1") isGuest = true;
      if (savedEmail) currentUserEmail = savedEmail;
      if (savedName) currentUserName = savedName;
      if (savedUsername) currentUserUsername = savedUsername;
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
      // For guests: keep local copy; for logged-in users DB is source of truth
      if (!authToken) {
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
      }
      window.localStorage.setItem(
        STORAGE_KEYS.MODE,
        body.classList.contains("mode-engaged") ? "engaged" : "minimal"
      );
    } catch (_) {
      // ignore if storage not available
    }
  }

  function getPriorityOrder(priority) {
    const order = { high: 0, medium: 1, low: 2 };
    return order[priority] ?? 1;
  }

  function sortItems() {
    items.sort((a, b) => {
      const priorityA = getPriorityOrder(a.priority || "medium");
      const priorityB = getPriorityOrder(b.priority || "medium");
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // Within same priority, newest first (highest timestamp first)
      // Fallback to 0 if createdAt is missing, but ensure it's set
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      // Return negative if b should come before a (b is newer)
      return timeB - timeA;
    });
  }

  function renderItems() {
    itemList.innerHTML = "";
    if (!items.length) return;
    sortItems();
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

      const priorityBadge = document.createElement("span");
      priorityBadge.className = `priority-badge priority-${item.priority || "medium"}`;
      priorityBadge.textContent = (item.priority || "medium").charAt(0).toUpperCase() + (item.priority || "medium").slice(1);
      priorityBadge.setAttribute("aria-label", `Priority: ${item.priority || "medium"}`);

      const text = document.createElement("span");
      text.className = "item-text";
      text.textContent = item.text;

      left.appendChild(checkbox);
      left.appendChild(priorityBadge);
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
      showLevelUpEffects(newLevel);
      showLevelToast(newLevel);
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

  function showLevelUpEffects(level) {
    if (!levelUpModal) return;
    if (levelUpMessage) {
      levelUpMessage.textContent = `You reached level ${level}.`;
    }
    levelUpModal.classList.add("levelup-modal--visible");
    levelUpModal.setAttribute("aria-hidden", "false");
  }

  function showLevelToast(level) {
    if (!levelToast) return;
    if (levelToastText) {
      levelToastText.textContent = `Congratulations! You reached level ${level}.`;
    }
    levelToast.classList.remove("level-toast--visible");
    // force reflow so animation restarts
    void levelToast.offsetWidth;
    levelToast.classList.add("level-toast--visible");
  }

  function updateUserUI() {
      if (userNameLabel) {
        if (authToken && (currentUserName || currentUserEmail)) {
          const displayName = currentUserName || currentUserEmail;
          userNameLabel.textContent = capitalizeFirst(displayName);
        } else if (isGuest) {
          userNameLabel.textContent = "Guest";
        } else {
          userNameLabel.textContent = "Not signed in";
        }
      }
    if (logoutBtn) {
      logoutBtn.style.display = authToken || isGuest ? "inline-flex" : "none";
    }
  }

  async function apiRequest(path, options = {}) {
    if (!API_BASE) return null;
    const headers = options.headers || {};
    const authHeaders =
      authToken && !path.startsWith("/auth/")
        ? { Authorization: "Bearer " + authToken }
        : {};
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...headers,
      },
    });
    if (!res.ok) {
      console.warn("API error", res.status);
      return null;
    }
    return res.json();
  }

  async function syncFromServer() {
    if (!authToken) return;
    try {
      const [remoteItems, remoteStats] = await Promise.all([
        apiRequest("/items"),
        apiRequest("/stats"),
      ]);
      if (Array.isArray(remoteItems)) {
        items = remoteItems.map((it) => ({
          id: it._id,
          text: it.text,
          completed: !!it.completed,
          priority: it.priority || "medium",
          createdAt: it.createdAt || Date.now(),
        }));
      }
      if (remoteStats && typeof remoteStats === "object") {
        stats.level = remoteStats.level ?? stats.level;
        stats.xp = remoteStats.xp ?? stats.xp;
        stats.streak = remoteStats.streak ?? stats.streak;
        stats.completedTotal =
          remoteStats.completedTotal ?? stats.completedTotal;
        stats.lastCompletedDay =
          remoteStats.lastCompletedDay ?? stats.lastCompletedDay;
      }
      renderItems();
      renderStats();
      persistState();
    } catch (e) {
      console.warn("Failed to sync from server", e);
    }
  }

  async function pushStats() {
    if (!authToken) return;
    try {
      await apiRequest("/stats", {
        method: "PATCH",
        body: JSON.stringify({
          level: stats.level,
          xp: stats.xp,
          streak: stats.streak,
          completedTotal: stats.completedTotal,
          lastCompletedDay: stats.lastCompletedDay,
        }),
      });
    } catch (e) {
      console.warn("Failed to push stats", e);
    }
  }

  async function addItem(text, priority = "medium") {
    const clean = text.trim();
    if (!clean) return;
    const createdAt = Date.now();
    
    if (authToken) {
      const created = await apiRequest("/items", {
        method: "POST",
        body: JSON.stringify({ text: clean, completed: false, priority: priority }),
      });
      if (created && created._id) {
        items.push({
          id: created._id,
          text: created.text,
          completed: !!created.completed,
          priority: created.priority || priority,
          createdAt: created.createdAt || createdAt,
        });
      }
    } else {
      const item = {
        id: createdAt.toString(36) + Math.random().toString(16).slice(2),
        text: clean,
        completed: false,
        priority: priority,
        createdAt: createdAt,
      };
      items.push(item);
    }
    renderItems();
    persistState();
  }

  async function toggleItem(id, liElement) {
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

    if (authToken) {
      try {
        await apiRequest(`/items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            completed: item.completed,
            text: item.text,
            priority: item.priority || "medium",
          }),
        });
        await pushStats();
      } catch (e) {
        console.warn("Failed to sync toggle", e);
      }
    } else {
      pushStats();
    }

    renderItems();
    renderStats();
    persistState();
  }

  async function deleteItem(id) {
    const item = items.find((i) => i.id === id);
    items = items.filter((i) => i.id !== id);
    if (item && item.completed) {
      awardXP(XP_PER_DELETE_COMPLETED, "deleteCompleted");
    }

    if (authToken) {
      try {
        await apiRequest(`/items/${id}`, { method: "DELETE" });
        await pushStats();
      } catch (e) {
        console.warn("Failed to delete on server", e);
      }
    } else {
      pushStats();
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

  // Auth (login/signup) is handled on separate pages now (login.html, signup.html)

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
      const priority = itemPriority ? itemPriority.value : "medium";
      addItem(value, priority);
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

  if (levelUpOk && levelUpModal) {
    levelUpOk.addEventListener("click", () => {
      levelUpModal.classList.remove("levelup-modal--visible");
      levelUpModal.setAttribute("aria-hidden", "true");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      authToken = null;
      isGuest = false;
      currentUserEmail = null;
      window.localStorage.removeItem("dualNature_token");
      window.localStorage.removeItem("dualNature_email");
      window.localStorage.removeItem("dualNature_guest");
      window.localStorage.removeItem("dualNature_name");
      window.localStorage.removeItem("dualNature_username");
      // Reset in-memory state
      items = [];
      stats = {
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
      renderItems();
      renderStats();
      updateUserUI();
      window.location.assign("/login.html");
    });
  }

  if (profileBtn && profileModal) {
    profileBtn.addEventListener("click", () => {
      if (profileName) {
        const displayName = currentUserName || currentUserEmail || "Guest";
        profileName.textContent = capitalizeFirst(displayName);
      }
      if (profileUsername) {
        profileUsername.textContent = currentUserUsername || (isGuest ? "-" : "");
      }
      if (profileEmail) {
        profileEmail.textContent = currentUserEmail || (isGuest ? "-" : "");
      }
      if (profileLevel) profileLevel.textContent = stats.level;
      if (profileXP) profileXP.textContent = stats.xp;
      if (profileStreak) profileStreak.textContent = stats.streak;
      if (profileCompleted) profileCompleted.textContent = stats.completedTotal;
      profileModal.classList.add("profile-modal--visible");
      profileModal.setAttribute("aria-hidden", "false");
    });
  }

  if (profileClose && profileModal) {
    profileClose.addEventListener("click", () => {
      profileModal.classList.remove("profile-modal--visible");
      profileModal.setAttribute("aria-hidden", "true");
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
  // If user is neither logged in nor marked as guest, send them to login page
  if (!authToken && !isGuest) {
    window.location.assign("/login.html");
    return;
  }
  renderItems();
  renderStats();
  if (authToken) {
    syncFromServer();
  }
  updateUserUI();
})();


