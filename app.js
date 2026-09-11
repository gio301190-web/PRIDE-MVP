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

// раздельный доступ по вкладкам — вход в одну не открывает другие,
// даже если это один и тот же аккаунт
let gameUnlocked = false;
let walletUnlocked = false;
let academyUnlocked = false;

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

function backBar(action = "wallet()") {
  return `
    <div class="back-bar">
      <button class="btn" onclick="${action}">← НАЗАД</button>
    </div>
  `;
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
  if (!gameUnlocked) return auth("login");

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
  if (!walletUnlocked) return auth("wallet");
  return wallet();
}

function bsAcademy() {
  if (!academyUnlocked) return auth("academy");

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
              isWalletLogin ? "PRD-XXXXXXXX" : "ID-00000000"
            }"
          >
        </div>

        <div class="field">
          <label>Пароль</label>

          <div style="position:relative;">
            <input
              id="pass"
              type="password"
              placeholder="Минимум 6 символов"
              style="padding-right:44px;"
            >
            <button
              type="button"
              onclick="togglePasswordVisibility('pass', this)"
              style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:18px;cursor:pointer;padding:4px;line-height:1;"
            >👁</button>
          </div>
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

    alert("ID создан. Wallet создан автоматически.");
    wallet();

  } catch (error) {
    showError(error);
  }
}
function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    btnEl.textContent = "🙈";
  } else {
    input.type = "password";
    btnEl.textContent = "👁";
  }
}

let mfaEnrollFactorId = null;
let pendingMfaLogin = null;

async function startEnroll2FA() {
  try {
    const { data, error } = await supabaseClient.auth.mfa.enroll({ factorType: "totp" });
    if (error) throw error;

    mfaEnrollFactorId = data.id;

    const box = document.getElementById("mfa_enroll_box");
    if (!box) return;

    box.innerHTML = `
      <div style="margin-top:16px;text-align:center;">
        <img src="${data.totp.qr_code}" alt="QR" style="background:#fff;padding:10px;border-radius:10px;max-width:220px;">
        <p class="muted" style="font-size:12px;margin:10px 0;word-break:break-all;">${esc(data.totp.secret)}</p>
        <div class="field">
          <label>КОД ИЗ ПРИЛОЖЕНИЯ</label>
          <input id="mfa_code" type="text" inputmode="numeric" maxlength="6" placeholder="000000">
        </div>
        <button class="btn primary" style="width:100%;" onclick="confirmEnroll2FA()">ПОДТВЕРДИТЬ</button>
      </div>
    `;
  } catch (error) {
    showError(error);
  }
}

async function confirmEnroll2FA() {
  const code = document.getElementById("mfa_code")?.value.trim();

  if (!code) {
    return alert("Введите код из приложения.");
  }

  try {
    const { data: challengeData, error: challengeError } =
      await supabaseClient.auth.mfa.challenge({ factorId: mfaEnrollFactorId });

    if (challengeError) throw challengeError;

    const { error: verifyError } = await supabaseClient.auth.mfa.verify({
      factorId: mfaEnrollFactorId,
      challengeId: challengeData.id,
      code
    });

    if (verifyError) throw verifyError;

    alert("2FA подключена.");
    walletSecurity();
  } catch (error) {
    showError(error);
  }
}

async function disable2FA(factorId) {
  if (!confirm("Отключить 2FA?")) return;

  try {
    const { error } = await supabaseClient.auth.mfa.unenroll({ factorId });
    if (error) throw error;

    alert("2FA отключена.");
    walletSecurity();
  } catch (error) {
    showError(error);
  }
}

async function submitMfaLogin() {
  const code = document.getElementById("mfa_login_code")?.value.trim();

  if (!code || !pendingMfaLogin) {
    return alert("Введите код из приложения.");
  }

  try {
    const { data: factorsData, error: factorsError } = await supabaseClient.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const factor = (factorsData?.totp || []).find((f) => f.status === "verified");
    if (!factor) throw new Error("2FA фактор не найден.");

    const { data: challengeData, error: challengeError } =
      await supabaseClient.auth.mfa.challenge({ factorId: factor.id });

    if (challengeError) throw challengeError;

    const { error: verifyError } = await supabaseClient.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challengeData.id,
      code
    });

    if (verifyError) throw verifyError;

    const { isWalletLogin, authMode } = pendingMfaLogin;
    pendingMfaLogin = null;

    await loadSession();

    if (isWalletLogin) {
      walletUnlocked = true;
      localStorage.setItem("pride_unlocked_tab", "wallet");
      wallet();
    } else if (authMode === "academy") {
      academyUnlocked = true;
      localStorage.setItem("pride_unlocked_tab", "academy");
      bsAcademy();
    } else {
      gameUnlocked = true;
      localStorage.setItem("pride_unlocked_tab", "game");
      theGame();
    }
  } catch (error) {
    showError(error);
  }
}

