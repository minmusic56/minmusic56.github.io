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

  // Kiểm tra ngay khi khởi động (nếu là chủ nhật)
  kiemTraVaGuiBaoCaoTuan();

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

    try {
      if (this.value === "today") {
        start = end = now;
      } else if (this.value === "last7") {
        end = now;
        start = new Date();
        start.setDate(end.getDate() - 6);
      } else if (this.value === "custom") {
        // Không thay đổi gì, giữ nguyên giá trị hiện tại
        return;
      }

      if (start && end) {
        startDateInput.setDate(start);
        endDateInput.setDate(end);
        document.getElementById("start-date").value = flatpickr.formatDate(start, "m/d/Y");
        document.getElementById("end-date").value = flatpickr.formatDate(end, "m/d/Y");

        // 👉 Đặt lại giờ mặc định khi chọn lại ngày
        document.getElementById("start-time").value = "00:00";
        document.getElementById("end-time").value = "23:59";

        toggleTimeInputs();
        
        // Tự động cập nhật dữ liệu
        fetchAndRender();
      }
    } catch (error) {
      console.error("Lỗi khi xử lý preset:", error);
    }
  });


  // Thêm event listener cho việc thay đổi ngày
  document.getElementById("start-date").addEventListener("change", function() {
    toggleTimeInputs();
    fetchAndRender();
  });

  document.getElementById("end-date").addEventListener("change", function() {
    toggleTimeInputs();
    fetchAndRender();
  });

  // Thêm event listener cho việc thay đổi giờ
  document.getElementById("start-time").addEventListener("change", function() {
    if (!this.disabled) {
      fetchAndRender();
    }
  });

  document.getElementById("end-time").addEventListener("change", function() {
    if (!this.disabled) {
      fetchAndRender();
    }
  });

  document.getElementById("apply-btn").addEventListener("click", () => {
    startAutoUpdate();
    kiemTraVaGuiBaoCaoTuan(); // 👈 Thêm dòng này
  });

  // Hàm riêng để load thống kê 7 ngày vừa qua (không phụ thuộc vào filter)
  function loadWeeklySummary() {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 6);

    fetch(apiURL)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          console.warn("Dữ liệu API không phải là mảng:", data);
          updateWeeklySummary([]);
          return;
        }

        const filtered = data.filter(row => {
          const rawTime = row["Thời gian"];
          if (!rawTime || !rawTime.includes(" ")) return false;

          const [datePart] = rawTime.split(" ");
          const [d, m, y] = datePart.split("/").map(Number);
          
          // Kiểm tra tính hợp lệ của ngày tháng
          if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
          
          const time = new Date(y, m - 1, d);
          
          return time >= past && time <= now;
        });

        console.log(`Đã lọc được ${filtered.length} bản ghi cho thống kê tuần`);
        updateWeeklySummary(filtered);
      })
      .catch((err) => {
        console.error("Lỗi khi fetch dữ liệu thống kê tuần:", err);
        // Hiển thị giá trị mặc định khi có lỗi
        updateWeeklySummary([]);
      });
  }

  let autoUpdateInterval = null;
  function startAutoUpdate() {
    if (autoUpdateInterval) clearInterval(autoUpdateInterval);
    fetchAndRender();
    autoUpdateInterval = setInterval(fetchAndRender, 2000);
  }

  function toggleTimeInputs() {
    const startDateStr = document.getElementById("start-date").value;
    const endDateStr = document.getElementById("end-date").value;

    // Kiểm tra nếu chuỗi ngày trống
    if (!startDateStr || !endDateStr) {
      document.querySelectorAll(".time-picker").forEach(el => {
        el.disabled = true;
        el.style.opacity = "0.5";
      });
      return false;
    }

    const startParts = startDateStr.split("/");
    const endParts = endDateStr.split("/");
    
    // Kiểm tra định dạng ngày hợp lệ
    if (startParts.length !== 3 || endParts.length !== 3) {
      document.querySelectorAll(".time-picker").forEach(el => {
        el.disabled = true;
        el.style.opacity = "0.5";
      });
      return false;
    }

    const [m1, d1, y1] = startParts.map(Number);
    const [m2, d2, y2] = endParts.map(Number);

    // Kiểm tra số hợp lệ
    if (isNaN(m1) || isNaN(d1) || isNaN(y1) || isNaN(m2) || isNaN(d2) || isNaN(y2)) {
      document.querySelectorAll(".time-picker").forEach(el => {
        el.disabled = true;
        el.style.opacity = "0.5";
      });
      return false;
    }

    const sameDay = new Date(y1, m1 - 1, d1).getTime() === new Date(y2, m2 - 1, d2).getTime();

    document.querySelectorAll(".time-picker").forEach(el => {
      el.disabled = !sameDay;
      el.style.opacity = sameDay ? "1" : "0.5";
    });

    return sameDay;
  }

  function parseDateTime(dateStr, timeStr) {
    // Kiểm tra đầu vào
    if (!dateStr || !timeStr) {
      console.warn("parseDateTime: Thiếu dateStr hoặc timeStr");
      return null;
    }

    const dateParts = dateStr.split("/");
    if (dateParts.length !== 3) {
      console.warn("parseDateTime: Định dạng ngày không hợp lệ:", dateStr);
      return null;
    }

    const [m, d, y] = dateParts.map(Number);
    if (isNaN(m) || isNaN(d) || isNaN(y)) {
      console.warn("parseDateTime: Ngày không phải số:", dateStr);
      return null;
    }

    const timeParts = timeStr.split(":");
    if (timeParts.length < 2) {
      console.warn("parseDateTime: Định dạng giờ không hợp lệ:", timeStr);
      return null;
    }

    let [hh, mm, ss] = timeParts.map(Number);

    // Nếu không có giây thì gán = 0
    if (isNaN(ss)) ss = 0;
    if (isNaN(hh) || isNaN(mm)) {
      console.warn("parseDateTime: Giờ phút không phải số:", timeStr);
      return null;
    }

    try {
      return new Date(y, m - 1, d, hh, mm, ss);
    } catch (error) {
      console.warn("parseDateTime: Lỗi tạo Date object:", error);
      return null;
    }
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

  // Kiểm tra nếu không parse được ngày tháng
  if (!start || !end) {
    console.error("Không thể parse được ngày tháng từ input");
    return;
  }

  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) {
        console.warn("Dữ liệu API không phải là mảng:", data);
        return;
      }

      const filtered = data.filter(row => {
        const rawTime = row["Thời gian"];
        if (!rawTime || !rawTime.includes(" ")) return false;

        try {
          const [datePart, timePart] = rawTime.split(" ");
          const [d, m, y] = datePart.split("/").map(Number);
          const [hh, mm, ss] = timePart.split(":").map(Number);

          // Kiểm tra tính hợp lệ của các số
          if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(hh) || isNaN(mm)) return false;

          const time = new Date(y, m - 1, d, hh, mm, ss || 0);
          return time >= start && time <= end;
        } catch (error) {
          console.warn("Lỗi parse thời gian:", rawTime, error);
          return false;
        }
      });

      console.log(`Đã lọc được ${filtered.length} bản ghi từ ${data.length} bản ghi gốc`);

      const times = filtered.map((r) => {
        const [datePart, timePart] = r["Thời gian"].split(" ");
        return isSameDay ? timePart : r["Thời gian"];
      });

      const dienap = filtered.map((r) => parseFloat((r[label_dienap] || "0").replace(",", ".")));
      const dongdien = filtered.map((r) => parseFloat((r[label_dongdien] || "0").replace(",", ".")));
      const congsuat = filtered.map((r) => parseFloat((r[label_congsuat] || "0").replace(",", "."))); 

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
      fill: { type: "solid", opacity: 0.4, color },
      colors: [color],
      tooltip: {
        x: { format: isSameDay ? "HH:mm:ss" : "dd/MM/yyyy" },
        y: {
          formatter: (val) => `${val.toFixed(2)} ${label.includes("áp") ? "V" : label.includes("suất") ? "W" : "A"}`
        }
      },
      yaxis: {
        labels: {
          formatter: (val) => val.toFixed(2),
          style: { fontSize: "10px" },
        },
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
      fill: { type: "solid", opacity: 0.4, color },
      colors: [color],
      tooltip: {
        x: { format: isSameDay ? "HH:mm:ss" : "dd/MM/yyyy" },
        y: {
          formatter: (val) => `${val.toFixed(2)} ${label.includes("áp") ? "V" : label.includes("suất") ? "W" : "A"}`
        }
      },
      yaxis: {
        labels: {
          formatter: (val) => val.toFixed(2),
          style: { fontSize: "10px" },
        },
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
  startAutoUpdate();
  loadWeeklySummary(); // Load thống kê 7 ngày vừa qua ngay khi khởi động
  
  // Cập nhật thống kê tuần mỗi 30 phút
  setInterval(loadWeeklySummary, 30 * 60 * 1000);

  document.querySelectorAll(".chart").forEach(chartEl => {
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
function guiBaoCaoEmail(ngay, tongCongSuat, maxDay) {
  const templateParams = {
    title: "📊 Báo cáo tuần - Quản lý công suất tiêu thụ năng lượng",
    to_email: "votrunganh1311@gmail.com.com",
    message: `📊 Báo cáo tuần (${ngay}):\n\n` +
             `🔺 Ngày có mức tiêu thụ công suất cao nhất: ${maxDay}\n` +
             `⚡ Công suất cao nhất: ${tongCongSuat} W\n\n` +
             `📅 Thời gian báo cáo: ${new Date().toLocaleString('vi-VN')}\n` +
             `🏠 Hệ thống quản lý năng lượng`
  };

  emailjs.send("service_nzpo11o", "template_ijcvrxp", templateParams)
    .then((response) => {
      console.log("✅ Đã gửi báo cáo qua EmailJS!", response.status, response.text);
      alert("✅ Đã gửi báo cáo tuần qua email thành công!");
    })
    .catch((error) => {
      console.error("❌ Lỗi gửi email:", error);
      alert("❌ Lỗi khi gửi báo cáo qua email!");
    });
}

// Hàm gửi báo cáo thủ công (có thể gọi bất kỳ lúc nào)
function guiBaoCaoThuCong() {
  console.log("📧 Đang gửi báo cáo thủ công...");
  
  const apiURL = "https://opensheet.elk.sh/1agdJDtRKsAEDunMK8TD3E6hBpV87FV-I-0wQrqj2Ln8/Trang%20tính1";
  const now = new Date();

  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        alert("⚠️ Không có dữ liệu để tạo báo cáo!");
        return;
      }

      // Lọc dữ liệu 7 ngày vừa qua
      const past7Days = new Date();
      past7Days.setDate(now.getDate() - 6);

      const weekData = data.filter(row => {
        const rawTime = row["Thời gian"];
        if (!rawTime || !rawTime.includes(" ")) return false;

        const [datePart] = rawTime.split(" ");
        const [d, m, y] = datePart.split("/").map(Number);
        
        if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
        
        const time = new Date(y, m - 1, d);
        return time >= past7Days && time <= now;
      });

      if (weekData.length === 0) {
        alert("⚠️ Không có dữ liệu trong 7 ngày vừa qua để tạo báo cáo!");
        return;
      }

      // Tìm công suất cao nhất trong tuần
      let maxPower = -Infinity;
      let maxRow = null;

      weekData.forEach(row => {
        const power = parseFloat((row["Công suất tiêu thụ (W)"] || "0").replace(",", "."));
        if (!isNaN(power) && power > maxPower) {
          maxPower = power;
          maxRow = row;
        }
      });

      if (maxRow && maxPower > 0) {
        const maxDate = maxRow["Thời gian"].split(" ")[0];
        const reportDate = now.toLocaleDateString("vi-VN");
        
        guiBaoCaoEmail(reportDate, maxPower.toFixed(2), maxDate);
      } else {
        alert("⚠️ Không tìm thấy dữ liệu công suất hợp lệ trong tuần.");
      }
    })
    .catch((err) => {
      console.error("❌ Lỗi gọi API để tạo báo cáo thủ công:", err);
      alert("❌ Lỗi khi lấy dữ liệu để tạo báo cáo!");
    });
}

// Hàm xử lý lấy dữ liệu và gọi hàm gửi báo cáo tuần (chỉ vào chủ nhật)
function kiemTraVaGuiBaoCaoTuan() {
  const apiURL = "https://opensheet.elk.sh/1agdJDtRKsAEDunMK8TD3E6hBpV87FV-I-0wQrqj2Ln8/Trang%20tính1";
  const now = new Date();
  
  // Kiểm tra xem có phải chủ nhật không (0 = Chủ nhật)
  if (now.getDay() !== 0) {
    console.log("Hôm nay không phải chủ nhật, không gửi báo cáo.");
    return;
  }

  console.log("🗓️ Hôm nay là chủ nhật, đang chuẩn bị gửi báo cáo tuần...");

  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        console.warn("⚠️ Không có dữ liệu để tạo báo cáo!");
        alert("⚠️ Không có dữ liệu để tạo báo cáo tuần!");
        return;
      }

      // Lọc dữ liệu 7 ngày vừa qua
      const past7Days = new Date();
      past7Days.setDate(now.getDate() - 6);

      const weekData = data.filter(row => {
        const rawTime = row["Thời gian"];
        if (!rawTime || !rawTime.includes(" ")) return false;

        const [datePart] = rawTime.split(" ");
        const [d, m, y] = datePart.split("/").map(Number);
        
        if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
        
        const time = new Date(y, m - 1, d);
        return time >= past7Days && time <= now;
      });

      if (weekData.length === 0) {
        console.warn("⚠️ Không có dữ liệu trong 7 ngày vừa qua!");
        alert("⚠️ Không có dữ liệu trong 7 ngày vừa qua để tạo báo cáo!");
        return;
      }

      // Tìm công suất cao nhất trong tuần
      let maxPower = -Infinity;
      let maxRow = null;

      weekData.forEach(row => {
        const power = parseFloat((row["Công suất tiêu thụ (W)"] || "0").replace(",", "."));
        if (!isNaN(power) && power > maxPower) {
          maxPower = power;
          maxRow = row;
        }
      });

      if (maxRow && maxPower > 0) {
        const maxDate = maxRow["Thời gian"].split(" ")[0]; // Lấy phần ngày
        const reportDate = now.toLocaleDateString("vi-VN");
        
        console.log(`📊 Chuẩn bị gửi báo cáo: Ngày ${maxDate} - Công suất cao nhất: ${maxPower}W`);
        guiBaoCaoEmail(reportDate, maxPower.toFixed(2), maxDate);
      } else {
        console.warn("⚠️ Không tìm thấy công suất hợp lệ trong tuần.");
        alert("⚠️ Không tìm thấy dữ liệu công suất hợp lệ trong tuần.");
      }
    })
    .catch((err) => {
      console.error("❌ Lỗi gọi API để tạo báo cáo:", err);
      alert("❌ Lỗi khi lấy dữ liệu để tạo báo cáo tuần.");
    });
}

