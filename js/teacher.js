// Firebaseアプリ初期化関連
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";

// Firebase Authentication関連
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

// Firebase Realtime Database関連
import {
  getDatabase,
  ref,
  update,
  get,
  child,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

// Firebase構成ファイルを読み込み
import { firebaseConfig } from "./firebaseConfig.js";

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Firebase Authenticationでログイン状態を監視
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // 未ログインならログインページへリダイレクト
    window.location.href = "index.html";
    return;
  }

  // ユーザー（講師）のUIDを取得
  const teacherUid = user.uid;
  const dbRef = ref(db);

  // 講師名を取得
  const nameSnap = await get(child(dbRef, `users/${teacherUid}/name`));
  const teacherName = nameSnap.exists() ? nameSnap.val() : "講師";

  // 講師名を表示
  document.getElementById(
    "teacherGreeting"
  ).textContent = `こんにちは、${teacherName}先生`;

  // 生徒と講師の割り当て（pairs）を取得
  const pairsSnap = await get(child(dbRef, "pairs"));
  if (!pairsSnap.exists()) {
    console.log("pairs が存在しません");
    return;
  }

  const pairs = pairsSnap.val();

  // 担当している生徒のUIDを抽出
  const myStudents = Object.entries(pairs)
    .filter(
      ([studentUid, assignedTeacherUid]) => assignedTeacherUid === teacherUid
    )
    .map(([studentUid]) => studentUid);

  console.log("担当生徒一覧:", myStudents);

  // 担当生徒の投稿を取得・表示
  await getStudentPosts(teacherUid);
});

// 担当生徒の投稿を取得する関数
async function getStudentPosts(teacherUid) {
  const dbRef = ref(db);
  const pairsSnap = await get(child(dbRef, "pairs"));
  if (!pairsSnap.exists()) return;

  const pairs = pairsSnap.val();
  const myStudents = Object.entries(pairs)
    .filter(
      ([studentUid, assignedTeacherUid]) => assignedTeacherUid === teacherUid
    )
    .map(([studentUid]) => studentUid);

  const postsDiv = document.getElementById("studentPosts");
  postsDiv.innerHTML = ""; // 画面をクリア

  for (const studentUid of myStudents) {
    // 生徒の名前を取得
    const studentNameSnap = await get(child(dbRef, `users/${studentUid}/name`));
    const studentName = studentNameSnap.exists()
      ? studentNameSnap.val()
      : "生徒";

    // チャットルームIDとメッセージを取得
    const chatRoomId = `${studentUid}_${teacherUid}`;
    const chatRef = ref(db, `chats/${chatRoomId}/messages`);
    const snapshot = await get(chatRef);
    const data = snapshot.val();

    if (data) {
      const section = document.createElement("div");
      section.innerHTML = `<h4>${studentName}さんの記録</h4>`;

      Object.entries(data)
        .reverse()
        .forEach(([msgId, msg]) => {
          const entry = document.createElement("div");
          entry.className = "entry";

          let content = `
          📅 ${msg.date}<br>
          ことば：${msg.kotoba}<br>
          ぶん：${msg.bun}<br>
          かんじ：${msg.kanji}<br>
          メモ：${msg.memo}<br>
        `;

          // 生徒からの投稿にはアドバイス欄を表示
          if (msg.sender === "student") {
            content += `
            <span style="color: green;">🧑‍🏫 アドバイス：${
              msg.advice ?? "（まだありません）"
            }</span><br>
            <label>アドバイス：<input type="text" data-chatid="${chatRoomId}" data-msgid="${msgId}" class="adviceInput"></label><br>
            <button class="sendAdvice" data-chatid="${chatRoomId}" data-msgid="${msgId}">送信</button>
          `;
          } else if (msg.sender === "teacher") {
            content += `<span style="color: green;">🧑‍🏫 アドバイス：${
              msg.advice ?? "（内容なし）"
            }</span>`;
          }

          entry.innerHTML = content + "<hr>";
          section.appendChild(entry);
        });

      postsDiv.appendChild(section);
    }
  }
}

// アドバイス送信処理
const postsArea = document.getElementById("studentPosts");
postsArea.addEventListener("click", async (e) => {
  if (e.target.classList.contains("sendAdvice")) {
    const chatId = e.target.dataset.chatid;
    const msgId = e.target.dataset.msgid;
    const input = document.querySelector(
      `input[data-chatid='${chatId}'][data-msgid='${msgId}']`
    );
    const adviceText = input.value;
    if (!adviceText) return;

    const msgRef = ref(db, `chats/${chatId}/messages/${msgId}`);
    await update(msgRef, {
      advice: adviceText,
    });
    alert("アドバイスを送信しました。");
    input.value = "";
  }
});

// ログアウトボタン
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}
