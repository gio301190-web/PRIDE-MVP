const supabaseClient = window.supabase.createClient(
  window.PRIDE_CONFIG.SUPABASE_URL,
  window.PRIDE_CONFIG.SUPABASE_PUBLISHABLE_KEY
);

const app = document.getElementById("app");

let currentUser = null;
let currentProfile = null;
let currentWallet = null;
let currentPlayer = null;
let currentAuthMode = "login";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(error) {
  console.error(error);
  alert(error?.message || "Произошла ошибка.");
}

function nav(active = "wallet") {
  const isGameActive = active === "player" || active === "game";
  const isWalletActive = active === "wallet";
  const isAcademyActive = active === "academy";
  const isAdminActive = active === "admin";

  return `
    <header class="topbar">
      <div class="top-actions">
        <button class="btn ${isGameActive ? "active" : ""}" onclick="theGame()">
          THE GAME
        </button>

        <button class="btn ${isWalletActive ? "active" : ""}" onclick="goWallet()">
          PRIDE WALLET
        </button>

        <button class="btn ${isAcademyActive ? "active" : ""}" onclick="bsAcademy()">
          BS ACADEMY
        </button>

        ${
          currentUser && currentProfile?.role === "FOUNDER"
            ? `<button class="btn ${isAdminActive ? "active" : ""}" onclick="admin()">Admin</button>`
            : ""
        }

        ${currentUser ? `<button class="btn" onclick="logout()">Выйти</button>` : ""}
      </div>
    </header>
  `;
}

function theGame() {
  if (!currentUser) return auth("login");

  if (currentProfile?.role === "SELLER" || currentProfile?.role === "FOUNDER") {
    return player();
  }

  app.innerHTML = `
    ${nav("game")}
    <main class="page">
      <section class="hero">
        <div class="eyebrow">THE GAME</div>
        <h1>Доступ игрока пока закрыт</h1>
        <p class="muted">
          Функции Player доступны только зарегистрированным Player.
          Обратитесь к своему спонсору, чтобы получить доступ.
        </p>
      </section>
      <section class="card">
        <button class="btn primary" onclick="goWallet()">ПЕРЕЙТИ В WALLET</button>
      </section>
    </main>
  `;
}

function goWallet() {
  if (!currentUser) return auth("wallet");
  return wallet();
}

function bsAcademy() {
  if (!currentUser) return auth("academy");

  app.innerHTML = `
    ${nav("academy")}
    <main class="page">

      <section class="hero-visual hero-visual-academy">
        <div class="hero-visual-grid"></div>
        <div class="hero-visual-content">
          <div class="eyebrow">BS ACADEMY</div>
          <h1>ОБУЧЕНИЕ<br>В РАЗРАБОТКЕ</h1>
          <p class="muted">
            Финансовая грамотность, продажи, карьерные программы.
          </p>
        </div>
      </section>

      <section class="card" style="text-align:center;">
        <p class="muted">
          Раздел BS Academy находится в разработке. Скоро здесь появятся курсы и обучающие материалы.
        </p>
      </section>

    </main>
  `;
}

function auth(mode = "login") {
  currentAuthMode = mode;

  const isWalletLogin = mode === "wallet";
  const isAcademyLogin = mode === "academy";
  const isIdLogin = mode === "login" || mode === "academy";

  const navActive = isWalletLogin ? "wallet" : isAcademyLogin ? "academy" : "game";

  const visualClass = isWalletLogin
    ? "hero-visual-wallet"
    : isAcademyLogin
    ? "hero-visual-academy"
    : "hero-visual-game";

  const visualContent = isWalletLogin
    ? `
      <h1>PRIDE<br>WALLET</h1>
      <p class="muted">
        Личный виртуальный финансовый кабинет внутри игровой экосистемы THE GAME.<br>
        Изучаем финансовую грамотность используя виртуальный счёт PRIDE.
      </p>
    `
    : isAcademyLogin
    ? `
      <h1>BS ACADEMY</h1>
      <p class="muted">
        Обучение внутри игровой экосистемы THE GAME.
      </p>
    `
    : `
      <h1>WELCOME TO<br>THE GAME</h1>
      <p class="muted">
        Добро пожаловать в игру.<br>
        Обучение, карьера и заработок — в одной экосистеме.
      </p>
    `;

  const cardEyebrow = "ВХОД";

  app.innerHTML = `
    ${nav(navActive)}

    <main class="auth-page">

      <section class="hero-visual ${visualClass}">
        <div class="hero-visual-grid"></div>
        <div class="hero-visual-content">
          ${visualContent}
        </div>
      </section>

      <div class="auth-card">

        <div class="eyebrow">
          ${cardEyebrow}
        </div>

        <div class="field">
          <label>
            ${isWalletLogin ? "НОМЕР WALLET" : "PLAYER ID"}
          </label>

          <input
            id="email"
            type="text"
            placeholder="${
              isWalletLogin ? "PRD-XXXXXXXX" : "00000000"
            }"
          >
        </div>

        <div class="field">
          <label>Пароль</label>

          <input
            id="pass"
            type="password"
            placeholder="Минимум 6 символов"
          >
        </div>

        <button
          class="btn primary"
          style="width:100%;"
          onclick="login()"
        >
          ВОЙТИ
        </button>

        <p class="small muted" style="margin-top:18px">
          ${
            isWalletLogin
              ? "Используйте номер Wallet и пароль, полученные при регистрации."
              : "Используйте Player ID и пароль, полученные при регистрации у своего спонсора."
          }
        </p>

      </div>
    </main>
  `;
}

