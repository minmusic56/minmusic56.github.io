window.addEventListener("DOMContentLoaded", () => {
  emailjs.init("E8gbkv5o0LLKhagKs"); // Thay bằng user ID của bạn trong EmailJS
  const apiID = "1agdJDtRKsAEDunMK8TD3E6hBpV87FV-I-0wQrqj2Ln8";
  const apiURL = `https://opensheet.elk.sh/${apiID}/Trang%20tính1`;

  const charts = {};
  const label_dienap = "Điện áp (V)";
  const label_dongdien = "Dòng điện (A)";
  const label_congsuat = "Công suất tiêu thụ (W)";


  // Sau đó cứ mỗi 1 giờ thì gọi lại kiểm tra
  setInterval(() => {
    kiemTraVaGuiBaoCaoTuan();
  }, 1000 * 60 * 60); // 1 giờ

  const arrowDown = `<svg xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 -960 960 960" width="60px" fill="#FFFFFF"><path d="M480-360 280-560h400L480-360Z"/></svg>`;
  const arrowUp = `<svg xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 -960 960 960" width="60px" fill="#FFFFFF"><path d="m280-400 200-201 200 201H280Z"/></svg>`;
  const noChange = `<svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#FFFFFF"><path d="M130-450q-20.83 0-35.42-14.62Q80-479.24 80-500.12 80-521 94.58-535.5 109.17-550 130-550h260q20.83 0 35.42 14.62Q440-520.76 440-499.88q0 20.88-14.58 35.38Q410.83-450 390-450H130Zm440 0q-20.83 0-35.42-14.62Q520-479.24 520-500.12q0-20.88 14.58-35.38Q549.17-550 570-550h260q20.83 0 35.42 14.62Q880-520.76 880-499.88q0 20.88-14.58 35.38Q850.83-450 830-450H570Z"/></svg>`;

  const startDateInput = flatpickr("#start-date", { dateFormat: "m/d/Y" });
  const endDateInput = flatpickr("#end-date", { dateFormat: "m/d/Y" });

  const now = new Date();
  const past = new Date();
  past.setDate(now.getDate() - 6);
  startDateInput.setDate(past);
  endDateInput.setDate(now);
  document.getElementById("start-date").value = flatpickr.formatDate(past, "m/d/Y");
  document.getElementById("end-date").value = flatpickr.formatDate(now, "m/d/Y");
  document.getElementById("preset").value = "last7";

  document.getElementById("preset").addEventListener("change", function () {
  const now = new Date();
  let start, end;

  if (this.value === "today") {
    start = end = now;
  } else if (this.value === "last7") {
    end = now;
    start = new Date();
    start.setDate(end.getDate() - 6);
  }

  startDateInput.setDate(start);
  endDateInput.setDate(end);
  document.getElementById("start-date").value = flatpickr.formatDate(start, "m/d/Y");
  document.getElementById("end-date").value = flatpickr.formatDate(end, "m/d/Y");

  // 👉 Đặt lại giờ mặc định khi chọn lại ngày
  document.getElementById("start-time").value = "00:00";
  document.getElementById("end-time").value = "23:59";

  toggleTimeInputs();
});


  document.getElementById("apply-btn").addEventListener("click", () => {
    startAutoUpdate();
    kiemTraVaGuiBaoCaoTuan(); // 👈 Thêm dòng này

  });

  let autoUpdateInterval = null;
  function startAutoUpdate() {
    if (autoUpdateInterval) clearInterval(autoUpdateInterval);
    fetchAndRender();
    autoUpdateInterval = setInterval(fetchAndRender, 2000);
  }

  function toggleTimeInputs() {
    const startDateStr = document.getElementById("start-date").value;
    const endDateStr = document.getElementById("end-date").value;

    const [m1, d1, y1] = startDateStr.split("/").map(Number);
    const [m2, d2, y2] = endDateStr.split("/").map(Number);

    const sameDay = new Date(y1, m1 - 1, d1).getTime() === new Date(y2, m2 - 1, d2).getTime();

    document.querySelectorAll(".time-picker").forEach(el => {
      el.disabled = !sameDay;
      el.style.opacity = sameDay ? "1" : "0.5";
    });

    return sameDay;
  }

  function parseDateTime(dateStr, timeStr) {
    const [m, d, y] = dateStr.split("/").map(Number);
    let [hh, mm, ss] = timeStr.split(":").map(Number);

    // Nếu không có giây thì gán = 0
    if (ss === undefined) ss = 0;

    return new Date(y, m - 1, d, hh, mm, ss);
  }


  function parseVietnameseTime12h(timeStr) {
    let [time, suffix] = timeStr.trim().split(" ");
    let [hh, mm, ss = "00"] = time.split(":").map(Number);

    // Nếu không có CH/SA thì giả định đã là 24h
    if (!suffix) return [hh, mm, ss];

    suffix = suffix.toUpperCase();

    if (["CH", "PM"].includes(suffix) && hh < 12) hh += 12;
    if (["SA", "AM"].includes(suffix) && hh === 12) hh = 0;

    return [hh, mm, parseInt(ss)];
  }


  function fetchAndRender() {
  const startDateStr = document.getElementById("start-date").value;
  const endDateStr = document.getElementById("end-date").value;
  const startTimeStr = document.getElementById("start-time").value;
  const endTimeStr = document.getElementById("end-time").value;

  const isSameDay = toggleTimeInputs();

  // Nếu là cùng 1 ngày và có chọn giờ => lọc theo giờ
  const hasStartTime = startTimeStr && startTimeStr.trim() !== "";
  const hasEndTime = endTimeStr && endTimeStr.trim() !== "";

  const start = isSameDay && hasStartTime
    ? parseDateTime(startDateStr, startTimeStr)
    : parseDateTime(startDateStr, "00:00:00");

  const end = isSameDay && hasEndTime
    ? parseDateTime(endDateStr, endTimeStr)
    : parseDateTime(endDateStr, "23:59:59");

  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      const filtered = data.filter(row => {
        const rawTime = row["Thời gian"];
        if (!rawTime || !rawTime.includes(" ")) return false;

        const [datePart, timePart] = rawTime.split(" ");
        const [d, m, y] = datePart.split("/").map(Number);
        const [hh, mm, ss] = timePart.split(":").map(Number);

        const time = new Date(y, m - 1, d, hh, mm, ss);
        return time >= start && time <= end;
      });
      const times = filtered.map((r) => {
        const [datePart, timePart] = r["Thời gian"].split(" ");
        return isSameDay ? timePart : r["Thời gian"];
      });

      const dienap = filtered.map((r) => parseFloat((r[label_dienap] || "0").replace(",", ".")));
      const dongdien = filtered.map((r) => parseFloat((r[label_dongdien] || "0").replace(",", ".")));
      const congsuat = filtered.map((r) => parseFloat((r[label_congsuat] || "0").replace(",", "."))); 

      updateSummary(filtered);

      updateChart("#chart1", "#info1", label_dienap, dienap, times, "V", null, isSameDay);
      updateChart("#chart2", "#info2", label_dongdien, dongdien, times, "A", null, isSameDay);
      updateChart("#chart3", "#info4", label_congsuat, congsuat, times, "W", updateTotal, isSameDay);
    })
    .catch((err) => console.error("Lỗi khi fetch dữ liệu:", err));
}