function validateRequiredFields(fields) {
  let allValid = true;
  fields.forEach(({ id, value }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!value) {
      el.style.borderColor = "#e0554f";
      allValid = false;
    } else {
      el.style.borderColor = "";
    }
  });
  return allValid;
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
          <label>ИМЯ</label>
          <input id="wallet_first_name" type="text" placeholder="Имя">
        </div>

        <div class="field">
          <label>ФАМИЛИЯ</label>
          <input id="wallet_last_name" type="text" placeholder="Фамилия">
        </div>

        <div class="field">
          <label>TELEGRAM <span class="muted">(необязательно)</span></label>
          <input id="wallet_telegram" type="text" placeholder="@username">
        </div>

        <div class="field">
          <label>ТЕЛЕФОН</label>
          <input id="wallet_phone" type="text" placeholder="+995...">
        </div>

        <div class="field">
          <label>EMAIL</label>
          <input id="wallet_email" type="email" placeholder="email@example.com">
        </div>

        <div class="field">
          <label>ID ПРИГЛАСИВШЕГО (СПОНСОР)</label>
          <input type="text" value="${esc(currentProfile.pride_id)}" disabled style="opacity:.6;">
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
            type="text"
            placeholder="Минимум 6 символов"
          >
        </div>

        <div class="field">
          <label>ПОВТОРИТЕ ПАРОЛЬ</label>
          <input
            id="wallet_pass2"
            type="text"
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

  const looksLikeWallet = loginValue.toUpperCase().startsWith("PRD-");
  const isWalletLogin = currentAuthMode === "wallet";

  try {
    let email;

    if (isWalletLogin) {
      // вкладка Hermes/Wallet — принимаем ТОЛЬКО номер Wallet (PRD-XXXXXXXX)
      if (!looksLikeWallet) {
        return alert("Неверный логин или пароль.");
      }

      const { data, error } =
        await supabaseClient.rpc("get_wallet_login_email", {
          p_wallet_id: loginValue
        });

      if (error) {
        throw error;
      }

      if (!data) {
        return alert("Wallet с таким номером не найден.");
      }

      email = data;
    } else {
      // вкладки THE GAME и BS ACADEMY — принимаем ТОЛЬКО Player ID,
      // номер Wallet здесь не подходит
      if (looksLikeWallet) {
        return alert("Неверный логин или пароль.");
      }

      const { data, error } =
        await supabaseClient.rpc("get_player_login_email", {
          p_player_id: loginValue
        });

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
      if (/banned|blocked/i.test(error.message || "")) {
        return alert("Ваш аккаунт заблокирован. Обратитесь в службу поддержки.");
      }
      throw error;
    }

    // проверяем, требуется ли код 2FA
    const { data: aalData } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalData && aalData.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
      pendingMfaLogin = { isWalletLogin, authMode: currentAuthMode };

      app.innerHTML = `
        ${nav(isWalletLogin ? "wallet" : currentAuthMode === "academy" ? "academy" : "game")}
        <main class="auth-page">
          <div class="auth-card">
            <div class="eyebrow">2FA</div>
            <h1>Код подтверждения</h1>
            <p class="muted" style="margin-bottom:16px;">Введите код из Google Authenticator.</p>

            <div class="field">
              <label>КОД</label>
              <input id="mfa_login_code" type="text" inputmode="numeric" maxlength="6" placeholder="000000">
            </div>

            <button class="btn primary" style="width:100%;" onclick="submitMfaLogin()">
              ПОДТВЕРДИТЬ
            </button>
          </div>
        </main>
      `;
      return;
    }

    await loadSession();

    if (isWalletLogin) {
      walletUnlocked = true;
      localStorage.setItem("pride_unlocked_tab", "wallet");
      wallet();
    } else if (currentAuthMode === "academy") {
      academyUnlocked = true;
      localStorage.setItem("pride_unlocked_tab", "academy");
      bsAcademy();
    } else {
      gameUnlocked = true;
      localStorage.setItem("pride_unlocked_tab", "game");
      theGame();
    }

  } catch (error) {
    showError(error);
  }
}
async function submitWalletRegistration() {
  const firstName =
    document.getElementById("wallet_first_name")?.value.trim();

  const lastName =
    document.getElementById("wallet_last_name")?.value.trim();

  const telegram =
    document.getElementById("wallet_telegram")?.value.trim();

  const phone =
    document.getElementById("wallet_phone")?.value.trim();

  const email =
    document.getElementById("wallet_email")?.value.trim();

  const contract =
    Number(document.getElementById("wallet_contract")?.value);

  const pass =
    document.getElementById("wallet_pass")?.value;

  const pass2 =
    document.getElementById("wallet_pass2")?.value;

  const isValid = validateRequiredFields([
    { id: "wallet_first_name", value: firstName },
    { id: "wallet_last_name", value: lastName },
    { id: "wallet_phone", value: phone },
    { id: "wallet_email", value: email },
    { id: "wallet_contract", value: contract },
    { id: "wallet_pass", value: pass },
    { id: "wallet_pass2", value: pass2 }
  ]);

  if (!isValid) {
    return alert("Заполните все обязательные поля (отмечены красным).");
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

  const name = `${firstName} ${lastName}`;

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
          telegram: telegram || null,
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
          У клиента уже должен быть свой Wallet (зарегистрируйте его отдельно, если ещё нет).
        </p>
      </section>

      <section class="card" style="max-width:560px;margin:0 auto;">

        <div class="field">
          <label>ИМЯ</label>
          <input id="np_first_name" type="text" placeholder="Имя">
        </div>

        <div class="field">
          <label>ФАМИЛИЯ</label>
          <input id="np_last_name" type="text" placeholder="Фамилия">
        </div>

        <div class="field">
          <label>TELEGRAM <span class="muted">(необязательно)</span></label>
          <input id="np_telegram" type="text" placeholder="@username">
        </div>

        <div class="field">
          <label>ТЕЛЕФОН</label>
          <input id="np_phone" type="text" placeholder="+995...">
        </div>

        <div class="field">
          <label>EMAIL</label>
          <input id="np_email" type="email" placeholder="email@example.com">
        </div>

        <div class="field">
          <label>НОМЕР ЗАРПЛАТНОГО WALLET</label>
          <input id="np_wallet" type="text" placeholder="PRD-XXXXXXXX">
        </div>

        <div class="field">
          <label>ID ПРИГЛАСИВШЕГО (СПОНСОР)</label>
          <input type="text" value="${esc(currentProfile.pride_id)}" disabled style="opacity:.6;">
        </div>

        <div class="field">
          <label>ПАРОЛЬ</label>
          <input id="np_pass" type="text" placeholder="Минимум 6 символов">
        </div>

        <div class="field">
          <label>ПОВТОРИТЕ ПАРОЛЬ</label>
          <input id="np_pass2" type="text" placeholder="Повторите пароль">
        </div>

        <button class="btn primary" style="width:100%;margin-top:15px;" onclick="submitRegisterPlayer()">
          ЗАРЕГИСТРИРОВАТЬ PLAYER
        </button>

        <button class="btn" style="width:100%;margin-top:8px;" onclick="player()">
          НАЗАД
        </button>

      </section>
    </main>
  `;
}

async function submitRegisterPlayer() {
  const firstName = document.getElementById("np_first_name")?.value.trim();
  const lastName = document.getElementById("np_last_name")?.value.trim();
  const telegram = document.getElementById("np_telegram")?.value.trim();
  const phone = document.getElementById("np_phone")?.value.trim();
  const email = document.getElementById("np_email")?.value.trim();
  const walletId = document.getElementById("np_wallet")?.value.trim();
  const pass = document.getElementById("np_pass")?.value;
  const pass2 = document.getElementById("np_pass2")?.value;

  const isValid = validateRequiredFields([
    { id: "np_first_name", value: firstName },
    { id: "np_last_name", value: lastName },
    { id: "np_phone", value: phone },
    { id: "np_email", value: email },
    { id: "np_wallet", value: walletId },
    { id: "np_pass", value: pass },
    { id: "np_pass2", value: pass2 }
  ]);

  if (!isValid) {
    return alert("Заполните все обязательные поля (отмечены красным).");
  }

  if (pass.length < 6) {
    return alert("Пароль должен содержать минимум 6 символов.");
  }

  if (pass !== pass2) {
    return alert("Пароли не совпадают.");
  }

  const name = `${firstName} ${lastName}`;

  try {
    const { data, error } = await supabaseClient.rpc("register_player_by_wallet", {
      p_wallet_id: walletId,
      p_full_name: name,
      p_phone: phone,
      p_telegram: telegram || null,
      p_email: email,
      p_new_password: pass
    });

    if (error) throw error;

    app.innerHTML = `
      <main class="page">
        <section class="card" style="max-width:560px;margin:80px auto;text-align:center;">

          <div class="eyebrow">PRIDE PLAYER</div>
          <h1 style="font-size:32px;margin:18px 0 10px;">ПОЗДРАВЛЯЕМ!</h1>
          <p style="font-size:18px;font-weight:700;margin-bottom:10px;">Player зарегистрирован</p>
          <p class="muted" style="margin-bottom:35px;">Передайте эти данные клиенту.</p>

          <div style="background:var(--panel2);border-radius:14px;padding:24px;text-align:left;margin-bottom:25px;">
            <div style="font-size:11px;letter-spacing:.16em;color:var(--muted);font-weight:800;margin-bottom:7px;">PLAYER ID</div>
            <div style="font-size:22px;font-weight:900;margin-bottom:22px;">${esc(data.player_id)}</div>

            <div style="font-size:11px;letter-spacing:.16em;color:var(--muted);font-weight:800;margin-bottom:7px;">ПАРОЛЬ</div>
            <div style="font-size:22px;font-weight:900;word-break:break-all;">${esc(pass)}</div>
          </div>

          <p class="muted" style="font-size:13px;line-height:1.5;margin-bottom:25px;">
            Player ID и пароль используются для входа в THE GAME.
          </p>

          <button class="btn primary" style="width:100%;margin-bottom:10px;"
            onclick="copyWalletCredentials('${esc(data.player_id)}', '${pass.replace(/'/g, "\\'")}')">
            СКОПИРОВАТЬ ДАННЫЕ
          </button>

          <button class="btn" style="width:100%;" onclick="player()">
            ВЕРНУТЬСЯ В КАБИНЕТ PLAYER
          </button>

        </section>
      </main>
    `;
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

  gameUnlocked = false;
  walletUnlocked = false;
  academyUnlocked = false;
  localStorage.removeItem("pride_unlocked_tab");

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
      id,
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

  const { data: reserveWallet } = await supabaseClient
    .from("wallets")
    .select("free_balance")
    .eq("wallet_id", "PRD-FAUNDER1")
    .maybeSingle();

  const TOTAL_SUPPLY = 1000000000;
  const soldPrd = reserveWallet ? TOTAL_SUPPLY - Number(reserveWallet.free_balance) : 0;
  const currentPrice = 0.01 + Math.floor(soldPrd / 100000) * 0.01;

  const prdSaleInfo = `
    <div class="prd-sale-widget">
      <div>Продано PRD: <strong>${new Intl.NumberFormat("ru-RU").format(soldPrd)}</strong></div>
      <div>Цена: <strong>$${currentPrice.toFixed(2)}</strong></div>
    </div>
  `;

  const profileId = currentProfile.pride_id || currentProfile.prideId || "—";
  const walletId = currentWallet?.wallet_id || "—";
  const status = currentWallet?.status || "INACTIVE";

  const contract = Number(currentWallet?.contract_amount || 0);
  const balance = Number(currentWallet?.prd_balance || 0);
  const loan = Number(currentWallet?.loan_amount || 0);
  const freeBalance = Number(currentWallet?.free_balance || 0);
  const isFounderWallet = currentWallet?.is_founder_wallet === true;

  if (isFounderWallet) {
    const totalSupply = 1000000000;
    const sold = totalSupply - Number(currentWallet.free_balance);

    const moneyUsd = (v) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

    let tierRows = "";
    let grandTotal = 0;
    let remaining = sold;
    let tierIndex = 0;

    while (remaining > 0) {
      const tierAmount = Math.min(100000, remaining);
      const tierPrice = 0.01 + tierIndex * 0.01;
      const tierSubtotal = tierAmount * tierPrice;
      grandTotal += tierSubtotal;

      tierRows += `
        <tr>
          <td>${new Intl.NumberFormat("ru-RU").format(tierAmount)} PRD</td>
          <td>$${tierPrice.toFixed(2)}</td>
          <td>${moneyUsd(tierSubtotal)}</td>
        </tr>
      `;

      remaining -= tierAmount;
      tierIndex++;
    }

    app.innerHTML = `
      ${nav("wallet")}
      <main class="page">

        <div class="wallet-layout">

          <section class="wallet-header">
            <div class="wallet-name">Founder</div>
            <div class="wallet-number">${esc(walletId)}</div>
          </section>

          <section class="wallet-sidebar">
            <div class="wallet-menu">
              <button class="btn" onclick="walletTransfer()">ВНУТРЕННИЙ ПЕРЕВОД</button>
              <button class="btn" onclick="walletSecurity()">БЕЗОПАСНОСТЬ</button>
            </div>
          </section>

          <section class="wallet-finance-center">
            <div class="wallet-finance">
              <div class="wallet-finance-row">
                <span>ОСТАТОК В РЕЗЕРВЕ</span>
                <strong>${new Intl.NumberFormat("ru-RU").format(currentWallet.free_balance)}</strong>
              </div>
              <div class="wallet-finance-row">
                <span>ПРОДАНО PRD</span>
                <strong>${new Intl.NumberFormat("ru-RU").format(sold)}</strong>
              </div>
              <div class="wallet-finance-row">
                <span>ТЕКУЩАЯ ЦЕНА</span>
                <strong>$${(0.01 + Math.floor(sold / 100000) * 0.01).toFixed(2)}</strong>
              </div>
            </div>
          </section>

        </div>

        <section class="card" style="margin-top:24px;">
          <div class="eyebrow">ПРОДАЖИ ПО ЦЕНЕ</div>
          ${
            tierRows
              ? `<div class="table-wrap">
                  <table>
                    <thead><tr><th>Количество</th><th>Цена за PRD</th><th>Сумма</th></tr></thead>
                    <tbody>${tierRows}</tbody>
                  </table>
                </div>
                <p style="margin-top:16px;font-size:20px;font-weight:900;">
                  ИТОГО: ${moneyUsd(grandTotal)}
                </p>`
              : `<div class="empty">Продаж пока не было.</div>`
          }
        </section>

      </main>

      ${backBar("wallet()")}
    `;
    return;
  }

  if (walletId === "PRD-TECHNIK1") {
    const moneyPrd = (v) =>
      new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

    const technikBalance = Number(currentWallet.free_balance || 0);
    const technikId = currentWallet.id;

    const { data: incomeRows } = await supabaseClient
      .from("wallet_ledger")
      .select("reference_type, amount")
      .eq("wallet_id", technikId)
      .eq("entry_type", "CREDIT");

    const { data: payoutRows } = await supabaseClient
      .from("audit_log")
      .select("metadata, created_at")
      .eq("action", "MONTHLY_PROFIT_DISTRIBUTION")
      .order("created_at", { ascending: false });

    const { data: paidRows } = await supabaseClient
      .from("wallet_ledger")
      .select("amount")
      .eq("wallet_id", technikId)
      .eq("reference_type", "PROFIT_PAYOUT_SENT");

    const incomeByType = {};
    (incomeRows || []).forEach((r) => {
      incomeByType[r.reference_type] = (incomeByType[r.reference_type] || 0) + Number(r.amount);
    });

    const totalCommissions = Object.values(incomeByType).reduce((sum, v) => sum + v, 0);
    const totalPaid = (paidRows || []).reduce((sum, r) => sum + Number(r.amount), 0);

    const incomeLabels = {
      ACTIVATION_FEE_INCOME: "За активацию контрактов",
      PROFIT_SHARE_INCOME: "20% от прибыли",
      MAINTENANCE_FEE_INCOME: "Обслуживание аккаунтов (1% в год)",
      LOAN_INTEREST_INCOME: "Пользование займом (7% в год)"
    };

    const incomeRowsHtml = Object.keys(incomeLabels)
      .map(
        (key) => `
          <tr>
            <td>${incomeLabels[key]}</td>
            <td>${moneyPrd(incomeByType[key] || 0)}</td>
          </tr>
        `
      )
      .join("");

    const payoutRowsHtml = (payoutRows || [])
      .map(
        (r) => `
          <tr>
            <td>${esc(r.metadata?.period || new Date(r.created_at).toLocaleDateString("ru-RU"))}</td>
            <td>${r.metadata?.rate ? (Number(r.metadata.rate) * 100).toFixed(2) + "%" : "—"}</td>
            <td>${moneyPrd(r.metadata?.total_gross_paid)}</td>
            <td>${esc(r.metadata?.wallets_processed ?? "—")}</td>
          </tr>
        `
      )
      .join("");

    app.innerHTML = `
      ${nav("wallet")}
      <main class="page">

        <div class="wallet-layout">

          <section class="wallet-header">
            <div class="wallet-name">Технический счёт</div>
            <div class="wallet-number">${esc(walletId)}</div>
          </section>

          <section class="wallet-sidebar">
            <div class="wallet-menu">
              <button class="btn" onclick="walletTransfer()">ВНУТРЕННИЙ ПЕРЕВОД</button>
              <button class="btn" onclick="walletSecurity()">БЕЗОПАСНОСТЬ</button>
            </div>
          </section>

          <section class="wallet-finance-center">
            <div class="wallet-finance">
              <div class="wallet-finance-row">
                <span>ПОЛУЧЕНО КОМИССИОННЫХ</span>
                <strong style="color:#4fce6a;">+${moneyPrd(totalCommissions)}</strong>
              </div>
              <div class="wallet-finance-row">
                <span>ВЫПЛАЧЕНО ПРИБЫЛИ</span>
                <strong style="color:#e0554f;">−${moneyPrd(totalPaid)}</strong>
              </div>
            </div>
          </section>

        </div>

        <section class="card" style="margin-top:24px;">
          <div class="eyebrow">ПОЛУЧЕНО КОМИССИОННЫХ</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Источник</th><th>Сумма</th></tr></thead>
              <tbody>${incomeRowsHtml}</tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <div class="eyebrow">ВЫПЛАЧЕНО ПРИБЫЛИ</div>
          ${
            payoutRowsHtml
              ? `<div class="table-wrap">
                  <table>
                    <thead><tr><th>Месяц</th><th>Ставка</th><th>Выплачено</th><th>Кошельков</th></tr></thead>
                    <tbody>${payoutRowsHtml}</tbody>
                  </table>
                </div>`
              : `<div class="empty">Выплат ещё не было.</div>`
          }
        </section>

      </main>

      ${backBar("wallet()")}
    `;
    return;
  }

  const money = (value) =>
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2
    }).format(value) + " PRD";

  const isActive = status === "ACTIVE";

  app.innerHTML = `
    ${nav("wallet")}

    <main class="page">

      <div class="wallet-layout">

        <section class="wallet-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="wallet-name">
              ${esc(currentProfile.full_name || "Участник")}
            </div>

            <div class="wallet-number">
              ${esc(walletId)}
            </div>
          </div>

          ${prdSaleInfo}
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
            `
        }

      </div>

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

      </section>

    </main>

    ${backBar("wallet()")}
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
      </main>

    ${backBar("wallet()")}
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

    </main>

    ${backBar("wallet()")}
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
      </main>

    ${backBar("wallet()")}
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

    </main>

    ${backBar("wallet()")}
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
          <label>КОММЕНТАРИЙ</label>
          <input id="transfer_note" type="text" placeholder="transfer">
        </div>

        <button class="btn primary" style="width:100%;" onclick="submitTransfer()">
          ПЕРЕВЕСТИ
        </button>
      </section>

    </main>

    ${backBar("wallet()")}
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
    const { error } = await supabaseClient.rpc("transfer_prd", {
      p_to_wallet_id: to,
      p_amount: amount,
      p_note: note || null
    });

    if (error) throw error;

    alert("Перевод выполнен.");
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
    .select("id, loan_amount, collateral_amount, free_balance, status")
    .eq("owner_id", currentProfile.id)
    .maybeSingle();

  if (walletError) return showError(walletError);

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

  const hasLoan = walletRecord && Number(walletRecord.loan_amount) > 0;

  // сколько свободных средств было ДО займа (для расчёта максимума в форме) —
  // если займ уже открыт, добавляем текущий залог обратно, чтобы форма показывала
  // корректный максимум, если понадобится взять новый займ после закрытия текущего
  const availableForLoan = walletRecord
    ? Number(walletRecord.free_balance)
    : 0;

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

      ${
        hasLoan
          ? `
            <section class="card" style="max-width:480px;margin:0 auto;">
              <div class="eyebrow">ОТКРЫТЫЙ ЗАЙМ</div>
              <p class="muted" style="margin-bottom:16px;">
                Займ: <strong>${money(walletRecord.loan_amount)}</strong><br>
                В залоге: <strong>${money(walletRecord.collateral_amount)}</strong> — эти средства нельзя перевести, пока займ не закрыт.
              </p>
              <button class="btn primary" style="width:100%;" onclick="submitRepayLoan()">
                ЗАКРЫТЬ ЗАЙМ
              </button>
            </section>
          `
          : `
            <section class="card" style="max-width:480px;margin:0 auto;">
              <div class="eyebrow">НОВЫЙ ЗАЙМ</div>
              <p class="muted" style="margin-bottom:14px;">
                Максимум 70% от текущего остатка. Залогом становится вся сумма, необходимая для покрытия займа — доступ к ней вернётся после закрытия займа.
              </p>

              <div class="field">
                <label>СУММА ЗАЙМА, PRD</label>
                <input id="loan_amount" type="number" min="1" step="1" placeholder="5000"
                       oninput="updateLoanPreview(${availableForLoan})">
              </div>

              <div id="loan_preview" class="muted" style="margin:14px 0;line-height:1.7;"></div>

              <button class="btn primary" style="width:100%;" onclick="submitTakeLoan()">
                ПОЛУЧИТЬ ЗАЙМ
              </button>
            </section>
          `
      }

    </main>

    ${backBar("wallet()")}
  `;
}