async function register() {
  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const pass = document.getElementById("pass")?.value;
  const sponsor = document.getElementById("sponsor")?.value.trim();

  if (!name || !email || !pass) {
    return alert("Заполните имя, email и пароль.");
  }

  if (pass.length < 6) {
    return alert("Пароль должен содержать минимум 6 символов.");
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: name,
          sponsor_pride_id: sponsor || null
        }
      }
    });

    if (error) throw error;

    if (!data.session) {
      alert(
        "Регистрация создана. Для этого проекта требуется подтверждение email."
      );
      return auth("login");
    }

    await loadSession();

    alert("PRIDE ID создан. Wallet создан автоматически.");
    wallet();

  } catch (error) {
    showError(error);
  }
}
async function walletRegister() {
  if (!currentUser || (currentProfile?.role !== "SELLER" && currentProfile?.role !== "FOUNDER")) {
    return alert("Регистрация клиента доступна только Player.");
  }

  app.innerHTML = `
    ${nav("player")}

    <main class="page">
      <section class="hero">
        <div class="eyebrow">PRIDE WALLET</div>
        <h1>Регистрация Wallet клиенту</h1>
        <p class="muted">
          Создайте Wallet для нового клиента. Он станет вашим подопечным.
        </p>
      </section>

      <section class="card" style="max-width:560px;margin:0 auto;">

        <div class="field">
          <label>ИМЯ И ФАМИЛИЯ</label>
          <input
            id="wallet_name"
            type="text"
            placeholder="Имя Фамилия"
          >
        </div>

        <div class="field">
          <label>EMAIL</label>
          <input
            id="wallet_email"
            type="email"
            placeholder="email@example.com"
          >
        </div>

        <div class="field">
          <label>ТЕЛЕФОН</label>
          <input
            id="wallet_phone"
            type="text"
            placeholder="+995..."
          >
        </div>

        <div class="field">
          <label>СУММА КОНТРАКТА, PRD</label>
          <input
            id="wallet_contract"
            type="number"
            min="10000"
            step="1"
            placeholder="10000"
          >
        </div>

        <div class="field">
          <label>ПАРОЛЬ</label>
          <input
            id="wallet_pass"
            type="password"
            placeholder="Минимум 6 символов"
          >
        </div>

        <div class="field">
          <label>ПОВТОРИТЕ ПАРОЛЬ</label>
          <input
            id="wallet_pass2"
            type="password"
            placeholder="Повторите пароль"
          >
        </div>

        <button
          class="btn primary"
          style="width:100%;margin-top:15px;"
          onclick="submitWalletRegistration()"
        >
          СОЗДАТЬ WALLET
        </button>

        <button
          class="btn"
          style="width:100%;margin-top:8px;"
          onclick="player()"
        >
          НАЗАД
        </button>

      </section>
    </main>
  `;
}



async function login() {
  const loginValue =
    document.getElementById("email")?.value.trim();

  const pass =
    document.getElementById("pass")?.value;

  if (!loginValue || !pass) {
    return alert("Введите логин и пароль.");
  }

  try {
    let email = loginValue;

    const isWalletLogin =
      loginValue.toUpperCase().startsWith("PRD-");

    if (isWalletLogin) {
      const { data, error } =
        await supabaseClient.rpc(
          "get_wallet_login_email",
          {
            p_wallet_id: loginValue
          }
        );

      if (error) {
        throw error;
      }

      if (!data) {
        return alert("Wallet с таким номером не найден.");
      }

      email = data;
    } else if (loginValue.includes("@")) {
      // старый вход по email (оставлен для обратной совместимости)
      email = loginValue;
    } else {
      // вход по Player ID
      const { data, error } =
        await supabaseClient.rpc(
          "get_player_login_email",
          {
            p_player_id: loginValue
          }
        );

      if (error) {
        throw error;
      }

      if (!data) {
        return alert("Player с таким ID не найден.");
      }

      email = data;
    }

    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password: pass
      });

    if (error) {
      throw error;
    }

    await loadSession();

    if (isWalletLogin) {
      wallet();
    } else if (currentAuthMode === "academy") {
      bsAcademy();
    } else {
      theGame();
    }

  } catch (error) {
    showError(error);
  }
}
async function submitWalletRegistration() {
  const name =
    document.getElementById("wallet_name")?.value.trim();

  const email =
    document.getElementById("wallet_email")?.value.trim();

  const phone =
    document.getElementById("wallet_phone")?.value.trim();

  const contract =
    Number(document.getElementById("wallet_contract")?.value);

  const pass =
    document.getElementById("wallet_pass")?.value;

  const pass2 =
    document.getElementById("wallet_pass2")?.value;

  if (!name || !email || !pass || !pass2) {
    return alert("Заполните имя, email и пароль.");
  }

  if (pass.length < 6) {
    return alert("Пароль должен содержать минимум 6 символов.");
  }

  if (pass !== pass2) {
    return alert("Пароли не совпадают.");
  }

  if (!contract || contract < 10000) {
    return alert("Минимальная сумма контракта — 10 000 PRD.");
  }

  if (!currentProfile?.pride_id) {
    return alert("Не удалось определить спонсора. Войдите заново.");
  }

  try {
    // регистрацию делаем через отдельный клиент, чтобы не потерять
    // текущую сессию Player/Founder (signUp меняет активную сессию)
    const regClient = window.supabase.createClient(
      window.PRIDE_CONFIG.SUPABASE_URL,
      window.PRIDE_CONFIG.SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error } = await regClient.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: name,
          phone: phone || null,
          account_type: "WALLET",
          contract_amount: contract,
          sponsor_pride_id: currentProfile.pride_id
        }
      }
    });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error("Не удалось создать Wallet.");
    }

    const { data: walletData, error: walletError } =
      await supabaseClient
        .from("wallets")
        .select("wallet_id")
        .eq("owner_id", data.user.id)
        .single();

    if (walletError) {
      throw walletError;
    }

    const walletId = walletData.wallet_id;

    app.innerHTML = `
      <main class="page">

        <section class="card" style="
          max-width:560px;
          margin:80px auto;
          text-align:center;
        ">

          <div class="eyebrow">
            PRIDE WALLET
          </div>

          <h1 style="
            font-size:32px;
            margin:18px 0 10px;
          ">
            ПОЗДРАВЛЯЕМ!
          </h1>

          <p style="
            font-size:18px;
            font-weight:700;
            margin-bottom:10px;
          ">
            Wallet успешно создан
          </p>

          <p class="muted" style="
            margin-bottom:35px;
          ">
            Передайте эти данные клиенту.
          </p>

          <div style="
            background:var(--panel2);
            border-radius:14px;
            padding:24px;
            text-align:left;
            margin-bottom:25px;
          ">

            <div style="
              font-size:11px;
              letter-spacing:.16em;
              color:var(--muted);
              font-weight:800;
              margin-bottom:7px;
            ">
              ЛОГИН
            </div>

            <div style="
              font-size:22px;
              font-weight:900;
              margin-bottom:22px;
            ">
              ${walletId}
            </div>

            <div style="
              font-size:11px;
              letter-spacing:.16em;
              color:var(--muted);
              font-weight:800;
              margin-bottom:7px;
            ">
              ПАРОЛЬ
            </div>

            <div style="
              font-size:22px;
              font-weight:900;
              word-break:break-all;
            ">
              ${pass}
            </div>

          </div>

          <p class="muted" style="
            font-size:13px;
            line-height:1.5;
            margin-bottom:25px;
          ">
            Клиент входит в свой Wallet этим логином и паролем.
            Для активации сделайте на этот Wallet перевод.
          </p>

          <button
            class="btn primary"
            style="width:100%;margin-bottom:10px;"
            onclick="copyWalletCredentials(
              '${walletId}',
              '${pass.replace(/'/g, "\\'")}'
            )"
          >
            СКОПИРОВАТЬ ДАННЫЕ
          </button>

          <button
            class="btn"
            style="width:100%;"
            onclick="player()"
          >
            ВЕРНУТЬСЯ В КАБИНЕТ PLAYER
          </button>

        </section>

      </main>
    `;

  } catch (error) {
    showError(error);
  }
}