document.getElementById("download-excel-btn").addEventListener("click", function () {
  const startDateStr = document.getElementById("start-date").value;
  const endDateStr = document.getElementById("end-date").value;
  const startTimeStr = document.getElementById("start-time").value;
  const endTimeStr = document.getElementById("end-time").value;

  const isSameDay = toggleTimeInputs();

  const start = isSameDay && startTimeStr ? parseDateTime(startDateStr, startTimeStr) : parseDateTime(startDateStr, "00:00:00");
  const end = isSameDay && endTimeStr ? parseDateTime(endDateStr, endTimeStr) : parseDateTime(endDateStr, "23:59:59");

  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      const filtered = data.filter(row => {
        const rawTime = row["Thời gian"];
        if (!rawTime || !rawTime.includes(" ")) return false;
        const [datePart, timePart] = rawTime.split(" ");
        const [d, m, y] = datePart.split("/").map(Number);
        const [hh, mm, ss] = timePart.split(":").map(Number);
        const time = new Date(y, m - 1, d, hh, mm, ss);
        return time >= start && time <= end;
      });

      // ✅ Tạo Excel từ dữ liệu đã lọc
      const ws = XLSX.utils.json_to_sheet(filtered);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Filtered Data");

      XLSX.writeFile(wb, "Data_Project.xlsx");
      alert("✅ Đã tải file Excel!");
    })
    .catch(err => {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      alert("❌ Lỗi khi tải file Excel!");
    });
});




 function updateChart(chartID, infoID, label, values, categories, unit, callback, isSameDay) {
    if (!values.length) {
      console.warn(`Không có dữ liệu cho biểu đồ: ${label}`);
      return;
    }

    const last = values[values.length - 1];
    const prev = values[values.length - 2] ?? last;
    const icon = last > prev ? arrowUp : last < prev ? arrowDown : noChange;

    document.querySelector(infoID).innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        ${icon}
        <h3 style="margin:0;">${last.toFixed(2)} ${unit}</h3>
      </div>
    `;

    if (!charts[chartID]) {
      const options = getChartOptions(label, values, categories, isSameDay);
      charts[chartID] = new ApexCharts(document.querySelector(chartID), options);
      charts[chartID].render();
    } else {
      charts[chartID].updateSeries([{ name: label, data: values }], true);
      charts[chartID].updateOptions({
        xaxis: {
          categories,
          labels: {
            formatter: (val) => {
              if (!val) return "";
              return isSameDay ? val : val.split(" ")[0];
            },
          },
        }
      }, true);
    }

    if (typeof callback === "function") {
      callback(values);
    }
  }

  function getChartOptions(label, values, times, isSameDay) {
    let color = "#F3C623"; 
    let height = 300
    const maxWidth = window.innerWidth;
    if (label.includes("áp")) color = "#007BFF";
    else if (label.includes("suất")) color = "#537D5D";
    if(maxWidth<=600&&label.includes("suất")) height = "48%";
    else if(maxWidth<=600) height = "72%";
    return {
      chart: {
        type: "line",
        height: [height], 
        width: "100%", 
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: "linear",
          dynamicAnimation: { speed: 100 },
        },
      },
      series: [{ name: label, data: values }],
      xaxis: {
        categories: times,
        labels: {
          rotate: -45,
          style: { fontSize: "10px" },
          formatter: (val) => {
            if (!val) return "";
            return isSameDay ? val : val.split(" ")[0];
          },
        },
      },
      stroke: { curve: "smooth", width: 4, colors: [color] },
      fill: { type: "solid", opacity: 0.2, color },
      colors: [color],
      tooltip: {
        x: { format: isSameDay ? "HH:mm:ss" : "dd/MM/yyyy" }
      },
      yaxis: {
      labels: {
        formatter: (val) => val.toFixed(2), // 👈 Hiển thị số thập phân
        style: { fontSize: "10px" },
      },
    },
    stroke: { curve: "smooth", width: 4, colors: [color] },
    fill: { type: "solid", opacity: 0.4, color },
    colors: [color],
    tooltip: {
      x: { format: isSameDay ? "HH:mm:ss" : "dd/MM/yyyy" },
      y: {
        formatter: (val) => `${val.toFixed(2)} ${label.includes("áp") ? "V" : label.includes("suất") ? "W" : "A"}`
      }
    },
    };
  }

  function getChartOptions(label, values, times, isSameDay) {
    let color = "#F3C623"; 
    let height = 300
    const maxWidth = window.innerWidth;
    if (label.includes("áp")) color = "#007BFF";
    else if (label.includes("suất")) color = "#537D5D";
    if(maxWidth<=600&&label.includes("suất")) height = "48%";
    else if(maxWidth<=600) height = "72%";
    return {
      chart: {
        type: "line",
        height: [height], 
        width: "100%", 
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: "linear",
          dynamicAnimation: { speed: 300 },
        },
      },
      series: [{ name: label, data: values }],
      xaxis: {
        categories: times,
        labels: {
          rotate: -45,
          style: { fontSize: "10px" },
          formatter: (val) => {
            if (!val) return "";
            return isSameDay ? val : val.split(" ")[0];
          },
        },
      },
      stroke: { curve: "smooth", width: 4, colors: [color] },
      fill: { type: "solid", opacity: 0.2, color },
      colors: [color],
      tooltip: {
        x: { format: isSameDay ? "HH:mm:ss" : "dd/MM/yyyy" }
      },
      yaxis: {
      labels: {
        formatter: (val) => val.toFixed(2), // 👈 Hiển thị số thập phân
        style: { fontSize: "10px" },
      },
    },
    stroke: { curve: "smooth", width: 4, colors: [color] },
    fill: { type: "solid", opacity: 0.4, color },
    colors: [color],
    tooltip: {
      x: { format: isSameDay ? "HH:mm:ss" : "dd/MM/yyyy" },
      y: {
        formatter: (val) => `${val.toFixed(2)} ${label.includes("áp") ? "V" : label.includes("suất") ? "W" : "A"}`
      }
    },
    };
  }

  function updateTotal(values) {
    const total = values.reduce((a, b) => a + b, 0);
    document.getElementById("info3").innerHTML = `
      <h3 style="font-size:14px;color:#fff;">Tổng công suất tiêu thụ</h3>
      <h3 style="color:#fff;">${total.toFixed(2)} W</h3>
    `;
  }
  
  toggleTimeInputs();
  startAutoUpdate();document.querySelectorAll(".chart").forEach(chartEl => {
  chartEl.addEventListener("mouseenter", () => {
    if (autoUpdateInterval) {
      clearInterval(autoUpdateInterval);
      autoUpdateInterval = null;
      console.log("⏸️ Auto update paused due to hover");
    }
  });

  chartEl.addEventListener("mouseleave", () => {
    if (!autoUpdateInterval) {
      autoUpdateInterval = setInterval(fetchAndRender, 2000);
      console.log("▶️ Auto update resumed after hover");
    }
  });
});

});


// Lấy các phần tử
const toggleBtn = document.getElementById("toggle-btn");
const dateRangeContent = document.getElementById("date-range-container");

// Thêm sự kiện khi bấm nút "Chọn Ngày"
/*toggleBtn.addEventListener("click", function() {
  // Kiểm tra xem nội dung đã hiển thị hay chưa
  if (dateRangeContent.style.maxHeight === "0px" || dateRangeContent.style.maxHeight === "") {
    dateRangeContent.style.maxHeight = dateRangeContent.scrollHeight + "px"; // Kéo dài chiều cao đến chiều cao thực tế của nội dung
    dateRangeContent.style.padding = "20px";
    dateRangeContent.style.border ="1px solid #DDDDDD";
  } else {
    dateRangeContent.style.maxHeight = "0px"; // 
    // Ẩn lại bằng cách đặt max-height = 0
    
    dateRangeContent.style.border ="0px solid #DDDDDD";
    dateRangeContent.style.padding = "0";
  }
});*/
toggleBtn.addEventListener("click", function () {
  const container = document.getElementById("date-range-container");
  container.classList.toggle("show");
});
function duDoanCongSuat(values, minutesAhead = 15) {
  if (values.length === 0) return 0;

  const sampleSize = Math.min(5, values.length); // lấy 5 giá trị gần nhất
  const recent = values.slice(-sampleSize);
  const average = recent.reduce((a, b) => a + b, 0) / sampleSize;

  // giả định không đổi trong vài phút tới
  return average.toFixed(2);
}
function thongKeTheoGio(filteredData, label = "Công suất tiêu thụ (W)") {
  const hourlyStats = {};

  filteredData.forEach(row => {
    const rawTime = row["Thời gian"];
    if (!rawTime || !rawTime.includes(" ")) return;
    const [_, timePart] = rawTime.split(" ");
    const [hh] = timePart.split(":");

    const hour = parseInt(hh);
    const val = parseFloat((row[label] || "0").replace(",", "."));

    if (!hourlyStats[hour]) hourlyStats[hour] = { sum: 0, count: 0 };
    hourlyStats[hour].sum += val;
    hourlyStats[hour].count += 1;
  });

  const result = Object.entries(hourlyStats).map(([hour, { sum, count }]) => ({
    hour: `${hour}:00`,
    avg: (sum / count).toFixed(2),
  }));

  return result.sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
}// Hàm thống kê ngày có công suất tiêu thụ cao nhất
function thongKeNgayTieuThuCaoNhat(data, label = "Công suất tiêu thụ (W)") {
  const dailyStats = {};

  data.forEach(row => {
    const rawTime = row["Thời gian"];
    if (!rawTime || !rawTime.includes(" ")) return;

    const [datePart] = rawTime.split(" ");
    const val = parseFloat((row[label] || "0").replace(",", "."));
    
    if (!dailyStats[datePart]) dailyStats[datePart] = 0;
    dailyStats[datePart] += val;
  });

  let maxDate = null;
  let maxValue = -Infinity;
  for (const [date, total] of Object.entries(dailyStats)) {
    if (total > maxValue) {
      maxValue = total;
      maxDate = date;
    }
  }

  return {
    date: maxDate,
    total: maxValue.toFixed(2)
  };
}

// Hàm gửi email bằng EmailJS
function guiBaoCaoEmail(ngay, tongCongSuat) {
  emailjs.send("service_nzpo11o", "template_ijcvrxp", {
    title: "Báo cáo theo tuần",
    email: "votrunganh1311@gmail.com", // có thể thay bằng input người dùng nếu cần
    message: `📊 Báo cáo tuần:\nNgày ${ngay} có mức tiêu thụ công suất cao nhất: ${tongCongSuat} W.`
  }).then(() => {
    console.log("✅ Đã gửi báo cáo qua EmailJS!");
  }).catch((error) => {
    console.error("❌ Lỗi gửi email:", error);
  });
}

// Hàm xử lý lấy dữ liệu và gọi hàm gửi
function kiemTraVaGuiBaoCaoTuan() {
  const apiURL = "https://opensheet.elk.sh/1agdJDtRKsAEDunMK8TD3E6hBpV87FV-I-0wQrqj2Ln8/Trang%20tính1";
  const now = new Date();
  if (now.getDay() !== 0) return; // 0 = Chủ nhật
  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        alert("⚠️ Không có dữ liệu!");
        return;
      }

      // Tìm công suất cao nhất
      let maxPower = -Infinity;
      let maxRow = null;

      data.forEach(row => {
        const power = parseFloat(row["Công suất tiêu thụ (W)"]);
        if (!isNaN(power) && power > maxPower) {
          maxPower = power;
          maxRow = row;
        }
      });

      if (maxRow) {
        const ngay = now.toLocaleDateString("vi-VN");
        guiBaoCaoEmail(ngay, maxPower);
      } else {
        alert("⚠️ Không tìm thấy công suất hợp lệ.");
      }
    })
    .catch((err) => {
      console.error("❌ Lỗi gọi API:", err);
      alert("❌ Lỗi gọi dữ liệu.");
    });
}

function updateSummary(data) {
  if (!data || data.length === 0) return;

  const label = "Công suất tiêu thụ (W)";
  const parsedData = data
    .map(row => {
      const [datePart] = row["Thời gian"].split(" ");
      const value = parseFloat((row[label] || "0").replace(",", "."));
      if (isNaN(value)) return null; // Bỏ dữ liệu lỗi
      return [datePart, value];
    })
    .filter(item => item !== null); // Bỏ null

  if (parsedData.length === 0) return; // Không có dữ liệu hợp lệ

  const total = parsedData.reduce((sum, item) => sum + item[1], 0);
  document.getElementById("tong-san-luong").textContent = total.toFixed(2);
  document.getElementById("tong-ngay").textContent = 7;

  // Tìm max và min
const max = parsedData.reduce((a, b) => (b[1] > a[1] ? b : a));
let min = parsedData
  .filter(x => x[1] > 0) // bỏ các giá trị bằng 0
  .reduce((a, b) => (b[1] < a[1] ? b : a));

  /*for (let i = 1; i < parsedData.length; i++) {
    if (parsedData[i][1] > max[1]) max = parsedData[i];
    if (parsedData[i][1] < min[1]) min = parsedData[i];
  }*/

  // Hiển thị kết quả
  document.getElementById("ngay-max").textContent = formatDate(max[0]);
  document.getElementById("san-luong-max").textContent = max[1].toFixed(2);
  document.getElementById("ngay-min").textContent = min[0];
  document.getElementById("san-luong-min").textContent = min[1].toFixed(2);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}




