/**
 * charts.js — renders the Revenue-per-site bar chart and the
 * Records-per-user doughnut chart, themed to match the app's dark palette.
 */
const ChartTheme = {
  text: '#8A97A8',
  grid: 'rgba(255,255,255,0.06)',
  palette: ['#21E0B0', '#8B7FFF', '#F5B942', '#FF6B6B', '#4CC9F0', '#B892FF', '#5FE0A5', '#F58EB0']
};

let revenueChartInstance = null;
let userChartInstance = null;

function aggregateRevenueBySite(records) {
  const map = new Map();
  records.forEach(r => {
    const key = r.site_name || 'unknown';
    map.set(key, (map.get(key) || 0) + Number(r.revenue || 0));
  });
  // top 8 by revenue, keep chart readable
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

function aggregateCountByUser(records) {
  const map = new Map();
  records.forEach(r => {
    const key = r.user || 'unknown';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function renderRevenueChart(records) {
  const ctx = document.getElementById('revenue-chart');
  const data = aggregateRevenueBySite(records);

  if (revenueChartInstance) revenueChartInstance.destroy();

  if (!data.length) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  revenueChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d[0]),
      datasets: [{
        label: 'Revenue',
        data: data.map(d => d[1]),
        backgroundColor: ChartTheme.palette[0],
        borderRadius: 6,
        maxBarThickness: 38
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => ` $${item.raw.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
          }
        }
      },
      scales: {
        x: { ticks: { color: ChartTheme.text, font: { family: 'Inter', size: 11 } }, grid: { display: false } },
        y: {
          ticks: {
            color: ChartTheme.text,
            font: { family: 'JetBrains Mono', size: 10 },
            callback: (v) => '$' + v.toLocaleString('en-US')
          },
          grid: { color: ChartTheme.grid }
        }
      }
    }
  });
}

function renderUserChart(records) {
  const ctx = document.getElementById('user-chart');
  const data = aggregateCountByUser(records);

  if (userChartInstance) userChartInstance.destroy();

  if (!data.length) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  userChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d[0]),
      datasets: [{
        data: data.map(d => d[1]),
        backgroundColor: ChartTheme.palette,
        borderColor: '#131A23',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: ChartTheme.text, font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 12 }
        }
      }
    }
  });
}

function renderCharts(records) {
  renderRevenueChart(records);
  renderUserChart(records);
}