function registerPlayerScreen() {
  if (!currentUser || (currentProfile?.role !== "SELLER" && currentProfile?.role !== "FOUNDER")) {
    return alert("Регистрация Player доступна только Player.");
  }

  app.innerHTML = `
    ${nav("player")}

    <main class="page">
      <section class="hero">
        <div class="eyebrow">PRIDE PLAYER</div>
        <h1>Регистрация Player</h1>
        <p class="muted">
          Найдите своего клиента по PRIDE ID и сделайте его Player.
          У клиента уже должен быть свой Wallet.
        </p>
      </section>

      <section class="card" style="max-width:560px;margin:0 auto;">

        <div class="field">
          <label>PRIDE ID КЛИЕНТА</label>
          <input id="player_search_id" type="text" placeholder="00000000">
        </div>

        <button class="btn primary" style="width:100%;" onclick="searchClientForPlayer()">
          НАЙТИ
        </button>

        <div id="player_search_result" style="margin-top:20px;"></div>

        <button class="btn" style="width:100%;margin-top:15px;" onclick="player()">
          НАЗАД
        </button>

      </section>
    </main>
  `;
}

async function searchClientForPlayer() {
  const prideId = document.getElementById("player_search_id")?.value.trim();
  const resultBox = document.getElementById("player_search_result");

  if (!prideId) {
    return alert("Введите PRIDE ID.");
  }

  resultBox.innerHTML = `<p class="muted">Поиск...</p>`;

  try {
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("id, pride_id, full_name, role, wallets(id, wallet_id, status)")
      .eq("pride_id", prideId.toUpperCase())
      .eq("sponsor_id", currentProfile.id)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      resultBox.innerHTML = `<div class="empty">Клиент не найден среди зарегистрированных вами.</div>`;
      return;
    }

    if (profile.role !== "WALLET_USER") {
      resultBox.innerHTML = `<div class="empty">Этот пользователь уже Player.</div>`;
      return;
    }

    const clientWallet = Array.isArray(profile.wallets) ? profile.wallets[0] : profile.wallets;

    if (!clientWallet) {
      resultBox.innerHTML = `<div class="empty">У клиента ещё нет Wallet. Сначала зарегистрируйте Wallet.</div>`;
      return;
    }

    resultBox.innerHTML = `
      <div class="card" style="background:var(--panel2);">
        <div class="card-label">КЛИЕНТ</div>
        <div class="big-value" style="font-size:18px;">${esc(profile.full_name)}</div>
        <p class="muted" style="margin-top:6px;">PRIDE ID: ${esc(profile.pride_id)}</p>
        <p class="muted">Зарплатный Wallet: <strong>${esc(clientWallet.wallet_id)}</strong></p>
      </div>

      <button class="btn primary" style="width:100%;margin-top:14px;"
        onclick="submitRegisterPlayer('${profile.id}', '${clientWallet.id}')">
        СДЕЛАТЬ PLAYER
      </button>
    `;
  } catch (error) {
    showError(error);
  }
}

async function submitRegisterPlayer(targetProfileId, salaryWalletId) {
  if (!confirm("Зарегистрировать этого клиента как Player? Указанный Wallet станет его зарплатным.")) return;

  try {
    const { data, error } = await supabaseClient.rpc("register_player", {
      p_target_profile_id: targetProfileId,
      p_salary_wallet_id: salaryWalletId
    });

    if (error) throw error;

    alert(`Player зарегистрирован. Player ID: ${data.player_id}`);
    player();
  } catch (error) {
    showError(error);
  }
}

function copyWalletCredentials(walletId, password) {
  const text =
    "PRIDE WALLET\n\n" +
    "Логин: " + walletId + "\n" +
    "Пароль: " + password;

  navigator.clipboard.writeText(text)
    .then(() => {
      alert("Данные для входа скопированы.");
    })
    .catch(() => {
      alert(
        "Не удалось автоматически скопировать данные.\n\n" +
        text
      );
    });
}
async function logout() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;
  currentWallet = null;
  currentPlayer = null;

  auth("login");
}

