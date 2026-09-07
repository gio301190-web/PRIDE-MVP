const KEY="pride_mvp_v2";
const state=JSON.parse(localStorage.getItem(KEY)||'{"users":[],"current":null}');
const app=document.getElementById("app");

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function uid(prefix){return prefix+"-"+Math.random().toString(36).slice(2,8).toUpperCase()}
function current(){return state.users.find(u=>u.id===state.current)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function nav(active){return `<header class="top"><div class="brand">P<span>R</span>IDE</div><div class="nav">
<button class="${active==="wallet"?"active":""}" onclick="go('wallet')">Wallet</button>
${current()?.role==="SELLER"||current()?.role==="FOUNDER"?`<button class="${active==="player"?"active":""}" onclick="go('player')">PRIDE Player</button>`:""}
${current()?.role==="FOUNDER"?`<button class="${active==="admin"?"active":""}" onclick="go('admin')">Admin</button>`:""}
</div><button class="btn" onclick="logout()">Выйти</button></header>`}

function auth(mode="login"){app.innerHTML=`<div class="form-wrap"><div class="form">
<div class="eyebrow">PRIDE ECOSYSTEM</div><h1>${mode==="login"?"Вход":"Создать PRIDE ID"}</h1>
<p class="muted">${mode==="login"?"Войдите в свой Wallet":"Первый шаг — создать Wallet. Доступ к PRIDE Player активируется отдельно."}</p>
${mode==="register"?`<div class="field"><label>Имя</label><input id="name" placeholder="Ваше имя"></div>`:""}
<div class="field"><label>Email</label><input id="email" type="email" placeholder="you@example.com"></div>
<div class="field"><label>Пароль</label><input id="pass" type="password" placeholder="••••••••"></div>
${mode==="register"?`<div class="field"><label>Sponsor PRIDE ID (необязательно)</label><input id="sponsor" placeholder="PRIDE-..."></div>`:""}
<button class="btn primary" onclick="${mode==="login"?"login()":"register()"}">${mode==="login"?"Войти":"Создать Wallet"}</button>
<p class="small" style="margin-top:18px">${mode==="login"?'Нет аккаунта?':'Уже зарегистрированы?'} <button class="link" onclick="auth('${mode==="login"?"register":"login"}')">${mode==="login"?"Создать PRIDE ID":"Войти"}</button></p>
</div></div>`}

function register(){
 const name=document.getElementById("name").value.trim(),email=document.getElementById("email").value.trim().toLowerCase(),pass=document.getElementById("pass").value,sponsor=document.getElementById("sponsor").value.trim();
 if(!name||!email||!pass)return alert("Заполните имя, email и пароль.");
 if(state.users.some(u=>u.email===email))return alert("Этот email уже зарегистрирован.");
 const u={id:uid("PRIDE"),walletId:uid("WALLET"),playerId:null,name,email,pass,role:"WALLET_USER",sponsor:sponsor||null,createdAt:new Date().toISOString(),prd:0,units:0,registeredWallets:[]};
 state.users.push(u);state.current=u.id;save();go("wallet")
}
function login(){
 const email=document.getElementById("email").value.trim().toLowerCase(),pass=document.getElementById("pass").value;
 const u=state.users.find(x=>x.email===email&&x.pass===pass);
 if(!u)return alert("Неверный email или пароль.");
 state.current=u.id;save();go("wallet")
}
function logout(){state.current=null;save();auth("login")}
function go(page){
 if(!current())return auth("login");
 if(page==="wallet")wallet();else if(page==="player")player();else if(page==="admin")admin();
}
function wallet(){
 const u=current(); app.innerHTML=nav("wallet")+`<main class="content">
<div class="hero"><div><div class="eyebrow">PRIDE WALLET</div><h1>Привет, ${esc(u.name)}</h1><p class="muted">Ваш экономический кабинет.</p></div><span class="badge green">${u.role}</span></div>
<div class="grid">
<div class="card"><div class="small">PRIDE ID</div><div class="value">${u.id}</div></div>
<div class="card"><div class="small">WALLET ID</div><div class="value">${u.walletId}</div></div>
<div class="card"><div class="small">PRD BALANCE</div><div class="value">${u.prd.toLocaleString()}</div></div>
<div class="card wide"><h3>Статус доступа</h3><p class="muted">${u.role==="WALLET_USER"?"У вас есть Wallet. PRIDE Player пока недоступен.":"Вы активный участник PRIDE Player."}</p>
<div class="actions">${u.role==="WALLET_USER"?`<button class="btn primary" onclick="becomeSeller()">Стать Seller / открыть PRIDE Player</button>`:`<button class="btn primary" onclick="go('player')">Открыть PRIDE Player</button>`}</div></div>
<div class="card"><h3>Привязка</h3><div class="rows"><div class="row"><span>Sponsor</span><b>${esc(u.sponsor||"—")}</b></div><div class="row"><span>Дата</span><b>${new Date(u.createdAt).toLocaleDateString("ru-RU")}</b></div></div></div>
</div></main>`
}
function becomeSeller(){
 const u=current();u.role="SELLER";u.playerId=uid("PLAYER");save();alert("Seller активирован. Создан PRIDE Player.");go("player")
}
function player(){
 const u=current();if(!["SELLER","FOUNDER"].includes(u.role))return wallet();
 app.innerHTML=nav("player")+`<main class="content"><div class="hero"><div><div class="eyebrow">PRIDE PLAYER</div><h1>Игровой кабинет</h1><p class="muted">Здесь человек действует, продаёт, обучается и получает результат в Wallet.</p></div><span class="badge green">${u.role}</span></div>
<div class="grid">
<div class="card"><div class="small">PLAYER ID</div><div class="value">${u.playerId}</div></div>
<div class="card"><div class="small">PERSONAL UNITS</div><div class="value">${u.units}</div></div>
<div class="card"><div class="small">REGISTERED WALLETS</div><div class="value">${u.registeredWallets.length}</div></div>
<div class="card wide"><h3>Register New Wallet</h3><p class="muted">Только Seller/Founder регистрирует нового Wallet User.</p>
<div class="field"><label>Имя нового пользователя</label><input id="nwname" placeholder="Имя"></div>
<div class="field"><label>Email</label><input id="nwemail" type="email" placeholder="email@example.com"></div>
<div class="field"><label>Временный пароль</label><input id="nwpass" placeholder="Пароль для первого входа"></div>
<button class="btn primary" onclick="createWallet()">Зарегистрировать Wallet</button></div>
<div class="card"><h3>Мои зарегистрированные Wallets</h3>${u.registeredWallets.length?u.registeredWallets.map(id=>{const x=state.users.find(a=>a.id===id);return `<div class="row"><span>${esc(x?.name||"")}</span><b>${esc(x?.walletId||id)}</b></div>`}).join(""):`<div class="empty">Пока нет зарегистрированных Wallets.</div>`}</div>
</div></main>`
}
function createWallet(){
 const u=current(),name=document.getElementById("nwname").value.trim(),email=document.getElementById("nwemail").value.trim().toLowerCase(),pass=document.getElementById("nwpass").value;
 if(!name||!email||!pass)return alert("Заполните все поля.");
 if(state.users.some(x=>x.email===email))return alert("Этот email уже существует.");
 const x={id:uid("PRIDE"),walletId:uid("WALLET"),playerId:null,name,email,pass,role:"WALLET_USER",sponsor:u.id,createdAt:new Date().toISOString(),prd:0,units:0,registeredWallets:[]};
 state.users.push(x);u.registeredWallets.push(x.id);save();alert(`Wallet создан. PRIDE ID: ${x.id}\nWallet ID: ${x.walletId}`);player()
}
function admin(){
 const u=current();if(u.role!=="FOUNDER")return wallet();
 app.innerHTML=nav("admin")+`<main class="content"><div class="hero"><div><div class="eyebrow">FOUNDER / ADMIN</div><h1>PRIDE Control Center</h1><p class="muted">Тестовый административный слой MVP.</p></div></div>
<div class="grid"><div class="card"><div class="small">USERS</div><div class="value">${state.users.length}</div></div><div class="card"><div class="small">WALLETS</div><div class="value">${state.users.length}</div></div><div class="card"><div class="small">SELLERS</div><div class="value">${state.users.filter(x=>x.role==="SELLER"||x.role==="FOUNDER").length}</div></div>
<div class="card wide"><h3>Все PRIDE ID</h3>${state.users.map(x=>`<div class="row"><span>${esc(x.name)} <span class="small">${esc(x.role)}</span></span><b>${esc(x.id)}</b></div>`).join("")||`<div class="empty">Нет пользователей</div>`}</div></div></main>`
}
window.auth=auth;window.register=register;window.login=login;window.logout=logout;window.go=go;window.becomeSeller=becomeSeller;window.createWallet=createWallet;
(function init(){
 if(!state.users.length){
  const founder={id:"PRIDE-FOUNDER",walletId:"WALLET-FOUNDER",playerId:"PLAYER-FOUNDER",name:"Founder",email:"founder@pride.local",pass:"PRIDE-DEMO-2026",role:"FOUNDER",sponsor:null,createdAt:new Date().toISOString(),prd:0,units:0,registeredWallets:[]};
  state.users.push(founder);save();
 }
 if(current())wallet();else auth("login");
})();
