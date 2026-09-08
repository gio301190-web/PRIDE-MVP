const supabaseClient = window.supabase.createClient(
  window.PRIDE_CONFIG.SUPABASE_URL,
  window.PRIDE_CONFIG.SUPABASE_PUBLISHABLE_KEY
);

const app = document.getElementById("app");

let currentUser = null;
let currentProfile = null;
let currentWallet = null;
let currentPlayer = null;

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
  if (!currentUser) return "";

  return `
    <header class="topbar">
      <div>
        <div class="eyebrow">PRIDE ECOSYSTEM</div>
        <h2>PRIDE</h2>
      </div>

      <div class="top-actions">
        <button class="btn ${active === "wallet" ? "active" : ""}"
          onclick="wallet()">Wallet</button>

        ${
          currentProfile?.role === "SELLER" ||
          currentProfile?.role === "FOUNDER"
            ? `<button class="btn ${active === "player" ? "active" : ""}"
                onclick="player()">Player</button>`
            : ""
        }

        ${
          currentProfile?.role === "FOUNDER"
            ? `<button class="btn ${active === "admin" ? "active" : ""}"
                onclick="admin()">Admin</button>`
            : ""
        }

        <button class="btn" onclick="logout()">Выйти</button>
      </div>
    </header>
  `;
}