async function loadSession() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) throw error;

  if (!user) {
    currentUser = null;
    currentProfile = null;
    currentWallet = null;
    currentPlayer = null;
    return;
  }

  currentUser = user;

  const profileResult = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileResult.error) throw profileResult.error;

  currentProfile = profileResult.data;

  const walletResult = await supabaseClient
    .from("wallets")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (walletResult.error && walletResult.error.code !== "PGRST116") {
    throw walletResult.error;
  }

  currentWallet = walletResult.data || null;

  const playerResult = await supabaseClient
    .from("player_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (playerResult.error) {
    console.warn("Player profile:", playerResult.error);
  }

  currentPlayer = playerResult.data || null;
}
async function wallet() {
  if (!currentUser || !currentProfile) {
    return auth("wallet");
  }

  const { data: walletRecord, error } = await supabaseClient
    .from("wallets")
    .select(`
      wallet_id,
      status,
      prd_balance,
      contract_amount,
      loan_amount,
      collateral_amount,
      free_balance,
      is_founder_wallet
    `)
    .eq("owner_id", currentProfile.id)
    .maybeSingle();

  if (error) {
    showError(error);
    return;
  }

  currentWallet = walletRecord || null;

  const profileId = currentProfile.pride_id || currentProfile.prideId || "—";
  const walletId = currentWallet?.wallet_id || "—";
  const status = currentWallet?.status || "INACTIVE";

  const contract = Number(currentWallet?.contract_amount || 0);
  const balance = Number(currentWallet?.prd_balance || 0);
  const loan = Number(currentWallet?.loan_amount || 0);
  const freeBalance = Number(currentWallet?.free_balance || 0);
  const isFounderWallet = currentWallet?.is_founder_wallet === true;

  const money = (value) =>
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2
    }).format(value) + " PRD";

  const isActive = status === "ACTIVE";

  app.innerHTML = `
    ${nav("wallet")}

    <main class="page">

      <section class="wallet-header">
  <div class="wallet-name">
    ${esc(currentProfile.full_name || "Участник")}
  </div>

  <div class="wallet-number">
    ${esc(walletId)}
  </div>
</section>

      ${
  !isActive
    ? `
      <section class="wallet-inactive">
        <h2>КАБИНЕТ НЕАКТИВЕН</h2>

        <p class="muted">
          Для активации на этот Wallet должно поступить:
          <strong>${money(100 + Math.round(contract * 0.07 * 100) / 100)}</strong>
          (100 PRD активация + 7% комиссии по контракту ${money(contract)}).
        </p>

        <p class="muted">
          Средства можно занести частями — статус изменится на «Активен»
          автоматически, как только сумма будет набрана.
        </p>

        <p class="muted" style="margin-top:16px;">
          Номер вашего Wallet для перевода:
        </p>
        <p style="font-size:22px;font-weight:900;">${esc(walletId)}</p>
      </section>
    `
    : `

            <section class="wallet-finance-center">

              

              <div class="wallet-finance">

                <div class="wallet-finance-row">
                  <span>КОНТРАКТ</span>
                  <strong>${money(contract)}</strong>
                </div>

                <div class="wallet-finance-row">
                  <span>БАЛАНС</span>
                  <strong>${money(balance)}</strong>
                </div>

                <div class="wallet-finance-row">
                  <span>ЗАЙМ</span>
                  <strong>${money(loan)}</strong>
                </div>

                <div class="wallet-finance-row">
                  <span>ОСТАТОК</span>
                  <strong>${money(freeBalance)}</strong>
                </div>

              </div>

            </section>
            
            <section class="wallet-sidebar">

            

              <div class="wallet-menu">

                <button class="btn" onclick="walletData()">
                  ДАННЫЕ
                </button>

                <button class="btn" onclick="walletIncreaseContract()">
                  УВЕЛИЧИТЬ КОНТРАКТ
                </button>

                <button class="btn" onclick="walletTransactions()">
                  ИСТОРИЯ ТРАНЗАКЦИЙ
                </button>

                <button class="btn" onclick="walletTransfer()">
                  ВНУТРЕННИЙ ПЕРЕВОД
                </button>

                <button class="btn" onclick="walletLoan()">
                  ЗАЙМ
                </button>

                <button class="btn" onclick="walletProfitability()">
                  ДОХОДНОСТЬ
                </button>

                <button class="btn" onclick="walletDocuments()">
                  ДОКУМЕНТЫ
                </button>

                <button class="btn" onclick="walletSecurity()">
                  БЕЗОПАСНОСТЬ
                </button>

              </div>

            </section>

            
          `
      }

    </main>
  `;
}
async function walletData() {
  if (!currentUser || !currentProfile) {
    return auth("login");
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, pride_id, full_name, role")
    .eq("id", currentProfile.id)
    .single();

  if (profileError) {
    showError(profileError);
    return;
  }

  const { data: walletRecord, error: walletError } = await supabaseClient
    .from("wallets")
    .select(`
      wallet_id,
      status,
      prd_balance,
      contract_amount,
      loan_amount,
      collateral_amount,
      free_balance
    `)
    .eq("owner_id", currentProfile.id)
    .maybeSingle();

  if (walletError) {
    showError(walletError);
    return;
  }

  currentWallet = walletRecord || null;

  const walletId = currentWallet?.wallet_id || "—";
  const balance = Number(currentWallet?.prd_balance || 0);
  const contract = Number(currentWallet?.contract_amount || 0);
  const loan = Number(currentWallet?.loan_amount || 0);
  const freeBalance = Number(currentWallet?.free_balance || 0);

  app.innerHTML = `
    ${nav("wallet")}

    <main class="page">

      <section class="hero">
        <div class="eyebrow">WALLET / ДАННЫЕ</div>

        <h1>Личные данные</h1>

        <p class="muted">
          Здесь находятся данные владельца Wallet.
        </p>
      </section>

      <section class="card">
        <div class="wallet-data-list">

          <div>
            ID
            <strong>${esc(profile?.pride_id || "—")}</strong>
          </div>

          <div>
            WALLET
            <strong>${esc(walletId)}</strong>
          </div>

          <div>
            ИМЯ
            <strong>${esc(profile?.full_name || "—")}</strong>
          </div>

          <div>
            EMAIL
            <strong>${esc(currentUser.email || "—")}</strong>
          </div>

          <div>
            ТЕЛЕФОН
            <strong>${esc(currentProfile.phone || "Не указан")}</strong>
          </div>

        </div>
      </section>

      <section class="card">

        <div class="eyebrow">ИЗМЕНЕНИЕ ДАННЫХ</div>

        <label>
          EMAIL

          <input
            id="wallet-email"
            type="email"
            value="${esc(currentUser.email || "")}"
            autocomplete="email"
          >
        </label>

        <label>
          ПОВТОР EMAIL

          <input
            id="wallet-email-repeat"
            type="email"
            value="${esc(currentUser.email || "")}"
            autocomplete="email"
          >
        </label>

        <label>
          ТЕЛЕФОН

          <input
            id="wallet-phone"
            type="tel"
            value="${esc(currentProfile.phone || "")}"
            placeholder="+995 5XX XXX XXX"
            autocomplete="tel"
          >
        </label>

        <label>
          ПОВТОР ТЕЛЕФОНА

          <input
            id="wallet-phone-repeat"
            type="tel"
            value="${esc(currentProfile.phone || "")}"
            placeholder="+995 5XX XXX XXX"
            autocomplete="tel"
          >
        </label>

        <button
          class="btn primary"
          onclick="saveWalletData()"
        >
          СОХРАНИТЬ
        </button>

      </section>

      <section class="card">

        <button
          class="btn"
          onclick="wallet()"
        >
          ← НАЗАД В WALLET
        </button>

      </section>

    </main>
  `;
}
async function saveWalletData() {
  if (!currentUser || !currentProfile) {
    return auth("login");
  }

  const email = document
    .getElementById("wallet-email")
    ?.value
    .trim();

  const emailRepeat = document
    .getElementById("wallet-email-repeat")
    ?.value
    .trim();

  const phone = document
    .getElementById("wallet-phone")
    ?.value
    .trim();

  const phoneRepeat = document
    .getElementById("wallet-phone-repeat")
    ?.value
    .trim();

  if (!email || !emailRepeat) {
    return alert("Укажите email.");
  }

  if (email !== emailRepeat) {
    return alert("Email не совпадает.");
  }

  if (phone !== phoneRepeat) {
    return alert("Телефон не совпадает.");
  }

  try {
    const { error: authError } =
      await supabaseClient.auth.updateUser({
        email: email
      });

    if (authError) {
      throw authError;
    }

    const { error: profileError } =
      await supabaseClient
        .from("profiles")
        .update({
          phone: phone || null
        })
        .eq("id", currentProfile.id);

    if (profileError) {
      throw profileError;
    }

    alert("Данные сохранены.");

    await loadSession();
    await walletData();

  } catch (error) {
    showError(error);
  }
}
 async function becomeSeller() {
  if (!currentUser) return;

  try {
    const { error } = await supabaseClient.rpc("activate_seller");

    if (error) throw error;

    await loadSession();

    alert("Seller активирован.");
    wallet();

  } catch (error) {
    showError(error);
  }
}

async function walletIncreaseContract() {
  if (!currentUser || !currentProfile) return auth("login");

  const { data: walletRecord, error } = await supabaseClient
    .from("wallets")
    .select("id, wallet_id, status, contract_amount, free_balance")
    .eq("owner_id", currentProfile.id)
    .maybeSingle();

  if (error) return showError(error);

  if (!walletRecord || walletRecord.status !== "ACTIVE") {
    app.innerHTML = `
      ${nav("wallet")}
      <main class="page">
        <section class="hero"><h1>Увеличение контракта</h1></section>
        <section class="card"><div class="empty">Wallet должен быть активен.</div></section>
        <section class="card"><button class="btn" onclick="wallet()">← НАЗАД В WALLET</button></section>
      </main>
    `;
    return;
  }

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero">
        <h1>Увеличение контракта</h1>
        <p class="muted">${esc(walletRecord.wallet_id)}</p>
      </section>

      <section class="grid">
        <div class="card"><div class="card-label">ТЕКУЩИЙ КОНТРАКТ</div><div class="big-value">${money(walletRecord.contract_amount)}</div></div>
        <div class="card"><div class="card-label">ДОСТУПНО НА БАЛАНСЕ</div><div class="big-value">${money(walletRecord.free_balance)}</div></div>
      </section>

      <section class="card" style="max-width:480px;margin:0 auto;">

        <div class="field">
          <label>НОВЫЙ РАЗМЕР КОНТРАКТА, PRD</label>
          <input id="new_contract" type="number" min="${Number(walletRecord.contract_amount) + 1}" step="1"
                 placeholder="15000" oninput="updateContractPreview(${walletRecord.contract_amount}, ${walletRecord.free_balance})">
        </div>

        <div id="contract_preview" class="muted" style="margin:14px 0;line-height:1.7;"></div>

        <p class="muted" style="font-size:13px;">
          Комиссия — 7% от суммы увеличения контракта, списывается с баланса сразу.
          Если на балансе недостаточно средств — сначала переведите себе PRD.
        </p>

        <button class="btn primary" style="width:100%;margin-top:10px;" onclick="submitIncreaseContract()">
          УВЕЛИЧИТЬ КОНТРАКТ
        </button>
      </section>

      <section class="card">
        <button class="btn" onclick="wallet()">← НАЗАД В WALLET</button>
      </section>

    </main>
  `;
}

function updateContractPreview(currentContract, freeBalance) {
  const newContract = Number(document.getElementById("new_contract")?.value) || 0;
  const preview = document.getElementById("contract_preview");
  if (!preview) return;

  const delta = newContract - currentContract;

  if (delta <= 0) {
    preview.innerHTML = "";
    return;
  }

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v) + " PRD";

  const fee = Math.round(delta * 0.07 * 100) / 100;
  const enough = freeBalance >= fee;

  preview.innerHTML = `
    Увеличение: <strong>+${money(delta)}</strong><br>
    Комиссия 7%: <strong>−${money(fee)}</strong><br>
    ${enough
      ? `Спишется с баланса сразу.`
      : `<span style="color:#e0554f;">Недостаточно средств — не хватает ${money(fee - freeBalance)}.</span>`}
  `;
}

async function submitIncreaseContract() {
  const newContract = Number(document.getElementById("new_contract")?.value);

  if (!newContract || newContract <= 0) {
    return alert("Укажите новый размер контракта.");
  }

  try {
    const { data, error } = await supabaseClient.rpc("increase_contract", {
      p_new_contract_amount: newContract
    });

    if (error) throw error;

    alert(`Контракт увеличен. Списана комиссия: ${data.fee_charged} PRD.`);
    wallet();
  } catch (error) {
    showError(error);
  }
}

async function walletTransactions() {
  if (!currentUser || !currentProfile) return auth("login");

  const { data: walletRecord, error: walletError } = await supabaseClient
    .from("wallets")
    .select("id, wallet_id")
    .eq("owner_id", currentProfile.id)
    .maybeSingle();

  if (walletError) return showError(walletError);

  if (!walletRecord) {
    app.innerHTML = `
      ${nav("wallet")}
      <main class="page">
        <section class="hero"><h1>История транзакций</h1></section>
        <section class="card"><div class="empty">Wallet не найден.</div></section>
        <section class="card"><button class="btn" onclick="wallet()">← НАЗАД В WALLET</button></section>
      </main>
    `;
    return;
  }

  const { data, error } = await supabaseClient
    .from("wallet_ledger")
    .select("*")
    .eq("wallet_id", walletRecord.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return showError(error);

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

  const rows = (data || [])
    .map(
      (tx) => `
        <tr>
          <td>${esc(new Date(tx.created_at).toLocaleString("ru-RU"))}</td>
          <td>
            <span class="badge ${tx.entry_type === "CREDIT" ? "green" : ""}">
              ${tx.entry_type === "CREDIT" ? "ПОПОЛНЕНИЕ" : "СПИСАНИЕ"}
            </span>
          </td>
          <td>${tx.entry_type === "CREDIT" ? "+" : "−"}${money(tx.amount)}</td>
          <td>${esc(tx.description || tx.reference_type || "—")}</td>
        </tr>
      `
    )
    .join("");

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">
      <section class="hero"><h1>История транзакций</h1></section>

      <section class="card">
        ${
          data && data.length
            ? `<div class="table-wrap">
                <table>
                  <thead><tr><th>Дата</th><th>Тип</th><th>Сумма</th><th>Описание</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`
            : `<div class="empty">Операций пока нет.</div>`
        }
      </section>

      <section class="card">
        <button class="btn" onclick="wallet()">← НАЗАД В WALLET</button>
      </section>
    </main>
  `;
}

function walletTransfer() {
  if (!currentUser || !currentProfile) return auth("login");

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero">
        <h1>Внутренний перевод</h1>
      </section>

      <section class="card" style="max-width:480px;margin:0 auto;">

        <div class="field">
          <label>WALLET ПОЛУЧАТЕЛЯ</label>
          <input id="transfer_to" type="text" placeholder="PRD-XXXXXXXX">
        </div>

        <div class="field">
          <label>СУММА, PRD</label>
          <input id="transfer_amount" type="number" min="1" step="1" placeholder="1000">
        </div>

        <div class="field">
          <label>КОММЕНТАРИЙ <span class="muted">(необязательно)</span></label>
          <input id="transfer_note" type="text" placeholder="За что перевод">
        </div>

        <button class="btn primary" style="width:100%;" onclick="submitTransfer()">
          ПЕРЕВЕСТИ
        </button>
      </section>

      <section class="card">
        <button class="btn" onclick="wallet()">← НАЗАД В WALLET</button>
      </section>

    </main>
  `;
}

async function submitTransfer() {
  const to = document.getElementById("transfer_to")?.value.trim();
  const amount = Number(document.getElementById("transfer_amount")?.value);
  const note = document.getElementById("transfer_note")?.value.trim();

  if (!to || !amount || amount <= 0) {
    return alert("Укажите Wallet получателя и корректную сумму.");
  }

  if (!confirm(`Перевести ${amount} PRD на ${to}?`)) return;

  try {
    const { data, error } = await supabaseClient.rpc("transfer_prd", {
      p_to_wallet_id: to,
      p_amount: amount,
      p_note: note || null
    });

    if (error) throw error;

    let message = "Перевод выполнен.";
    if (data?.activated) {
      message += `\nWallet получателя (${data.to_wallet}) активирован.`;
    }
    if (data?.contract_increase > 0) {
      message += `\nКонтракт получателя автоматически увеличен на ${data.contract_increase} PRD (удержана комиссия ${data.fee_charged} PRD).`;
    }

    alert(message);
    await loadSession();
    wallet();
  } catch (error) {
    showError(error);
  }
}

async function walletLoan() {
  if (!currentUser || !currentProfile) return auth("login");

  const { data: walletRecord, error: walletError } = await supabaseClient
    .from("wallets")
    .select("id, loan_amount, collateral_amount, free_balance")
    .eq("owner_id", currentProfile.id)
    .maybeSingle();

  if (walletError) return showError(walletError);

  const { data: requests, error } = await supabaseClient
    .from("loan_requests")
    .select("*")
    .eq("profile_id", currentProfile.id)
    .order("created_at", { ascending: false });

  if (error) console.warn(error);

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

  const statusLabel = (s) =>
    ({ PENDING: "НА РАССМОТРЕНИИ", APPROVED: "ОДОБРЕН", REJECTED: "ОТКЛОНЁН" }[s] || s);

  const rows = (requests || [])
    .map(
      (r) => `
        <tr>
          <td>${esc(new Date(r.created_at).toLocaleDateString("ru-RU"))}</td>
          <td>${money(r.amount)}</td>
          <td>${money(r.collateral_amount)}</td>
          <td><span class="badge ${r.status === "APPROVED" ? "green" : ""}">${statusLabel(r.status)}</span></td>
        </tr>
      `
    )
    .join("");

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero"><h1>Займ</h1></section>

      <section class="grid">
        <div class="card">
          <div class="card-label">ТЕКУЩИЙ ЗАЙМ</div>
          <div class="big-value">${money(walletRecord?.loan_amount)}</div>
        </div>
        <div class="card">
          <div class="card-label">ЗАЛОГ</div>
          <div class="big-value">${money(walletRecord?.collateral_amount)}</div>
        </div>
        <div class="card">
          <div class="card-label">ОСТАТОК</div>
          <div class="big-value">${money(walletRecord?.free_balance)}</div>
        </div>
      </section>

      <section class="card" style="max-width:480px;margin:0 auto 24px;">
        <div class="eyebrow">НОВАЯ ЗАЯВКА НА ЗАЙМ</div>

        <div class="field">
          <label>СУММА ЗАЙМА, PRD</label>
          <input id="loan_amount" type="number" min="1" step="1" placeholder="5000">
        </div>

        <div class="field">
          <label>СУММА ЗАЛОГА, PRD</label>
          <input id="loan_collateral" type="number" min="0" step="1" placeholder="5000">
        </div>

        <button class="btn primary" style="width:100%;" onclick="submitLoanRequest()">
          ОТПРАВИТЬ ЗАЯВКУ
        </button>
      </section>

      <section class="card">
        <div class="eyebrow">ИСТОРИЯ ЗАЯВОК</div>
        ${
          requests && requests.length
            ? `<div class="table-wrap">
                <table>
                  <thead><tr><th>Дата</th><th>Сумма</th><th>Залог</th><th>Статус</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`
            : `<div class="empty">Заявок пока нет.</div>`
        }
      </section>

      <section class="card">
        <button class="btn" onclick="wallet()">← НАЗАД В WALLET</button>
      </section>

    </main>
  `;
}

async function submitLoanRequest() {
  const amount = Number(document.getElementById("loan_amount")?.value);
  const collateral = Number(document.getElementById("loan_collateral")?.value) || 0;

  if (!amount || amount <= 0) {
    return alert("Укажите сумму займа.");
  }

  try {
    const { error } = await supabaseClient.rpc("request_loan", {
      p_amount: amount,
      p_collateral: collateral
    });

    if (error) throw error;

    alert("Заявка отправлена. Ожидайте решения администратора.");
    walletLoan();
  } catch (error) {
    showError(error);
  }
}

async function walletProfitability() {
  if (!currentUser || !currentProfile) return auth("login");

  const { data: levels, error } = await supabaseClient
    .from("pride_levels")
    .select("*")
    .order("level", { ascending: true });

  if (error) console.warn(error);

  let playerBlock = "";

  if (currentPlayer) {
    const currentLevelRow = (levels || [])
      .filter((l) => Number(currentPlayer.total_units) >= Number(l.min_units))
      .sort((a, b) => b.level - a.level)[0];

    playerBlock = `
      <section class="grid">
        <div class="card">
          <div class="card-label">УРОВЕНЬ</div>
          <div class="big-value">${esc(currentPlayer.level)}</div>
        </div>
        <div class="card">
          <div class="card-label">ЮНИТЫ (ВСЕГО)</div>
          <div class="big-value">${esc(currentPlayer.total_units || 0)}</div>
        </div>
        <div class="card">
          <div class="card-label">КОЭФФИЦИЕНТ</div>
          <div class="big-value">${esc(currentLevelRow?.coefficient ?? "—")}</div>
        </div>
      </section>
    `;
  }

  const rows = (levels || [])
    .map(
      (l) => `
        <tr>
          <td>${esc(l.level)}</td>
          <td>${esc(l.min_units)}</td>
          <td>${esc(l.coefficient)}</td>
        </tr>
      `
    )
    .join("");

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero"><h1>Доходность</h1></section>

      ${playerBlock}

      <section class="card">
        <div class="eyebrow">ШКАЛА УРОВНЕЙ PRIDE</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Уровень</th><th>Мин. юнитов</th><th>Коэффициент</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="muted" style="margin-top:14px;">
          Полный расчёт доходности будет подключён на следующем этапе развития экономики PRIDE.
        </p>
      </section>

      <section class="card">
        <button class="btn" onclick="wallet()">← НАЗАД В WALLET</button>
      </section>

    </main>
  `;
}

async function walletDocuments() {
  if (!currentUser || !currentProfile) return auth("login");

  const { data: docs, error } = await supabaseClient
    .from("documents")
    .select("*")
    .eq("profile_id", currentProfile.id)
    .order("created_at", { ascending: false });

  if (error) console.warn(error);

  const rows = await Promise.all(
    (docs || []).map(async (d) => {
      const { data: signed } = await supabaseClient
        .storage
        .from("documents")
        .createSignedUrl(d.storage_path, 60 * 5);

      return `
        <tr>
          <td>${esc(d.file_name)}</td>
          <td>${esc(new Date(d.created_at).toLocaleDateString("ru-RU"))}</td>
          <td>
            <a href="${signed?.signedUrl || "#"}" target="_blank" class="btn" style="display:inline-block;padding:6px 10px;">Скачать</a>
            <button class="btn" style="padding:6px 10px;" onclick="deleteDocument('${d.id}', '${d.storage_path}')">Удалить</button>
          </td>
        </tr>
      `;
    })
  );

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero"><h1>Документы</h1></section>

      <section class="card" style="max-width:480px;margin:0 auto 24px;">
        <div class="eyebrow">ЗАГРУЗИТЬ ДОКУМЕНТ</div>

        <div class="field">
          <label>ФАЙЛ</label>
          <input id="doc_file" type="file">
        </div>

        <button class="btn primary" style="width:100%;" onclick="uploadDocument()">
          ЗАГРУЗИТЬ
        </button>
      </section>

      <section class="card">
        ${
          docs && docs.length
            ? `<div class="table-wrap">
                <table>
                  <thead><tr><th>Файл</th><th>Дата</th><th></th></tr></thead>
                  <tbody>${rows.join("")}</tbody>
                </table>
              </div>`
            : `<div class="empty">Документов пока нет.</div>`
        }
      </section>

      <section class="card">
        <button class="btn" onclick="wallet()">← НАЗАД В WALLET</button>
      </section>

    </main>
  `;
}

async function uploadDocument() {
  const fileInput = document.getElementById("doc_file");
  const file = fileInput?.files?.[0];

  if (!file) {
    return alert("Выберите файл.");
  }

  try {
    const path = `${currentUser.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("documents")
      .upload(path, file);

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabaseClient
      .from("documents")
      .insert({
        profile_id: currentProfile.id,
        file_name: file.name,
        storage_path: path
      });

    if (dbError) throw dbError;

    alert("Документ загружен.");
    walletDocuments();
  } catch (error) {
    showError(error);
  }
}

async function deleteDocument(id, path) {
  if (!confirm("Удалить документ?")) return;

  try {
    const { error: storageError } = await supabaseClient
      .storage
      .from("documents")
      .remove([path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabaseClient
      .from("documents")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    walletDocuments();
  } catch (error) {
    showError(error);
  }
}

async function walletSecurity() {
  if (!currentUser || !currentProfile) return auth("login");

  const { data: logs, error } = await supabaseClient
    .from("audit_log")
    .select("*")
    .eq("actor_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) console.warn(error);

  const actionLabel = (a) =>
    ({
      TRANSFER: "Перевод средств",
      LOAN_REQUEST: "Заявка на займ",
      LOAN_APPROVED: "Займ одобрен",
      LOAN_REJECTED: "Займ отклонён",
      PASSWORD_CHANGED: "Изменение пароля"
    }[a] || a);

  const rows = (logs || [])
    .map(
      (l) => `
        <tr>
          <td>${esc(new Date(l.created_at).toLocaleString("ru-RU"))}</td>
          <td>${esc(actionLabel(l.action))}</td>
        </tr>
      `
    )
    .join("");

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero"><h1>Безопасность</h1></section>

      <section class="card" style="max-width:480px;margin:0 auto 24px;">
        <div class="eyebrow">СМЕНА ПАРОЛЯ</div>

        <div class="field">
          <label>НОВЫЙ ПАРОЛЬ</label>
          <input id="sec_pass1" type="password" placeholder="Минимум 6 символов">
        </div>

        <div class="field">
          <label>ПОВТОРИТЕ ПАРОЛЬ</label>
          <input id="sec_pass2" type="password" placeholder="Повторите пароль">
        </div>

        <button class="btn primary" style="width:100%;" onclick="changePassword()">
          СОХРАНИТЬ ПАРОЛЬ
        </button>
      </section>

      <section class="card">
        <div class="eyebrow">ЖУРНАЛ АКТИВНОСТИ</div>
        ${
          logs && logs.length
            ? `<div class="table-wrap">
                <table>
                  <thead><tr><th>Дата</th><th>Действие</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`
            : `<div class="empty">Активности пока нет.</div>`
        }
      </section>

      <section class="card">
        <button class="btn" onclick="wallet()">← НАЗАД В WALLET</button>
      </section>

    </main>
  `;
}

async function changePassword() {
  const pass1 = document.getElementById("sec_pass1")?.value;
  const pass2 = document.getElementById("sec_pass2")?.value;

  if (!pass1 || pass1.length < 6) {
    return alert("Пароль должен содержать минимум 6 символов.");
  }

  if (pass1 !== pass2) {
    return alert("Пароли не совпадают.");
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: pass1 });

    if (error) throw error;

    await supabaseClient.rpc("log_security_event", { p_action: "PASSWORD_CHANGED" });

    alert("Пароль изменён.");
    walletSecurity();
  } catch (error) {
    showError(error);
  }
}

