// kaikei-auth.js — 会計ページ共通ログイン部品（Firebase Auth / modular v10.13.2）
//
// 使い方（各会計ページの <body> 末尾）:
//   <script type="module">
//     import { setupKaikeiAuth } from './kaikei-auth.js';
//     setupKaikeiAuth({
//       config: { apiKey:"…", authDomain:"…", projectId:"…", appId:"…" },
//       email : "kaikei@example.com",      // ページに埋め込む共通ID（利用者はPWだけ入力）
//       onLogin : () => window.initFirebase && window.initFirebase(),   // ログイン後にデータ同期開始
//       onLogout: () => window.kaikeiStopSync && window.kaikeiStopSync() // ログアウト時に同期停止
//     });
//   </script>
//
// 前提となるページ側のHTML（ゲート内）:
//   <form id="loginForm" autocomplete="on">
//     <input id="loginEmail" name="username" type="email"
//            autocomplete="username" hidden>
//     <input id="lockInput" name="password" type="password"
//            autocomplete="current-password" class="lock-input" placeholder="••••••••">
//     <button id="loginBtn" type="submit" class="lock-btn">ログイン</button>
//   </form>
//   <div class="lock-error" id="lockError"></div>
//   … ヘッダーに <button id="logoutBtn">ログアウト</button>

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

export function setupKaikeiAuth(opts) {
  var app  = initializeApp(opts.config);
  var auth = getAuth(app);

  var lockScreen = document.getElementById('lockScreen');
  var loginForm  = document.getElementById('loginForm');
  var emailInput = document.getElementById('loginEmail');
  var pwInput    = document.getElementById('lockInput');
  var errEl      = document.getElementById('lockError');
  var logoutBtn  = document.getElementById('logoutBtn');

  // 埋め込みID（利用者には見せず、値だけセット）
  if (emailInput && opts.email) emailInput.value = opts.email;

  // ログイン状態を保持しない（ページを開くたびに毎回ログイン）
  setPersistence(auth, inMemoryPersistence).catch(function (e) {
    console.warn('[kaikei-auth] setPersistence failed:', e && e.code);
  });

  // 認証状態でゲートを開閉（保持されていれば自動で開く）
  onAuthStateChanged(auth, function (user) {
    if (user) {
      if (lockScreen) lockScreen.classList.add('hidden');
      if (pwInput) pwInput.value = '';
      if (errEl) errEl.textContent = '';
      if (typeof opts.onLogin === 'function') opts.onLogin(user);
    } else {
      if (lockScreen) lockScreen.classList.remove('hidden');
      if (typeof opts.onLogout === 'function') opts.onLogout();
      setTimeout(function () { if (pwInput) pwInput.focus(); }, 100);
    }
  });

  // ログイン（form submit → Enterキーでもボタンでも発火）
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (emailInput && emailInput.value) || opts.email;
      var pw    = pwInput ? pwInput.value : '';
      if (errEl) errEl.textContent = '';
      signInWithEmailAndPassword(auth, email, pw).catch(function (err) {
        if (errEl) errEl.textContent = 'パスワードが違います。';
        if (pwInput) {
          pwInput.classList.add('error');
          pwInput.value = '';
          setTimeout(function () { pwInput.classList.remove('error'); }, 400);
        }
        console.warn('[kaikei-auth] login failed:', err && err.code);
      });
    });
  }

  // ログアウト
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (!confirm('ログアウトしますか？')) return;
      signOut(auth);
    });
  }

  // 他スクリプトから使えるように公開
  window.kaikeiAuth = {
    auth: auth,
    signOut: function () { return signOut(auth); },
    getToken: function () { return auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null); },
    getEmail: function () { return auth.currentUser ? auth.currentUser.email : null; }
  };
  return auth;
}