function auth(mode = "login") {
  app.innerHTML = `
    <main class="auth-page">
      <div class="auth-card">

        <div class="eyebrow">PRIDE ECOSYSTEM</div>

        <h1>PRIDE</h1>

        <p class="muted">
          ${
            "Войдите в PRIDE"
          }
        </p>

        ${
          mode === "register"
            ? `
              <div class="field">
                <label>Имя</label>
                <input id="name" type="text" placeholder="Ваше имя">
              </div>
            `
            : ""
        }

        <div class="field">
          <label>Email</label>
          <input id="email" type="email" placeholder="you@example.com">
        </div>

        <div class="field">
          <label>Пароль</label>
          <input id="pass" type="password" placeholder="Минимум 6 символов">
        </div>

        ${
          mode === "register"
            ? `
              <div class="field">
                <label>Sponsor PRIDE ID <span class="muted">(необязательно)</span></label>
                <input id="sponsor" type="text" placeholder="PRIDE-XXXXXXXX">
              </div>
            `
            : ""
        }

        <button class="btn primary" onclick="${
          mode === "login" ? "login()" : "register()"
        }">
          ${mode === "login" ? "Войти" : "Создать PRIDE ID"}
        </button>

        <p class="small muted" style="margin-top:18px">
          Регистрация доступна только через кабинет Player.
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

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const pass = document.getElementById("pass")?.value;

  if (!email || !pass) {
    return alert("Введите email и пароль.");
  }

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error) throw error;

    await loadSession();
    wallet();

  } catch (error) {
    showError(error);
  }
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
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerResult.error) {
    console.warn("Player profile:", playerResult.error);
  }

  currentPlayer = playerResult.data || null;
}

async function wallet() {
  if (!currentUser || !currentProfile) {
    return auth("login");
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

      <section class="hero">
        <div class="eyebrow">PRIDE WALLET</div>

        <h1>
          Добро пожаловать,<br>
          ${esc(currentProfile.full_name || "Участник")}
        </h1>

        <p class="muted">
          Ваш личный Wallet.
        </p>
      </section>

      <section class="grid">

        <div class="card">
          <div class="card-label">ID</div>
          <div class="big-value">${esc(profileId)}</div>
        </div>

        <div class="card">
          <div class="card-label">WALLET</div>
          <div class="big-value">${esc(walletId)}</div>
        </div>

      </section>

      ${
        !isActive
          ? `
            <section class="card wallet-inactive">
              <div class="eyebrow">СТАТУС</div>
              <h2>КАБИНЕТ НЕАКТИВЕН</h2>

              <p class="muted">
                Контракт ещё не активирован.
              </p>

              <div class="wallet-menu">
                <button
                  class="btn primary"
                  onclick="activateWallet()"
                >
                  АКТИВАЦИЯ КОНТРАКТА
                </button>
              </div>
            </section>
          `
          : `
            <section class="card">

              <div class="eyebrow">WALLET</div>

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

            <section class="card">

              <div class="eyebrow">WALLET</div>

              <div class="wallet-menu">

                <button class="btn" onclick="walletData()">
                  ДАННЫЕ
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

            ${
              isFounderWallet
                ? `
                  <section class="card">
                    <div class="eyebrow">FOUNDER</div>
                    <h2>Founder Wallet</h2>
                    <p class="muted">
                      Специальный Founder Wallet.
                      Расчёт Units к данному Wallet не применяется.
                    </p>
                  </section>
                `
                : ""
            }
          `
      }

    </main>
  `;
}
async function walletData() {
  if (!currentUser || !currentProfile) {
    return auth("login");
  }

  const { data: authUser, error: authError } = await supabaseClient
    .from("profiles")
    .select("id, pride_id, full_name, role")
    .eq("id", currentProfile.id)
    .single();

  if (authError) {
    showError(authError);
    return;
  }

  const { data: walletRecord, error: walletError } = await supabaseClient
    .from("wallets")
    .select("wallet_id")
    .eq("owner_id", currentProfile.id)
    .maybeSingle();

  if (walletError) {
    showError(walletError);
    return;
  }

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError) {
    showError(userError);
    return;
  }

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

        <div class="data-row">
          <span>ID</span>
          <strong>${esc(authUser.pride_id || "—")}</strong>
        </div>

        <div class="data-row">
          <span>WALLET</span>
          <strong>${esc(walletRecord?.wallet_id || "—")}</strong>
        </div>

        <div class="data-row">
          <span>ИМЯ</span>
          <strong>${esc(authUser.full_name || "—")}</strong>
        </div>

        <div class="data-row">
          <span>EMAIL</span>
          <strong>${esc(user?.email || "—")}</strong>
        </div>

        <div class="data-row">
          <span>ТЕЛЕФОН</span>
          <strong>${esc(user?.phone || "Не указан")}</strong>
        </div>

      </section>

      <section class="card">

        <div class="eyebrow">ИЗМЕНЕНИЕ ДАННЫХ</div>

        <label class="field">
          <span>EMAIL</span>
          <input
            id="wallet-email"
            type="email"
            value="${esc(user?.email || "")}"
            autocomplete="email"
          >
        </label>

        <label class="field">
          <span>ПОВТОР EMAIL</span>
          <input
            id="wallet-email-repeat"
            type="email"
            value="${esc(user?.email || "")}"
            autocomplete="email"
          >
        </label>

        <label class="field">
          <span>ТЕЛЕФОН</span>
          <input
            id="wallet-phone"
            type="tel"
            value="${esc(user?.phone || "")}"
            placeholder="+995 5XX XXX XXX"
            autocomplete="tel"
          >
        </label>

        <label class="field">
          <span>ПОВТОР ТЕЛЕФОНА</span>
          <input
            id="wallet-phone-repeat"
            type="tel"
            value="${esc(user?.phone || "")}"
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
    const updates = {};

    if (email) {
      updates.email = email;
    }

    if (phone) {
      updates.phone = phone;
    }

    const { error } = await supabaseClient.auth.updateUser(updates);

    if (error) {
      throw error;
    }

    alert(
      "Данные сохранены. Если Supabase потребует подтверждение нового email или телефона, проверьте соответствующее сообщение."
    );

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
          <div class="big-value">1</div>
        </div>

        <div class="card">
          <div class="card-label">UNITS</div>
          <div class="big-value">0</div>
        </div>

      </section>

      <section class="card">
        <div class="eyebrow">CORE LOOP</div>
        <h2>LEARN → PLAY → SELL → EARN → LEVEL UP → REWARD</h2>
        <p class="muted">
          Экономика PRIDE будет подключаться следующим этапом.
        </p>
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

    </main>
  `;
}

async function init() {
  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      auth("login");
      return;
    }

    await loadSession();
    wallet();

  } catch (error) {
    console.error(error);
    auth("login");
  }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    currentUser = null;
    currentProfile = null;
    currentWallet = null;
    currentPlayer = null;
    auth("login");
  }
});

init();