async function career() {
  if (!currentUser || !currentProfile) return auth("login");

  if (currentProfile.role !== "SELLER" && currentProfile.role !== "FOUNDER") {
    return alert("Карьера доступна только Player.");
  }

  if (!currentPlayer) {
    return alert("Профиль Player не найден.");
  }

  const isFounder = currentProfile.role === "FOUNDER";

  const { data: levels, error: levelsError } = await supabaseClient
    .from("pride_levels")
    .select("*")
    .order("level", { ascending: true });

  if (levelsError) console.warn(levelsError);

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

  const coef = isFounder
    ? 17.5
    : (levels || [])
        .filter((l) => Number(currentPlayer.total_units) >= Number(l.min_units))
        .sort((a, b) => b.level - a.level)[0]?.coefficient;

  let nextLevelInfo;
  if (isFounder) {
    nextLevelInfo = `<p class="muted">Founder — фиксированный уровень.</p>`;
  } else {
    const nextLevel = (levels || []).find((l) => l.level === Number(currentPlayer.level) + 1);
    if (nextLevel) {
      const remaining = Number(nextLevel.min_units) - Number(currentPlayer.total_units);
      nextLevelInfo = `<p class="muted">До уровня ${esc(nextLevel.level)} (коэф. ${esc(nextLevel.coefficient)}) осталось <strong>${remaining} ед.</strong></p>`;
    } else {
      nextLevelInfo = `<p class="muted">Достигнут максимальный уровень.</p>`;
    }
  }

  let commissionRows = "";
  let hasCommissions = false;

  if (currentPlayer.salary_wallet_id) {
    const { data: history, error: historyError } = await supabaseClient
      .from("wallet_ledger")
      .select("*")
      .eq("wallet_id", currentPlayer.salary_wallet_id)
      .eq("reference_type", "COMMISSION")
      .order("created_at", { ascending: false })
      .limit(20);

    if (historyError) console.warn(historyError);

    hasCommissions = !!(history && history.length);

    commissionRows = (history || [])
      .map(
        (h) => `
          <tr>
            <td>${esc(new Date(h.created_at).toLocaleString("ru-RU"))}</td>
            <td>+${money(h.amount)}</td>
            <td>${esc(h.description || "")}</td>
          </tr>
        `
      )
      .join("");
  }

  app.innerHTML = `
    ${nav("player")}
    <main class="page">

      <section class="hero">
        <div class="eyebrow">PRIDE PLAYER</div>
        <h1>Карьера</h1>
      </section>

      <section class="grid">
        <div class="card"><div class="card-label">УРОВЕНЬ</div><div class="big-value">${esc(currentPlayer.level)}</div></div>
        <div class="card"><div class="card-label">КОЭФФИЦИЕНТ</div><div class="big-value">${esc(coef ?? "—")}</div></div>
        <div class="card"><div class="card-label">ВСЕГО ЕДИНИЦ</div><div class="big-value">${esc(currentPlayer.total_units)}</div></div>
      </section>

      <section class="grid">
        <div class="card"><div class="card-label">ЛИЧНЫЕ ЕДИНИЦЫ</div><div class="big-value">${esc(currentPlayer.personal_units)}</div></div>
        <div class="card"><div class="card-label">КОМАНДНЫЕ ЕДИНИЦЫ</div><div class="big-value">${esc(currentPlayer.team_units)}</div></div>
      </section>

      <section class="card">
        ${nextLevelInfo}
      </section>

      <section class="card">
        <div class="eyebrow">ПОСЛЕДНИЕ ГОНОРАРЫ</div>
        ${
          hasCommissions
            ? `<div class="table-wrap">
                <table>
                  <thead><tr><th>Дата</th><th>Сумма</th><th>Описание</th></tr></thead>
                  <tbody>${commissionRows}</tbody>
                </table>
              </div>`
            : `<div class="empty">Гонораров пока не было.</div>`
        }
      </section>

      <section class="card">
        <button class="btn" onclick="player()">← НАЗАД</button>
      </section>

    </main>
  `;
}