function updateSummary(data) {
  // Hàm này hiện tại không làm gì cả vì thống kê đã được tách riêng
  // Giữ lại để tương thích với code cũ
}

// Hàm riêng để cập nhật thống kê 7 ngày vừa qua
function updateWeeklySummary(data) {
  if (!data || data.length === 0) {
    // Nếu không có dữ liệu, hiển thị giá trị mặc định
    document.getElementById("tong-san-luong").textContent = "0.00";
    document.getElementById("tong-ngay").textContent = "7";
    document.getElementById("ngay-max").textContent = "--/--";
    document.getElementById("san-luong-max").textContent = "0.00";
    document.getElementById("ngay-min").textContent = "--/--";
    document.getElementById("san-luong-min").textContent = "0.00";
    return;
  }

  const label = "Công suất tiêu thụ (W)";
  
  // Nhóm dữ liệu theo ngày và tính tổng công suất mỗi ngày
  const dailyTotals = {};
  
  data.forEach(row => {
    const rawTime = row["Thời gian"];
    if (!rawTime || !rawTime.includes(" ")) return;
    
    const [datePart] = rawTime.split(" ");
    const value = parseFloat((row[label] || "0").replace(",", "."));
    if (isNaN(value)) return;
    
    if (!dailyTotals[datePart]) {
      dailyTotals[datePart] = 0;
    }
    dailyTotals[datePart] += value;
  });

  const dailyData = Object.entries(dailyTotals).map(([date, total]) => [date, total]);
  
  if (dailyData.length === 0) {
    // Nếu không có dữ liệu hợp lệ, hiển thị giá trị mặc định
    document.getElementById("tong-san-luong").textContent = "0.00";
    document.getElementById("tong-ngay").textContent = "7";
    document.getElementById("ngay-max").textContent = "--/--";
    document.getElementById("san-luong-max").textContent = "0.00";
    document.getElementById("ngay-min").textContent = "--/--";
    document.getElementById("san-luong-min").textContent = "0.00";
    return;
  }

  // Tính tổng của 7 ngày (chuyển từ W thành kWh, giả sử mỗi điểm dữ liệu đại diện cho 1 giờ)
  const totalKWh = dailyData.reduce((sum, item) => sum + item[1], 0) / 1000; // Chia 1000 để chuyển từ W thành kWh
  document.getElementById("tong-san-luong").textContent = totalKWh.toFixed(2);
  document.getElementById("tong-ngay").textContent = "7";

  // Tìm ngày có tiêu thụ cao nhất và thấp nhất
  const maxDay = dailyData.reduce((a, b) => (b[1] > a[1] ? b : a));
  
  // Lọc các ngày có tiêu thụ > 0 trước khi tìm min
  const validDays = dailyData.filter(x => x[1] > 0);
  
  if (validDays.length === 0) {
    // Nếu không có ngày nào có tiêu thụ > 0
    document.getElementById("ngay-min").textContent = "--/--";
    document.getElementById("san-luong-min").textContent = "0.00";
  } else {
    const minDay = validDays.reduce((a, b) => (b[1] < a[1] ? b : a));
    document.getElementById("ngay-min").textContent = formatDate(minDay[0]);
    document.getElementById("san-luong-min").textContent = (minDay[1] / 1000).toFixed(2); // Chuyển thành kWh
  }

  // Hiển thị kết quả cho max
  document.getElementById("ngay-max").textContent = formatDate(maxDay[0]);
  document.getElementById("san-luong-max").textContent = (maxDay[1] / 1000).toFixed(2); // Chuyển thành kWh
}

function formatDate(dateStr) {
  // dateStr có dạng "dd/mm/yyyy" từ dữ liệu API
  if (!dateStr || typeof dateStr !== 'string') return "--/--";
  
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "--/--";
  
  const [day, month, year] = parts;
  
  // Chỉ trả về ngày/tháng
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}`;
}





