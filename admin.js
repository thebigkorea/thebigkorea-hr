const API_URL =
"https://script.google.com/macros/s/AKfycbz2xfC-tvf7aGqg653KN-hXiKqQe52vzpuD2mtGw5HSbZyp5c3GNmwZNTs8nKRM2yLWag/exec";

window.onload = function () {

  const login =
    localStorage.getItem("tk_admin_login");

  if (login === "Y") {

    showAdminScreen();

  } else {

    showLoginScreen();
  }

  loadStores();

  setTodayDate();
};

function setTodayDate(){

  const d = new Date();

  const yyyy = d.getFullYear();

  const mm =
    String(d.getMonth()+1)
    .padStart(2,"0");

  const dd =
    String(d.getDate())
    .padStart(2,"0");

  document.getElementById("searchDate").value =
    `${yyyy}-${mm}-${dd}`;
}

async function adminLogin() {

  const password =
    document
      .getElementById("adminPassword")
      .value
      .trim();

  const btn =
    document.getElementById("loginBtn");

  const msg =
    document.getElementById("loginMessage");

  if (!password) {

    msg.innerText =
      "비밀번호를 입력해주세요.";

    return;
  }

  btn.disabled = true;
  btn.innerText = "로그인 중...";

  msg.innerText = "확인 중입니다...";

  try {

    const result =
      await apiRequest({

        action:"adminLogin",
        password:password

      });

    if (!result.success) {

      msg.innerText =
        result.message ||
        "로그인 실패";

      btn.disabled = false;
      btn.innerText = "로그인";

      return;
    }

    localStorage.setItem(
      "tk_admin_login",
      "Y"
    );

    showAdminScreen();

  } catch(err) {

    console.error(err);

    msg.innerText =
      "오류가 발생했습니다.";

    btn.disabled = false;
    btn.innerText = "로그인";
  }
}

function logoutAdmin() {

  localStorage.removeItem(
    "tk_admin_login"
  );

  location.reload();
}

function showLoginScreen() {

  document
    .getElementById("loginScreen")
    .classList.remove("hidden");

  document
    .getElementById("adminScreen")
    .classList.add("hidden");
}

function showAdminScreen() {

  document
    .getElementById("loginScreen")
    .classList.add("hidden");

  document
    .getElementById("adminScreen")
    .classList.remove("hidden");

  loadTodayEmployees();
}

async function loadStores() {

  try {

    const result =
      await apiRequest({
        action:"getStores"
      });

    if (!result.success) return;

    const select =
      document.getElementById("storeSelect");

    select.innerHTML =
      `<option value="">
        전체 점포
      </option>`;

    result.stores.forEach(function(store){

      const opt =
        document.createElement("option");

      opt.value =
        store.storeCode;

      opt.innerText =
        "[" +
        store.region +
        "] " +
        store.storeName;

      select.appendChild(opt);
    });

  } catch(err) {

    console.error(err);
  }
}

async function loadTodayEmployees() {

  const box =
    document.getElementById("todayList");

  box.innerHTML =
    `<div class="empty">
      불러오는 중...
    </div>`;

  try {

    const result =
      await apiRequest({

        action:"getTodayEmployees"

      });

    if (
      !result.success ||
      !result.rows ||
      result.rows.length === 0
    ) {

      resetDashboard();

      box.innerHTML =
        `<div class="empty">
          오늘 출퇴근 기록이 없습니다.
        </div>`;

      return;
    }

    updateDashboard(result.rows);

    renderWorkingList(result.rows);

    renderStoreSummary(result.rows);

    box.innerHTML = "";

    result.rows.forEach(function(row){

      box.innerHTML +=
        createAttendanceItem(row);

    });

  } catch(err) {

    console.error(err);

    resetDashboard();

    box.innerHTML =
      `<div class="empty">
        조회 중 오류가 발생했습니다.
      </div>`;
  }
}

async function searchAttendanceByDate() {

  const date =
    document
      .getElementById("searchDate")
      .value;

  const storeCode =
    document
      .getElementById("storeSelect")
      .value;

  const keyword =
    document
      .getElementById("searchName")
      .value
      .trim()
      .toLowerCase();

  const box =
    document.getElementById("storeResult");

  if (!date) {

    alert("조회 날짜를 선택해주세요.");

    return;
  }

  box.innerHTML =
    `<div class="empty">
      조회중입니다...
    </div>`;

  try {

    const result =
      await apiRequest({

        action:"getAttendanceByDate",

        date:date,

        storeCode:storeCode

      });

    if (
      !result.success ||
      !result.rows ||
      result.rows.length === 0
    ) {

      box.innerHTML =
        `<div class="empty">
          조회 결과가 없습니다.
        </div>`;

      return;
    }

    let rows = result.rows;

    if (keyword) {

      rows =
        rows.filter(function(row){

          return String(row.name || "")
            .toLowerCase()
            .includes(keyword);
        });
    }

    if (rows.length === 0) {

      box.innerHTML =
        `<div class="empty">
          검색 결과가 없습니다.
        </div>`;

      return;
    }

    box.innerHTML = "";

    rows.forEach(function(row){

      box.innerHTML +=
        createAttendanceItem(row);

    });

  } catch(err) {

    console.error(err);

    box.innerHTML =
      `<div class="empty">
        조회 중 오류가 발생했습니다.
      </div>`;
  }
}

