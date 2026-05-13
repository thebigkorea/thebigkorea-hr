const API_URL =
"https://script.google.com/macros/s/AKfycbyriJGrYUjjWwnnb7L8HEUHgoRXXo_ma-aOTQi8fqpVomQfxbmBE18YH9LmWEHrKENsWA/exec";

window.onload = function () {

  const login = localStorage.getItem("tk_admin_login");

  if (login === "Y") {
    showAdminScreen();
  } else {
    showLoginScreen();
  }

  loadStores();
  setTodayDate();
  setSummaryMonth();
  setPayrollMonth();
};

function normalizeType(value) {
  return String(value || "").trim();
}

function setTodayDate() {
  const d = new Date();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  document.getElementById("searchDate").value =
    `${yyyy}-${mm}-${dd}`;
}

function setSummaryMonth() {
  const d = new Date();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");

  document.getElementById("summaryMonth").value =
    `${yyyy}-${mm}`;
}

function setPayrollMonth() {
  const d = new Date();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");

  document.getElementById("payrollMonth").value =
    `${yyyy}-${mm}`;
}

async function adminLogin() {

  const password =
    document.getElementById("adminPassword").value.trim();

  const btn =
    document.getElementById("loginBtn");

  const msg =
    document.getElementById("loginMessage");

  if (!password) {
    msg.innerText = "비밀번호를 입력해주세요.";
    return;
  }

  btn.disabled = true;
  btn.innerText = "로그인 중...";

  try {

    const result = await apiRequest({
      action: "adminLogin",
      password: password
    });

    if (!result.success) {

      msg.innerText =
        result.message || "로그인 실패";

      btn.disabled = false;
      btn.innerText = "로그인";

      return;
    }

    localStorage.setItem("tk_admin_login", "Y");

    showAdminScreen();

  } catch (err) {

    console.error(err);

    msg.innerText = "오류 발생";

    btn.disabled = false;
    btn.innerText = "로그인";
  }
}

function logoutAdmin() {
  localStorage.removeItem("tk_admin_login");
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

    const result = await apiRequest({
      action: "getStores"
    });

    if (!result.success) return;

    const select =
      document.getElementById("storeSelect");

    select.innerHTML =
      `<option value="">전체 점포</option>`;

    const payrollSelect =
      document.getElementById("payrollStoreSelect");

    if (payrollSelect) {
      payrollSelect.innerHTML =
      `<option value="">전체 점포</option>`;
}  

    result.stores.forEach(function (store) {

      const opt =
        document.createElement("option");

      opt.value = store.storeCode;

      opt.innerText =
        "[" + (store.region || "") + "] "
        + (store.storeName || "");

      select.appendChild(opt);
      if (payrollSelect) {
       const opt2 = document.createElement("option");
       opt2.value = store.storeCode;
       opt2.innerText =
         "[" + (store.region || "") + "] " + (store.storeName || "");
       payrollSelect.appendChild(opt2);
      }
    });

  } catch (err) {
    console.error(err);
  }
}

async function loadTodayEmployees() {

  const box =
    document.getElementById("todayList");

  box.innerHTML =
    `<div class="empty">불러오는 중...</div>`;

  try {

    const result = await apiRequest({
      action: "getTodayEmployees"
    });

    if (
      !result.success ||
      !result.rows ||
      result.rows.length === 0
    ) {

      resetDashboard();

      box.innerHTML =
        `<div class="empty">오늘 기록 없음</div>`;

      return;
    }

    updateDashboard(result.rows);

    renderWorkingList(result.rows);

    renderStoreSummary(result.rows);

    box.innerHTML = "";

    result.rows.forEach(function (row) {

      box.innerHTML += createAttendanceItem(row);
    });

  } catch (err) {

    console.error(err);

    box.innerHTML =
      `<div class="empty">조회 오류</div>`;
  }
}