function updateLoanPreview(availableForLoan) {
  const amount = Number(document.getElementById("loan_amount")?.value) || 0;
  const preview = document.getElementById("loan_preview");
  if (!preview) return;

  if (amount <= 0) {
    preview.innerHTML = "";
    return;
  }

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v) + " PRD";

  const collateral = Math.round((amount / 0.7) * 100) / 100;
  const maxLoan = Math.floor(availableForLoan * 0.7);
  const enough = collateral <= availableForLoan;

  preview.innerHTML = `
    Залог: <strong>${money(collateral)}</strong> (будет заблокирован)<br>
    ${
      enough
        ? `После получения займа станет доступно: <strong>${money(amount)}</strong>`
        : `<span style="color:#e0554f;">Недостаточно средств. Максимальный займ сейчас: ${money(maxLoan)}.</span>`
    }
  `;
}

async function submitTakeLoan() {
  const amount = Number(document.getElementById("loan_amount")?.value);

  if (!amount || amount <= 0) {
    return alert("Укажите сумму займа.");
  }

  try {
    const { data, error } = await supabaseClient.rpc("take_loan", {
      p_loan_amount: amount
    });

    if (error) throw error;

    alert(`Займ получен: ${data.loan_amount} PRD. В залоге: ${data.collateral} PRD.`);
    walletLoan();
  } catch (error) {
    showError(error);
  }
}

