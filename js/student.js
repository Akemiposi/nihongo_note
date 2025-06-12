// Firebase初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  child
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ユーザー認証状態を監視
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const uid = user.uid;
  const dbRef = ref(db);

  // 名前を取得
  const nameSnap = await get(child(dbRef, `users/${uid}/name`));
  const name = nameSnap.exists() ? nameSnap.val() : "生徒";
  document.getElementById("studentGreeting").textContent = `こんにちは、${name}さん`;

  // 担当の先生UIDを取得
  const pairSnap = await get(child(dbRef, `pairs/${uid}`));
  if (!pairSnap.exists()) {
    alert("あなたに割り当てられた先生が見つかりません。");
    return;
  }
  const teacherUid = pairSnap.val();
  const chatRoomId = `${uid}_${teacherUid}`;
  const chatRef = ref(db, `chats/${chatRoomId}/messages`);

  // 送信処理
  document.getElementById('diaryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      date: form.date.value,
      kotoba: form.kotoba.value,
      bun: form.bun.value,
      kanji: form.kanji.value,
      memo: form.memo.value,
      sender: "student",
      timestamp: new Date().toISOString()
    };
    const newPostRef = push(chatRef);
    await set(newPostRef, data);
    form.reset();
    // 新しいデータ送信後、再取得して表示更新
    await loadDiaryEntries(chatRef);
  });

  // データ取得と表示処理
  async function loadDiaryEntries(chatRef) {
    const listDiv = document.getElementById('diaryList');
    listDiv.innerHTML = '';
    const snapshot = await get(chatRef);
    const data = snapshot.val();

    if (data) {
      Object.values(data).reverse().forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry';
        entryDiv.innerHTML = `
          <strong>📅 ${entry.date}</strong><br>
          ことば：${entry.kotoba}<br>
          ぶん：${entry.bun}<br>
          かんじ：${entry.kanji}<br>
          メモ：${entry.memo}<br>
          ${entry.advice ? `<div style="color:green;">👨‍🏫 アドバイス：${entry.advice}</div>` : ""}
          <hr>
        `;
        listDiv.appendChild(entryDiv);
      });
    }
  }

  // 初期読み込み
  await loadDiaryEntries(chatRef);
});

// ログアウトボタン処理
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}