async function player() {
  if (!currentUser) return auth("login");

  if (
    currentProfile?.role !== "SELLER" &&
    currentProfile?.role !== "FOUNDER"
  ) {
    return alert("PRIDE Player доступен только Seller.");
  }

  const playerId =
    currentPlayer?.player_id ||
    currentPlayer?.id ||
    "Создаётся при активации Seller";

  app.innerHTML = `
    ${nav("player")}

    <main class="page">

      <section class="hero">
        <div class="eyebrow">PRIDE PLAYER</div>

        <h1>Играй.<br>Продавай.<br>Зарабатывай.</h1>

        <p class="muted">
          Игровая и карьерная среда PRIDE.
        </p>
      </section>

      <section class="grid">

        <div class="card">
          <div class="card-label">ID</div>
          <div class="big-value">${esc(playerId)}</div>
        </div>


        <div class="card">
          <div class="card-label">LEVEL</div>
          <div class="big-value">${esc(currentPlayer?.level ?? "—")}</div>
        </div>

        <div class="card">
          <div class="card-label">UNITS</div>
          <div class="big-value">${esc(currentPlayer?.total_units ?? 0)}</div>
        </div>

      </section>

      <section class="card">
        <div class="eyebrow">КАРЬЕРА</div>
        <p class="muted" style="margin-bottom:14px;">
          Уровень, коэффициент, личные и командные единицы, история гонораров.
        </p>
        <button class="btn primary" style="width:100%;" onclick="career()">
          ПОСМОТРЕТЬ КАРЬЕРУ
        </button>
      </section>

      <section class="card">
  <div class="eyebrow">РЕГИСТРАЦИЯ КЛИЕНТА</div>
  <p class="muted" style="margin-bottom:14px;">
    Сначала зарегистрируйте клиенту Wallet, затем сделайте его Player.
  </p>

  <button
    class="btn primary"
    style="width:100%;margin-bottom:8px;"
    onclick="walletRegister()"
  >
    ЗАРЕГИСТРИРОВАТЬ WALLET
  </button>

  <button
    class="btn"
    style="width:100%;"
    onclick="registerPlayerScreen()"
  >
    ЗАРЕГИСТРИРОВАТЬ PLAYER
  </button>
</section>

    </main>
  `;
}