function createAttendanceItem(row){

  const typeClass =
    row.type === "출근"
    ? "type-in"
    : "type-out";

  return `

    <div class="attendance-item">

      <div class="attendance-top">

        <div class="emp-name">
          ${row.name || ""}
        </div>

        <div class="emp-type ${typeClass}">
          ${row.type || ""}
        </div>

      </div>

      <div class="emp-store">
        ${row.storeName || ""}
      </div>

      <div class="emp-time">
        날짜 :
        ${formatDate(row.date || "")}
        <br>

        시간 :
        ${row.time || ""}
      </div>

      <button
        class="edit-btn"
        onclick="editAttendance(
          '${row.rowIndex}',
          '${row.time || ""}'
        )"
      >
        시간 수정
      </button>

      <button
        class="delete-btn"
        onclick="deleteAttendance(
          '${row.rowIndex}'
        )"
      >
        기록 삭제
      </button>

    </div>
  `;
}

async function editAttendance(
  rowIndex,
  oldTime
){

  const newTime =
    prompt(
      "새 시간을 입력하세요\n예: 09:00:00",
      oldTime
    );

  if (!newTime) return;

  try {

    const result =
      await apiRequest({

        action:"updateAttendance",

        rowIndex:rowIndex,

        newTime:newTime

      });

    if (!result.success) {

      alert(
        result.message ||
        "수정 실패"
      );

      return;
    }

    alert("수정 완료");

    loadTodayEmployees();

    searchAttendanceByDate();

  } catch(err) {

    console.error(err);

    alert("오류가 발생했습니다.");
  }
}

async function deleteAttendance(rowIndex){

  const ok =
    confirm("정말 삭제하시겠습니까?");

  if (!ok) return;

  try {

    const result =
      await apiRequest({

        action:"deleteAttendance",

        rowIndex:rowIndex

      });

    if (!result.success) {

      alert(
        result.message ||
        "삭제 실패"
      );

      return;
    }

    alert("삭제 완료");

    loadTodayEmployees();

    searchAttendanceByDate();

  } catch(err) {

    console.error(err);

    alert("오류가 발생했습니다.");
  }
}

function updateDashboard(rows){

  const totalCount =
    rows.length;

  const checkInCount =
    rows.filter(
      row => row.type === "출근"
    ).length;

  const checkOutCount =
    rows.filter(
      row => row.type === "퇴근"
    ).length;

  const employees = {};

  rows.forEach(function(row){

    const key =
      row.phone || row.name;

    if (!employees[key]) {

      employees[key] = {
        in:false,
        out:false
      };
    }

    if (row.type === "출근") {
      employees[key].in = true;
    }

    if (row.type === "퇴근") {
      employees[key].out = true;
    }
  });

  let workingCount = 0;

  Object.keys(employees)
    .forEach(function(key){

      if (
        employees[key].in &&
        !employees[key].out
      ) {
        workingCount++;
      }
    });

  document.getElementById("totalCount").innerText =
    totalCount;

  document.getElementById("checkInCount").innerText =
    checkInCount;

  document.getElementById("checkOutCount").innerText =
    checkOutCount;

  document.getElementById("workingCount").innerText =
    workingCount;
}

function renderWorkingList(rows){

  const box =
    document.getElementById("workingList");

  const employees = {};

  rows.forEach(function(row){

    const key =
      row.phone || row.name;

    if (!employees[key]) {

      employees[key] = {
        name:row.name,
        store:row.storeName,
        in:false,
        out:false
      };
    }

    if (row.type === "출근") {
      employees[key].in = true;
    }

    if (row.type === "퇴근") {
      employees[key].out = true;
    }
  });

  const workingEmployees = [];

  Object.keys(employees)
    .forEach(function(key){

      if (
        employees[key].in &&
        !employees[key].out
      ) {

        workingEmployees.push(
          employees[key]
        );
      }
    });

  if (workingEmployees.length === 0) {

    box.innerHTML =
      `<div class="empty">
        현재 근무중 직원이 없습니다.
      </div>`;

    return;
  }

  box.innerHTML = "";

  workingEmployees
    .forEach(function(emp){

      box.innerHTML += `

        <div class="working-item">

          <div class="working-name">
            ${emp.name}
          </div>

          <div class="working-store">
            ${emp.store}
          </div>

        </div>
      `;
    });
}

function renderStoreSummary(rows){

  const box =
    document.getElementById("storeSummary");

  const stores = {};

  rows.forEach(function(row){

    if (row.type !== "출근") return;

    const key =
      row.storeName || "미분류";

    if (!stores[key]) {
      stores[key] = 0;
    }

    stores[key]++;
  });

  const keys =
    Object.keys(stores);

  if (keys.length === 0) {

    box.innerHTML =
      `<div class="empty">
        지점별 데이터가 없습니다.
      </div>`;

    return;
  }

  box.innerHTML = "";

  keys.forEach(function(store){

    box.innerHTML += `

      <div class="summary-item">

        <div class="summary-store">
          ${store}
        </div>

        <div class="summary-count">
          출근 기록 :
          ${stores[store]}건
        </div>

      </div>
    `;
  });
}

function resetDashboard(){

  const ids = [
    "totalCount",
    "checkInCount",
    "checkOutCount",
    "workingCount"
  ];

  ids.forEach(function(id){

    const el =
      document.getElementById(id);

    if (el) {
      el.innerText = "0";
    }
  });
}

function formatDate(value){

  if (!value) return "";

  if (typeof value === "string") {
    return value.substring(0,10);
  }

  return value;
}

async function apiRequest(data){

  const response =
    await fetch(API_URL, {

      method:"POST",

      mode:"cors",

      headers:{
        "Content-Type":
        "text/plain;charset=utf-8"
      },

      body:JSON.stringify(data)
    });

  return response.json();
}