async function loadMonthlySummary() {

  const month =
    document.getElementById("summaryMonth").value;

  const box =
    document.getElementById("monthlySummaryResult");

  box.innerHTML =
    `<div class="empty">조회 중...</div>`;

  try {

    const result = await apiRequest({
      action: "getMonthlyEmployeeSummary",
      month: month
    });

    if (
      !result.success ||
      !result.rows ||
      result.rows.length === 0
    ) {

      box.innerHTML =
        `<div class="empty">데이터 없음</div>`;

      return;
    }

    box.innerHTML = "";

    result.rows.forEach(function (row) {

      box.innerHTML += `
        <div class="attendance-item">

          <div class="attendance-top">
            <div class="emp-name">${row.name}</div>

            <div class="emp-type type-in">
              ${row.workDays}일
            </div>
          </div>

          <div class="emp-store">
            ${row.store}
          </div>

          <div class="emp-time">
            총 근무시간 :
            <b>${row.totalText}</b><br>

            평균 출근 :
            ${row.avgIn}<br>

            평균 퇴근 :
            ${row.avgOut}
          </div>

        </div>
      `;
    });

  } catch (err) {

    console.error(err);

    box.innerHTML =
      `<div class="empty">조회 오류</div>`;
  }
}

async function loadPayrollSummary() {
  const month = document.getElementById("payrollMonth").value;
  const keyword = document.getElementById("payrollKeyword").value.trim();
  const storeCode = document.getElementById("payrollStoreSelect").value;
  const box = document.getElementById("payrollResult");

  box.innerHTML = `<div class="empty">급여 계산 중...</div>`;

  try {
    const result = await apiRequest({
      action: "getMonthlyPayrollSummary",
      month: month
    });

    if (!result.success || !result.rows || result.rows.length === 0) {
      box.innerHTML = `<div class="empty">급여 데이터 없음</div>`;
      return;
    }

    let rows = result.rows;

    if (keyword) {
      rows = rows.filter(row =>
        String(row.name || "").includes(keyword)
      );
    }

    if (storeCode) {
      rows = rows.filter(row =>
        String(row.storeCode || "") === String(storeCode)
      );
    }

    if (rows.length === 0) {
      box.innerHTML = `<div class="empty">검색 결과 없음</div>`;
      return;
    }

    box.innerHTML = "";

    rows.forEach(function (row, index) {
      

      box.innerHTML += `
        <div class="attendance-item payroll-slip"
        id="payrollCard_${index}">

         
          <div class="attendance-top">
            <div class="emp-name">${row.name || ""}</div>
            <div class="emp-type type-in">${row.employmentType || "-"}</div>
          </div>

          <div class="emp-time slip-title">
             <b>${row.name || ""} 급여명세서</b><br>
             지급월 : ${month}
          </div>

          <div class="payroll-btn-row">

          
         </div>

          <div class="pay-section">
            <div class="pay-title">지급내역</div>
            <div class="pay-row"><span>기본급</span><b>${formatWon(row.basicPay)}</b></div>
            <div class="pay-row"><span>연장수당</span><b>${formatWon(row.overtimePay)}</b></div>
            <div class="pay-row"><span>직무수당</span><b>${formatWon(row.dutyPay)}</b></div>
            <div class="pay-row"><span>직책수당</span><b>${formatWon(row.positionPay)}</b></div>
            <div class="pay-row"><span>추가근무수당</span><b>${formatWon(row.extraPay)}</b></div>
            <div class="pay-row"><span>미휴무수당</span><b>${formatWon(row.holidayPay)}</b></div>
            <div class="pay-row"><span>식대</span><b>${formatWon(row.mealPay)}</b></div>
            <div class="pay-row"><span>차량유지비</span><b>${formatWon(row.carPay)}</b></div>
            <div class="pay-row total"><span>지급합계</span><b>${row.totalPayText || "0원"}</b></div>
          </div>

          <div class="pay-section">
            <div class="pay-title">공제내역</div>
            <div class="pay-row"><span>국민연금</span><b>${formatWon(row.nationalPension)}</b></div>
            <div class="pay-row"><span>건강보험</span><b>${formatWon(row.healthInsurance)}</b></div>
            <div class="pay-row"><span>장기요양</span><b>${formatWon(row.longTermCare)}</b></div>
            <div class="pay-row"><span>고용보험</span><b>${formatWon(row.employmentInsurance)}</b></div>
            <div class="pay-row"><span>소득세</span><b>${formatWon(row.incomeTax)}</b></div>
            <div class="pay-row"><span>지방소득세</span><b>${formatWon(row.localIncomeTax)}</b></div>
            <div class="pay-row"><span>보험료정산</span><b>${formatWon(row.insuranceAdjust)}</b></div>
            <div class="pay-row"><span>기타공제</span><b>${formatWon(row.etcDeduction)}</b></div>
            <div class="pay-row total"><span>공제합계</span><b>${row.totalDeductionText || "0원"}</b></div>
          </div>

          <div class="pay-net">
            <span>차인지급액</span>
            <b>${row.realPayText || "0원"}</b>
          </div>

        </div>
      `;
    });

  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="empty">급여 계산 오류</div>`;
  }
}
async function searchAttendanceByDate() {

  const date =
    document.getElementById("searchDate").value;

  const storeCode =
    document.getElementById("storeSelect").value;

  const keyword =
    document
      .getElementById("searchName")
      .value
      .trim()
      .toLowerCase();

  const box =
    document.getElementById("storeResult");

  box.innerHTML =
    `<div class="empty">조회 중...</div>`;

  try {

    const result = await apiRequest({
      action: "getAttendanceByDate",
      date: date,
      storeCode: storeCode
    });

    if (
      !result.success ||
      !result.rows ||
      result.rows.length === 0
    ) {

      box.innerHTML =
        `<div class="empty">조회 결과 없음</div>`;

      return;
    }

    let rows = result.rows;

    if (keyword) {

      rows = rows.filter(function (row) {

        return String(row.name || "")
          .toLowerCase()
          .includes(keyword);
      });
    }

    box.innerHTML = "";

    rows.forEach(function (row) {

      box.innerHTML += createAttendanceItem(row);
    });

  } catch (err) {

    console.error(err);

    box.innerHTML =
      `<div class="empty">조회 오류</div>`;
  }
}

function createAttendanceItem(row) {

  const type =
    normalizeType(row.type);

  const typeClass =
    type === "출근"
      ? "type-in"
      : "type-out";

  return `
    <div class="attendance-item">

      <div class="attendance-top">

        <div class="emp-name">
          ${row.name}
        </div>

        <div class="emp-type ${typeClass}">
          ${type}
        </div>

      </div>

      <div class="emp-store">
        ${row.storeName}
      </div>

      <div class="emp-time">

        날짜 :
        ${formatDate(row.date)}<br>

        시간 :
        ${row.time}

      </div>

    </div>
  `;
}

async function loadEmployees() {

  const keyword =
    document.getElementById("employeeKeyword")
      .value
      .trim();

  const box =
    document.getElementById("employeeResult");

  box.innerHTML =
    `<div class="empty">직원 조회 중...</div>`;

  try {

    const result = await apiRequest({
      action: "getEmployees",
      keyword: keyword
    });

    if (
      !result.success ||
      !result.rows ||
      result.rows.length === 0
    ) {

      box.innerHTML =
        `<div class="empty">직원 없음</div>`;

      return;
    }

    box.innerHTML = "";

    result.rows.forEach(function (emp) {

      box.innerHTML += `
        <div class="attendance-item">

          <div class="attendance-top">

            <div class="emp-name">
              ${emp.name}
            </div>

            <div class="emp-type type-in">
              ${emp.status || "재직"}
            </div>

          </div>

          <div class="emp-store">
            ${emp.brand} / ${emp.storeName}
          </div>

          <div class="emp-time">

            전화번호 :
            ${formatPhone(emp.phone)}<br>

            고용형태 :
            ${emp.employmentType || "-"}<br>

            시급 :
            ${formatWon(emp.hourlyWage)}<br>

            월급 :
            ${formatWon(emp.monthlySalary)}

          </div>

        </div>
      `;
    });

  } catch (err) {

    console.error(err);

    box.innerHTML =
      `<div class="empty">조회 오류</div>`;
  }
}

async function downloadMonthlyExcel() {

  const date =
    document.getElementById("searchDate").value;

  if (!date) {
    alert("날짜 선택");
    return;
  }

  const month = date.substring(0, 7);

  try {

    const result = await apiRequest({
      action: "downloadAttendanceExcel",
      month: month
    });

    if (!result.success) {
      alert("다운로드 실패");
      return;
    }

    let csv = "";

    result.rows.forEach(function (row) {

      csv += row.join(",") + "\n";
    });

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;
    a.download =
      `${month}_출퇴근기록.csv`;

    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {

    console.error(err);

    alert("엑셀 다운로드 오류");
  }
}

function updateDashboard(rows) {

  const totalCount = rows.length;

  const checkInCount =
    rows.filter(
      row =>
        normalizeType(row.type) === "출근"
    ).length;

  const checkOutCount =
    rows.filter(
      row =>
        normalizeType(row.type) === "퇴근"
    ).length;

  const employees = {};

  rows.forEach(function (row) {

    const key =
      row.phone || row.name;

    const type =
      normalizeType(row.type);

    if (!employees[key]) {

      employees[key] = {
        in: false,
        out: false
      };
    }

    if (type === "출근")
      employees[key].in = true;

    if (type === "퇴근")
      employees[key].out = true;
  });

  let workingCount = 0;

  Object.keys(employees).forEach(function (key) {

    if (
      employees[key].in &&
      !employees[key].out
    ) {
      workingCount++;
    }
  });

  document.getElementById("totalCount")
    .innerText = totalCount;

  document.getElementById("checkInCount")
    .innerText = checkInCount;

  document.getElementById("checkOutCount")
    .innerText = checkOutCount;

  document.getElementById("workingCount")
    .innerText = workingCount;
}

function renderWorkingList(rows) {

  const box =
    document.getElementById("workingList");

  const employees = {};

  rows.forEach(function (row) {

    const key =
      row.phone || row.name;

    const type =
      normalizeType(row.type);

    if (!employees[key]) {

      employees[key] = {
        name: row.name,
        store: row.storeName,
        in: false,
        out: false
      };
    }

    if (type === "출근")
      employees[key].in = true;

    if (type === "퇴근")
      employees[key].out = true;
  });

  const workingEmployees = [];

  Object.keys(employees).forEach(function (key) {

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
      `<div class="empty">근무중 직원 없음</div>`;

    return;
  }

  box.innerHTML = "";

  workingEmployees.forEach(function (emp) {

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

function renderStoreSummary(rows) {

  const box =
    document.getElementById("storeSummary");

  const stores = {};

  rows.forEach(function (row) {

    const type =
      normalizeType(row.type);

    if (type !== "출근") return;

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
      `<div class="empty">데이터 없음</div>`;

    return;
  }

  box.innerHTML = "";

  keys.forEach(function (store) {

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

function resetDashboard() {

  const ids = [
    "totalCount",
    "checkInCount",
    "checkOutCount",
    "workingCount"
  ];

  ids.forEach(function (id) {

    const el =
      document.getElementById(id);

    if (el) {
      el.innerText = "0";
    }
  });
}

function formatDate(value) {

  if (!value) return "";

  if (typeof value === "string") {
    return value.substring(0, 10);
  }

  return value;
}

function formatPhone(phone) {

  phone = String(phone || "")
    .replace(/[^0-9]/g, "");

  if (phone.length === 11) {

    return phone.replace(
      /(\d{3})(\d{4})(\d{4})/,
      "$1-$2-$3"
    );
  }

  return phone;
}

function formatWon(value) {

  return Number(value || 0)
    .toLocaleString("ko-KR") + "원";
}

async function apiRequest(data) {

  const response = await fetch(
    API_URL,
    {
      method: "POST",

      mode: "cors",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify(data)
    }
  );

  return response.json();
}


async function downloadPayrollExcel() {
  const month = document.getElementById("payrollMonth").value;

  try {
    const result = await apiRequest({
      action: "getMonthlyPayrollSummary",
      month: month
    });

    if (!result.success || !result.rows || result.rows.length === 0) {
      alert("급여 데이터가 없습니다.");
      return;
    }

    const header = [
      "지급월", "직원명", "점포", "고용형태",
      "기본급", "연장수당", "직무수당", "직책수당", "추가근무수당", "미휴무수당", "식대", "차량유지비", "지급합계",
      "국민연금", "건강보험", "장기요양", "고용보험", "소득세", "지방소득세", "보험료정산", "기타공제", "공제합계",
      "차인지급액"
    ];

    const rows = result.rows.map(row => [
      month,
      row.name || "",
      row.store || "",
      row.employmentType || "",
      row.basicPay || 0,
      row.overtimePay || 0,
      row.dutyPay || 0,
      row.positionPay || 0,
      row.extraPay || 0,
      row.holidayPay || 0,
      row.mealPay || 0,
      row.carPay || 0,
      row.totalPay || 0,
      row.nationalPension || 0,
      row.healthInsurance || 0,
      row.longTermCare || 0,
      row.employmentInsurance || 0,
      row.incomeTax || 0,
      row.localIncomeTax || 0,
      row.insuranceAdjust || 0,
      row.etcDeduction || 0,
      row.totalDeduction || 0,
      row.realPay || 0
    ]);

    const csvRows = [header, ...rows];

    let csv = "";
    csvRows.forEach(row => {
      csv += row.join(",") + "\n";
    });

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${month}_더큰코리아_급여대장.csv`;
    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert("급여대장 다운로드 중 오류가 발생했습니다.");
  }
}