async function admin() {
  if (currentProfile?.role !== "FOUNDER") {
    return alert("Доступ только для Founder.");
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return showError(error);
  }

  const { data: loanRequests, error: loanError } = await supabaseClient
    .from("loan_requests")
    .select("*, wallets(wallet_id), profiles(full_name, pride_id)")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  if (loanError) console.warn(loanError);

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

  const loanRows = (loanRequests || [])
    .map(
      (r) => `
        <tr>
          <td>${esc(new Date(r.created_at).toLocaleDateString("ru-RU"))}</td>
          <td>${esc(r.profiles?.full_name || "—")}<br><span class="small muted">${esc(r.wallets?.wallet_id || "—")}</span></td>
          <td>${money(r.amount)}</td>
          <td>${money(r.collateral_amount)}</td>
          <td>
            <button class="btn primary" style="padding:6px 10px;" onclick="approveLoan('${r.id}', true)">Одобрить</button>
            <button class="btn" style="padding:6px 10px;" onclick="approveLoan('${r.id}', false)">Отклонить</button>
          </td>
        </tr>
      `
    )
    .join("");

  app.innerHTML = `
    ${nav("admin")}

    <main class="page">

      <section class="hero">
        <div class="eyebrow">FOUNDER / ADMIN</div>
        <h1>PRIDE Administration</h1>
        <p class="muted">
          Пользователи, роли и идентификаторы системы.
        </p>
      </section>

      <section class="card">

        <div class="table-wrap">

          <table>
            <thead>
              <tr>
                <th>PRIDE ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>

              ${(data || [])
                .map(
                  user => `
                    <tr>
                      <td>${esc(
                        user.pride_id || user.id
                      )}</td>

                      <td>${esc(
                        user.full_name || "—"
                      )}</td>

                      <td>${esc(
                        user.role || "—"
                      )}</td>

                      <td>${esc(
                        user.created_at
                          ? new Date(
                              user.created_at
                            ).toLocaleDateString("ru-RU")
                          : "—"
                      )}</td>
                    </tr>
                  `
                )
                .join("")}

            </tbody>
          </table>

        </div>

      </section>

      <section class="card">

        <div class="eyebrow">ЗАЯВКИ НА ЗАЙМ (НА РАССМОТРЕНИИ)</div>

        ${
          loanRequests && loanRequests.length
            ? `<div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Пользователь</th>
                      <th>Сумма</th>
                      <th>Залог</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>${loanRows}</tbody>
                </table>
              </div>`
            : `<div class="empty">Заявок на рассмотрении нет.</div>`
        }

      </section>
      
    </main>
  `;
}

async function approveLoan(id, approve) {
  if (!confirm(approve ? "Одобрить займ?" : "Отклонить заявку?")) return;

  try {
    const { error } = await supabaseClient.rpc("approve_loan_request", {
      p_request_id: id,
      p_approve: approve
    });

    if (error) throw error;

    alert(approve ? "Займ одобрен." : "Заявка отклонена.");
    admin();
  } catch (error) {
    showError(error);
  }
}

async function init() {
  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      theGame();
      return;
    }

    await loadSession();
    wallet();

  } catch (error) {
    console.error(error);
    theGame();
  }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    currentUser = null;
    currentProfile = null;
    currentWallet = null;
    currentPlayer = null;
    theGame();
  }
});

init();
