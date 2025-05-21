const arrow_down = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-360 280-560h400L480-360Z"/></svg>`;
const arrow_up = `<svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#FFFFFF"><path d="m280-400 200-201 200 201H280Z"/></svg>`;
const nor = `<svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#FFFFFF"><path d="M130-450q-20.83 0-35.42-14.62Q80-479.24 80-500.12 80-521 94.58-535.5 109.17-550 130-550h260q20.83 0 35.42 14.62Q440-520.76 440-499.88q0 20.88-14.58 35.38Q410.83-450 390-450H130Zm440 0q-20.83 0-35.42-14.62Q520-479.24 520-500.12q0-20.88 14.58-35.38Q549.17-550 570-550h260q20.83 0 35.42 14.62Q880-520.76 880-499.88q0 20.88-14.58 35.38Q850.83-450 830-450H570Z"/></svg>`;

const apiURL = 'https://opensheet.elk.sh/1CtXwFm9JJZJ8UbVJLZqWCQKLj1TR2sttuCIAfgCiZfw/Trang%20t%C3%ADnh1';

let totalPowerConsumption = 0;

function fetchAndRender(chartId, infoCardId, dataKey, unit, totalCallback) {
  fetch(apiURL)
    .then(response => response.json())
    .then(data => {
      // Chuyển chuỗi số có dấu phẩy sang số thực
      const values = data.map(item => Number(item[dataKey].replace(',', '.')));
      const times = data.map(item => item["Thời gian"]);

      // Vẽ biểu đồ
      const options = {
        chart: {
          type: 'line',
          height: '90%',
          width: '80%',
          toolbar: { show: false }
        },
        responsive: [{
          breakpoint: 600,
          options: {
            chart: {
              height: 200  // giảm chiều cao khi nhỏ hơn 600px
            }
          }
        }
      ]
        ,
        series: [{
          name: dataKey,
          data: values
        }],
        xaxis: {
          categories: times,
          labels: {
            rotate: -45,
            trim: true,
            hideOverlappingLabels: true
          }
        },
        stroke: {
        curve: 'smooth',
        width: 4,               // nét dày hơn (mặc định 3)
        colors: ['#007bff']     // màu xanh đậm hơn, bạn có thể đổi
        },

        fill: {
        type: 'solid',
        opacity: 0.4,
        color: '#007bff'
        },
        colors: ['#008FFB'],
        tooltip: {
          x: {
            format: 'dd/MM/yyyy HH:mm'
          }
        }
      };

      new ApexCharts(document.querySelector(chartId), options).render();

      // So sánh số liệu cuối với số trước đó để hiển thị icon
      const len = values.length;
      const lastValue = values[len - 1];
      const prevValue = values[len - 2];
      let icon = nor;
      if (lastValue > prevValue) icon = arrow_up;
      else if (lastValue < prevValue) icon = arrow_down;

      // Hiển thị icon và giá trị cuối cùng
document.querySelector(infoCardId).innerHTML = `
  <div>
    <span style="font-size: 24px;">${icon}</span>
    <h3 style="margin: 0;">${lastValue} ${unit}</h3>
  </div>
`;



      // Nếu có callback tính tổng thì gọi
      if (totalCallback) totalCallback(values);
    })
    .catch(err => {
      console.error('Lỗi khi lấy dữ liệu API:', err);
    });
}

// Hàm tính tổng công suất tiêu thụ
function addToTotal(values) {
  totalPowerConsumption = values.reduce((a, b) => a + b, 0);
  document.querySelector("#info3").innerHTML = `
    <h3 style="font-size: 14px; color: #fff;">Tổng công suất tiêu thụ</h3>
    <h3 style="color: #fff;">${totalPowerConsumption.toFixed(2)} W</h3>
  `;
}

// Gọi API và vẽ các chart
fetchAndRender("#chart1", "#info1", "Điện áp (V)", "V");
fetchAndRender("#chart2", "#info2", "Dòng điện (A)", "A");
fetchAndRender("#chart3", "#info4", "Công suất tiêu thụ (W)", "W", addToTotal);