async function submitRepayLoan() {
  if (!confirm("Закрыть займ? Сумма займа спишется с залога, остаток залога вернётся в свободный доступ.")) return;

  try {
    const { data, error } = await supabaseClient.rpc("repay_loan");

    if (error) throw error;

    alert(`Займ закрыт. Погашено из залога: ${data.repaid} PRD. Освобождено в доступ: ${data.released_to_free} PRD.`);
    walletLoan();
  } catch (error) {
    showError(error);
  }
}

async function walletProfitability() {
  if (!currentUser || !currentProfile) return auth("login");

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero"><h1>Доходность</h1></section>

      <section class="card">
        <p class="muted">
          Полный расчёт доходности будет подключён на следующем этапе развития экономики PRIDE.
        </p>
      </section>

    </main>

    ${backBar("wallet()")}
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

  const isFounder = currentProfile.role === "FOUNDER";

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
            ${isFounder ? `<button class="btn" style="padding:6px 10px;" onclick="deleteDocument('${d.id}', '${d.storage_path}')">Удалить</button>` : ""}
          </td>
        </tr>
      `;
    })
  );

  app.innerHTML = `
    ${nav("wallet")}
    <main class="page">

      <section class="hero"><h1>Документы</h1></section>

      ${
        isFounder
          ? `
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
          `
          : ""
      }

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

    </main>

    ${backBar("wallet()")}
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

  const { data: factorsData } = await supabaseClient.auth.mfa.listFactors();
  const totpFactor = (factorsData?.totp || []).find((f) => f.status === "verified");

  const actionLabel = (a) =>
    ({
      TRANSFER: "Перевод средств",
      LOAN_TAKEN: "Займ получен",
      LOAN_REPAID: "Займ закрыт",
      CONTRACT_INCREASE: "Увеличение контракта",
      PLAYER_REGISTERED: "Зарегистрирован новый Player",
      PLAYER_ACTIVATED: "player_activated",
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
          <input id="sec_pass1" type="text" placeholder="Минимум 6 символов">
        </div>

        <div class="field">
          <label>ПОВТОРИТЕ ПАРОЛЬ</label>
          <input id="sec_pass2" type="text" placeholder="Повторите пароль">
        </div>

        <button class="btn primary" style="width:100%;" onclick="changePassword()">
          СОХРАНИТЬ ПАРОЛЬ
        </button>
      </section>

      <section class="card" style="max-width:480px;margin:0 auto 24px;">
        <div class="eyebrow">2FA — GOOGLE AUTHENTICATOR</div>

        ${
          totpFactor
            ? `
              <p class="muted" style="margin-bottom:14px;">
                <span class="badge green">ВКЛЮЧЕНА</span>
              </p>
              <button class="btn" style="width:100%;" onclick="disable2FA('${totpFactor.id}')">
                ОТКЛЮЧИТЬ 2FA
              </button>
            `
            : `
              <p class="muted" style="margin-bottom:14px;">
                Дополнительная защита входа — код из приложения Google Authenticator при каждом входе.
              </p>
              <button class="btn primary" style="width:100%;" onclick="startEnroll2FA()">
                ПОДКЛЮЧИТЬ 2FA
              </button>
            `
        }

        <div id="mfa_enroll_box"></div>
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

    </main>

    ${backBar("wallet()")}
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
    ? 21
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
        <div class="card">
          <div class="card-label">ЕДИНИЦЫ</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
            <div style="display:flex;justify-content:space-between;font-size:14px;">
              <span class="muted">Личные</span><strong>${esc(currentPlayer.personal_units)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:14px;">
              <span class="muted">Командные</span><strong>${esc(currentPlayer.team_units)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:14px;">
              <span class="muted">Общие</span><strong>${esc(currentPlayer.total_units)}</strong>
            </div>
          </div>
        </div>
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

    </main>

    ${backBar("player()")}
  `;

  checkLevelCongrats();
}

function checkLevelCongrats() {
  if (!currentPlayer) return;
  if (document.getElementById("level-congrats-overlay")) return;

  const lastSeen = currentPlayer.last_congratulated_level || 1;

  if (currentPlayer.level > lastSeen && currentPlayer.level <= 10) {
    showLevelCongratsModal(currentPlayer.level);
  }
}

function showLevelCongratsModal(level) {
  const overlay = document.createElement("div");
  overlay.id = "level-congrats-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;";

  overlay.innerHTML = `
    <div style="background:linear-gradient(145deg,#151821,#0e1016);border:1px solid var(--accent);border-radius:22px;padding:40px 28px;text-align:center;max-width:380px;box-shadow:0 30px 90px #000a;">
      <div style="font-size:52px;margin-bottom:6px;">🎉🏆🎉</div>
      <div class="eyebrow">PRIDE PLAYER</div>
      <h1 style="font-size:30px;margin:12px 0;">ПОЗДРАВЛЯЕМ!</h1>
      <p style="font-size:18px;font-weight:800;margin-bottom:24px;line-height:1.4;">
        Вы достигли ${esc(level)} уровня квалификации!
      </p>
      <button class="btn primary" style="width:100%;" onclick="closeLevelCongratsModal()">
        СПАСИБО
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
}

async function closeLevelCongratsModal() {
  const overlay = document.getElementById("level-congrats-overlay");
  if (overlay) overlay.remove();

  try {
    await supabaseClient.rpc("acknowledge_level_congrats");
    if (currentPlayer) {
      currentPlayer.last_congratulated_level = currentPlayer.level;
    }
  } catch (error) {
    console.error(error);
  }
}

async function team() {
  if (!currentUser || (currentProfile?.role !== "SELLER" && currentProfile?.role !== "FOUNDER")) {
    return alert("Команда доступна только Player.");
  }

  app.innerHTML = `
    ${nav("player")}
    <main class="page">

      <section class="hero"><h1>Команда</h1></section>

      <section class="card">
        <div id="team-root"></div>
      </section>

    </main>

    ${backBar("player()")}
  `;

  await renderTeamLevel(currentProfile.id, "team-root", 0);
}

async function renderTeamLevel(sponsorProfileId, containerId, depth) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `<p class="muted">Загрузка...</p>`;

  const { data, error } = await supabaseClient.rpc("get_team_level", {
    p_sponsor_profile_id: sponsorProfileId
  });

  if (error) {
    container.innerHTML = `<div class="empty">Не удалось загрузить.</div>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      depth === 0 ? `<div class="empty">Пока никого не зарегистрировано.</div>` : "";
    return;
  }

  container.innerHTML = data
    .map((m, i) => {
      const rowKey = `${sponsorProfileId}-${i}`;
      const childId = `team-children-${rowKey}`;
      const levelLabel = m.player_level ? `Уровень ${m.player_level}` : "Wallet-клиент";

      return `
        <div style="margin-left:${depth * 20}px;border-bottom:1px solid var(--line);padding:12px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div>
              <strong>${esc(m.full_name)}</strong>
              <div class="muted" style="font-size:12px;margin-top:2px;">${esc(levelLabel)}</div>
            </div>
            ${
              m.has_downline
                ? `<button class="btn" style="padding:6px 14px;" onclick="toggleTeamChildren('${m.profile_id}', '${childId}', ${depth + 1}, this)">+</button>`
                : ""
            }
          </div>
          <div id="${childId}"></div>
        </div>
      `;
    })
    .join("");
}

async function toggleTeamChildren(profileId, containerId, depth, btnEl) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (container.dataset.open === "true") {
    container.innerHTML = "";
    container.dataset.open = "false";
    btnEl.textContent = "+";
    return;
  }

  btnEl.textContent = "−";
  container.dataset.open = "true";
  await renderTeamLevel(profileId, containerId, depth);
}

function registrationChoice() {
  if (!currentUser || (currentProfile?.role !== "SELLER" && currentProfile?.role !== "FOUNDER")) {
    return alert("Регистрация доступна только Player.");
  }

  app.innerHTML = `
    ${nav("player")}
    <main class="page">

      <section class="hero"><h1>Регистрация клиента</h1></section>

      <section class="card" style="max-width:480px;margin:0 auto;">
        <p class="muted" style="margin-bottom:14px;">
          Сначала зарегистрируйте клиенту Wallet, затем сделайте его Player.
        </p>

        <button class="btn primary" style="width:100%;margin-bottom:8px;" onclick="walletRegister()">
          ЗАРЕГИСТРИРОВАТЬ WALLET
        </button>

        <button class="btn" style="width:100%;" onclick="registerPlayerScreen()">
          ЗАРЕГИСТРИРОВАТЬ PLAYER
        </button>
      </section>

    </main>

    ${backBar("player()")}
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

      <div class="wallet-layout">

        <section class="wallet-header">
          <div class="wallet-name">${esc(currentProfile.full_name || "Игрок")}</div>
        </section>

        <section class="wallet-sidebar">
          <div class="wallet-menu">
            <button class="btn" onclick="career()">КАРЬЕРА</button>
            <button class="btn" onclick="registrationChoice()">РЕГИСТРАЦИЯ</button>
            <button class="btn" onclick="team()">КОМАНДА</button>
            <button class="btn" onclick="walletSecurity()">БЕЗОПАСНОСТЬ</button>
          </div>
        </section>

        <section class="wallet-finance-center">
          <div class="wallet-finance">

            <div class="wallet-finance-row">
              <span>ID</span>
              <strong>${esc(playerId)}</strong>
            </div>

            <div class="wallet-finance-row">
              <span>LEVEL</span>
              <strong>${esc(currentPlayer?.level ?? "—")}</strong>
            </div>

            <div class="wallet-finance-row">
              <span>ЕДИНИЦЫ</span>
              <strong>${esc(currentPlayer?.total_units ?? 0)}</strong>
            </div>

          </div>
        </section>

      </div>

    </main>
  `;

  checkLevelCongrats();
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

  const money = (v) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v || 0) + " PRD";

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
                <th>ID</th>
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

      <section class="card" style="max-width:480px;margin:0 auto 20px;">
        <div class="eyebrow">БЛОКИРОВКА WALLET</div>
        <p class="muted" style="margin-bottom:14px;">
          Человек не сможет войти в PRIVATE WALLET по этому номеру. Увидит: «Доступ к вашему
          кабинету временно ограничен. Обратитесь в службу поддержки для разблокировки.»
        </p>
        <div class="field">
          <label>НОМЕР WALLET</label>
          <input id="admin_wallet_id" type="text" placeholder="PRD-XXXXXXXX">
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn danger" style="flex:1;" onclick="adminBlockWallet()">ЗАБЛОКИРОВАТЬ</button>
          <button class="btn" style="flex:1;" onclick="adminUnblockWallet()">РАЗБЛОКИРОВАТЬ</button>
        </div>
      </section>

      <section class="card" style="max-width:480px;margin:0 auto;">
        <div class="eyebrow">БЛОКИРОВКА ВХОДА В THE GAME</div>
        <p class="muted" style="margin-bottom:14px;">
          Человек не сможет войти в THE GAME по этому Player ID. Увидит:
          «Доступ к вашему кабинету временно ограничен. Обратитесь в службу поддержки для разблокировки.»
        </p>
        <div class="field">
          <label>PLAYER ID</label>
          <input id="admin_account_id" type="text" placeholder="ID-00000000">
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn danger" style="flex:1;" onclick="adminBlockAccount()">ЗАБЛОКИРОВАТЬ</button>
          <button class="btn" style="flex:1;" onclick="adminUnblockAccount()">РАЗБЛОКИРОВАТЬ</button>
        </div>
      </section>

    </main>
  `;
}

async function adminBlockWallet() {
  const walletId = document.getElementById("admin_wallet_id")?.value.trim();
  if (!walletId) return alert("Введите номер Wallet.");
  if (!confirm(`Заблокировать Wallet ${walletId}?`)) return;

  try {
    const { error } = await supabaseClient.rpc("admin_block_wallet", { p_wallet_id: walletId });
    if (error) throw error;
    alert("Wallet заблокирован.");
    admin();
  } catch (error) {
    showError(error);
  }
}

async function adminUnblockWallet() {
  const walletId = document.getElementById("admin_wallet_id")?.value.trim();
  if (!walletId) return alert("Введите номер Wallet.");

  try {
    const { error } = await supabaseClient.rpc("admin_unblock_wallet", { p_wallet_id: walletId });
    if (error) throw error;
    alert("Wallet разблокирован.");
    admin();
  } catch (error) {
    showError(error);
  }
}

async function adminBlockAccount() {
  const id = document.getElementById("admin_account_id")?.value.trim();
  if (!id) return alert("Введите ID.");
  if (!confirm(`Полностью заблокировать аккаунт ${id}? Человек не сможет войти никуда.`)) return;

  try {
    const { error } = await supabaseClient.rpc("admin_block_account", { p_id: id });
    if (error) throw error;
    alert("Аккаунт заблокирован.");
    admin();
  } catch (error) {
    showError(error);
  }
}

async function adminUnblockAccount() {
  const id = document.getElementById("admin_account_id")?.value.trim();
  if (!id) return alert("Введите ID.");

  try {
    const { error } = await supabaseClient.rpc("admin_unblock_account", { p_id: id });
    if (error) throw error;
    alert("Аккаунт разблокирован.");
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

    const lastTab = localStorage.getItem("pride_unlocked_tab");

    if (!session || !lastTab) {
      theGame();
      return;
    }

    await loadSession();

    if (lastTab === "wallet") {
      walletUnlocked = true;
      wallet();
    } else if (lastTab === "academy") {
      academyUnlocked = true;
      bsAcademy();
    } else {
      gameUnlocked = true;
      theGame();
    }

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
    gameUnlocked = false;
    walletUnlocked = false;
    academyUnlocked = false;
    localStorage.removeItem("pride_unlocked_tab");
    theGame();
  }
});

init();
