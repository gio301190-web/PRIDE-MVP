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
            mode === "login"
              ? "Войдите в свою систему"
              : "Создайте PRIDE ID и Wallet"
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

        <p class="small" style="margin-top:18px">
          ${
            mode === "login"
              ? `Нет аккаунта?
                 <button class="link-btn" onclick="auth('register')">
                   Создать PRIDE ID
                 </button>`
              : `Уже есть аккаунт?
                 <button class="link-btn" onclick="auth('login')">
                   Войти
                 </button>`
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

function wallet() {
  if (!currentUser || !currentProfile) {
    return auth("login");
  }

  const prideId =
    currentProfile.pride_id ||
    currentProfile.prideId ||
    "—";

  const walletId =
    currentWallet?.wallet_id ||
    currentWallet?.id ||
    "—";

  const role = currentProfile.role || "WALLET_USER";

  app.innerHTML = `
    ${nav("wallet")}

    <main class="page">

      <section class="hero">
        <div class="eyebrow">PRIDE WALLET</div>

        <h1>Добро пожаловать,<br>${esc(
          currentProfile.full_name ||
          currentUser.user_metadata?.full_name ||
          "Участник"
        )}</h1>

        <p class="muted">
          Здесь фиксируется твой результат.
        </p>
      </section>

      <section class="grid">

        <div class="card">
          <div class="card-label">PRIDE ID</div>
          <div class="big-value">${esc(prideId)}</div>
        </div>

        <div class="card">
          <div class="card-label">WALLET ID</div>
          <div class="big-value">${esc(walletId)}</div>
        </div>

        <div class="card">
          <div class="card-label">ROLE</div>
          <div class="big-value">${esc(role)}</div>
        </div>

        <div class="card">
          <div class="card-label">STATUS</div>
          <div class="big-value">
            ${esc(currentWallet?.status || "ACTIVE")}
          </div>
        </div>

      </section>

      ${
        role === "WALLET_USER"
          ? `
            <section class="card">
              <div class="eyebrow">NEXT STEP</div>
              <h2>Стать Seller</h2>
              <p class="muted">
                Seller получает доступ к PRIDE Player.
              </p>

              <button class="btn primary" onclick="becomeSeller()">
                Активировать Seller
              </button>
            </section>
          `
          : ""
      }

      ${
        role === "SELLER" || role === "FOUNDER"
          ? `
            <section class="card">
              <div class="eyebrow">PRIDE PLAYER</div>
              <h2>Игровой кабинет доступен</h2>
              <p class="muted">
                Твой PRIDE ID связан с PlayerProfile.
              </p>

              <button class="btn primary" onclick="player()">
                Открыть Player
              </button>
            </section>
          `
          : ""
      }

    </main>
  `;
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
          <div class="card-label">PLAYER ID</div>
          <div class="big-value">${esc(playerId)}</div>
        </div>

        <div class="card">
          <div class="card-label">ROLE</div>
          <div class="big-value">${esc(
            currentProfile.role
          )}</div>
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
