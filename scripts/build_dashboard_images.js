const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const outDir = path.join(root, "outputs", "dashboard_images");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (quoted && next === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(value);
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += ch;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

const n = (value) => Number(value || 0);
const money = (value) =>
  "$" + Math.round(value).toLocaleString("en-US");
const money1 = (value) =>
  "$" + Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 });
const pct = (value) => (value * 100).toFixed(1) + "%";
const monthLabel = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

function group(rows, key, measures) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key] || "Unknown";
    if (!map.has(k)) map.set(k, { name: k, count: 0 });
    const item = map.get(k);
    item.count++;
    for (const [name, col] of Object.entries(measures)) {
      item[name] = (item[name] || 0) + n(row[col]);
    }
  }
  return [...map.values()];
}

function svgLine(points, width, height, pad = 28) {
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.value);
  const min = Math.min(...ys) * 0.92;
  const max = Math.max(...ys) * 1.05;
  const x = (i) => pad + (i / Math.max(1, xs.length - 1)) * (width - pad * 2);
  const y = (v) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const circles = points
    .filter((_, i) => i % Math.ceil(points.length / 10) === 0 || i === points.length - 1)
    .map((p, i) => {
      const actualIndex = points.indexOf(p);
      return `<circle cx="${x(actualIndex).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5" />`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="axis"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" class="axis"/>
    <path d="${d}" class="line-main"/>
    ${circles}
  </svg>`;
}

function svgBars(items, width, height, color = "#2f7dd3") {
  const max = Math.max(...items.map((x) => x.value), 1);
  const barH = (height - 26) / items.length;
  return `<svg viewBox="0 0 ${width} ${height}" class="chart-svg bars">
    ${items
      .map((item, i) => {
        const w = ((width - 180) * item.value) / max;
        const y = 14 + i * barH;
        return `<text x="4" y="${y + barH * 0.6}" class="bar-label">${escapeHtml(item.name)}</text>
          <rect x="125" y="${y}" width="${w.toFixed(1)}" height="${Math.max(11, barH * 0.55).toFixed(1)}" rx="5" fill="${color}"/>
          <text x="${132 + w}" y="${y + barH * 0.55}" class="bar-value">${item.label}</text>`;
      })
      .join("")}
  </svg>`;
}

function svgDonut(items, size) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const colors = ["#2f7dd3", "#15a085", "#f39c12", "#d94f45", "#7b61ff"];
  let start = -90;
  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const arcs = items
    .map((item, i) => {
      const angle = (item.value / total) * 360;
      const end = start + angle;
      const large = angle > 180 ? 1 : 0;
      const a = polar(cx, cy, r, start);
      const b = polar(cx, cy, r, end);
      const d = `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
      start = end;
      return `<path d="${d}" stroke="${colors[i % colors.length]}" stroke-width="26" fill="none" stroke-linecap="round"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" class="donut">${arcs}<circle cx="${cx}" cy="${cy}" r="${r - 21}" fill="#fff"/></svg>`;
}

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: (cx + r * Math.cos(rad)).toFixed(2), y: (cy + r * Math.sin(rad)).toFixed(2) };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function card(title, value, sub = "") {
  return `<div class="kpi"><div class="kpi-title">${title}</div><div class="kpi-value">${value}</div><div class="kpi-sub">${sub}</div></div>`;
}

function table(rows, cols) {
  return `<table><thead><tr>${cols.map((c) => `<th>${c.title}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td>${c.format ? c.format(r[c.key], r) : escapeHtml(r[c.key])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

const sales = parseCsv(fs.readFileSync(path.join(dataDir, "superstore_cleaned.csv"), "utf8"));
const forecast = parseCsv(fs.readFileSync(path.join(dataDir, "sales_forecast_6months.csv"), "utf8"));

const totalSales = sales.reduce((a, r) => a + n(r.Sales), 0);
const totalProfit = sales.reduce((a, r) => a + n(r.Profit), 0);
const totalOrders = new Set(sales.map((r) => r["Order ID"])).size;
const totalQty = sales.reduce((a, r) => a + n(r.Quantity), 0);
const avgDiscount = sales.reduce((a, r) => a + n(r.Discount), 0) / sales.length;
const profitMargin = totalProfit / totalSales;

const region = group(sales, "Region", { sales: "Sales", profit: "Profit" }).sort((a, b) => b.sales - a.sales);
const category = group(sales, "Category", { sales: "Sales", profit: "Profit" }).sort((a, b) => b.sales - a.sales);
const segment = group(sales, "Segment", { sales: "Sales", profit: "Profit" }).sort((a, b) => b.sales - a.sales);
const subcat = group(sales, "Sub-Category", { sales: "Sales", profit: "Profit" }).sort((a, b) => b.sales - a.sales);

const productMap = new Map();
for (const r of sales) {
  const key = r["Product Name"];
  if (!productMap.has(key)) productMap.set(key, { name: key, sales: 0, profit: 0 });
  const p = productMap.get(key);
  p.sales += n(r.Sales);
  p.profit += n(r.Profit);
}
const products = [...productMap.values()].sort((a, b) => b.sales - a.sales).slice(0, 8);

const monthlyMap = new Map();
for (const r of sales) {
  const key = r.YearMonth;
  if (!monthlyMap.has(key)) monthlyMap.set(key, { name: key, sales: 0, profit: 0 });
  monthlyMap.get(key).sales += n(r.Sales);
  monthlyMap.get(key).profit += n(r.Profit);
}
const monthly = [...monthlyMap.values()].sort((a, b) => a.name.localeCompare(b.name));
const yearly = group(sales, "Year", { sales: "Sales", profit: "Profit" }).sort((a, b) => a.name.localeCompare(b.name));

const forecastRows = forecast.map((r) => ({
  month: r.Month,
  label: monthLabel(r.Month),
  forecast: n(r.Forecast_Sales),
  lower: n(r.Lower_95),
  upper: n(r.Upper_95),
}));
const forecastTotal = forecastRows.reduce((a, r) => a + r.forecast, 0);
const peakForecast = Math.max(...forecastRows.map((r) => r.upper));
const janForecast = forecastRows[0].forecast;

const insights = [
  `West is the top region with ${money(region[0].sales)} in sales.`,
  `Technology leads categories with ${money(category[0].sales)} revenue.`,
  `Overall profit margin is ${pct(profitMargin)}, driven by ${money(totalProfit)} profit.`,
  `Next 6-month forecast totals ${money(forecastTotal)} with March 2018 as the strongest forecast month.`,
];

const css = `
*{box-sizing:border-box} body{margin:0;background:#dfe7ef;font-family:"Segoe UI",Arial,sans-serif;color:#16202a}
.page{width:1600px;height:1050px;background:#eef3f8;padding:26px 30px 32px;position:relative;overflow:hidden}
.top{height:86px;background:linear-gradient(90deg,#132c46,#1d6fa8);border-radius:14px;padding:18px 28px;color:#fff;display:flex;align-items:center;justify-content:space-between;box-shadow:0 14px 28px #15324d22}
.brand h1{font-size:31px;margin:0 0 5px;font-weight:720;letter-spacing:0}.brand p{font-size:15px;margin:0;color:#cde7f6}
.badge{background:#ffffff20;border:1px solid #ffffff30;border-radius:999px;padding:11px 16px;font-weight:650}
.grid{display:grid;gap:18px;margin-top:18px}.kpis{grid-template-columns:repeat(6,1fr)}
.kpi,.panel{background:#fff;border:1px solid #dce7f0;border-radius:14px;box-shadow:0 12px 24px #16344d16}.kpi{height:118px;padding:18px 18px 14px}
.kpi-title{color:#6d7f8e;font-size:14px;font-weight:700;text-transform:uppercase}.kpi-value{font-size:34px;font-weight:760;margin-top:10px;color:#17212c}.kpi-sub{font-size:13px;color:#8090a0;margin-top:5px}
.layout-2{grid-template-columns:1.45fr 1fr}.layout-3{grid-template-columns:1fr 1fr 1fr}.panel{padding:20px;min-height:250px}
.panel h2{font-size:20px;margin:0 0 14px;color:#16324b}.panel .note{font-size:13px;color:#708091;margin-top:-8px;margin-bottom:10px}
.chart-svg{width:100%;height:100%}.axis{stroke:#c8d6e1;stroke-width:1}.line-main{fill:none;stroke:#2f7dd3;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}.chart-svg circle{fill:#fff;stroke:#2f7dd3;stroke-width:3}
.bar-label{font-size:16px;fill:#34495e;font-weight:650}.bar-value{font-size:14px;fill:#718192}.donut{width:220px;height:220px}
.legend{display:grid;gap:10px;align-content:center}.legend-row{display:flex;align-items:center;justify-content:space-between;font-size:16px}.dot{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:8px}
table{width:100%;border-collapse:collapse;font-size:15px}th{text-align:left;color:#657789;font-size:13px;text-transform:uppercase;border-bottom:1px solid #dce7f0;padding:10px 8px}td{padding:10px 8px;border-bottom:1px solid #edf2f6}td:last-child,th:last-child{text-align:right}
.insight{display:grid;gap:12px}.insight div{background:#f4f8fb;border-left:5px solid #2f7dd3;border-radius:8px;padding:13px 14px;font-size:16px;line-height:1.38}
.split{display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:center}.footer{position:absolute;bottom:10px;right:30px;color:#7b8b9b;font-size:12px}
`;

function page(title, subtitle, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><main class="page">
    <section class="top"><div class="brand"><h1>${title}</h1><p>${subtitle}</p></div><div class="badge">Superstore Sales | 2014-2017</div></section>
    ${body}
    <div class="footer">Generated from data/superstore_cleaned.csv and data/sales_forecast_6months.csv</div>
  </main></body></html>`;
}

const page1 = page(
  "Sales Forecasting & Business Performance Dashboard",
  "Executive view of revenue, profit, orders, regions, categories, and forecast readiness",
  `<section class="grid kpis">
    ${card("Total Revenue", money(totalSales), "All sales")}
    ${card("Total Profit", money(totalProfit), "Net profit")}
    ${card("Profit Margin", pct(profitMargin), "Profit / revenue")}
    ${card("Orders", totalOrders.toLocaleString("en-US"), "Distinct orders")}
    ${card("Units Sold", totalQty.toLocaleString("en-US"), "Quantity")}
    ${card("Avg Discount", pct(avgDiscount), "Across rows")}
  </section>
  <section class="grid layout-2">
    <div class="panel"><h2>Monthly Sales Trend</h2><div style="height:290px">${svgLine(monthly.map((m) => ({ value: m.sales })), 920, 290)}</div></div>
    <div class="panel"><h2>Region Performance</h2><div style="height:290px">${svgBars(region.map((r) => ({ name: r.name, value: r.sales, label: money(r.sales) })), 570, 290)}</div></div>
  </section>
  <section class="grid layout-2">
    <div class="panel"><h2>Sales by Category</h2><div class="split">${svgDonut(category.map((c) => ({ name: c.name, value: c.sales })), 240)}
      <div class="legend">${category
        .map((c, i) => `<div class="legend-row"><span><span class="dot" style="background:${["#2f7dd3", "#15a085", "#f39c12"][i]}"></span>${c.name}</span><strong>${money(c.sales)}</strong></div>`)
        .join("")}</div></div></div>
    <div class="panel"><h2>Business Insights</h2><div class="insight">${insights.map((x) => `<div>${x}</div>`).join("")}</div></div>
  </section>`
);

const page2 = page(
  "Product, Region & Segment Performance",
  "Operational view for identifying where sales and profit are concentrated",
  `<section class="grid layout-2">
    <div class="panel"><h2>Top Products by Sales</h2>${table(products, [
      { title: "Product", key: "name" },
      { title: "Sales", key: "sales", format: money },
      { title: "Profit", key: "profit", format: money },
    ])}</div>
    <div class="panel"><h2>Sub-Category Sales</h2><div style="height:390px">${svgBars(subcat.slice(0, 10).map((s) => ({ name: s.name, value: s.sales, label: money(s.sales) })), 600, 390, "#15a085")}</div></div>
  </section>
  <section class="grid layout-3">
    <div class="panel"><h2>Segment Mix</h2><div class="split" style="grid-template-columns:220px 1fr">${svgDonut(segment.map((s) => ({ name: s.name, value: s.sales })), 220)}
      <div class="legend">${segment.map((s, i) => `<div class="legend-row"><span><span class="dot" style="background:${["#2f7dd3", "#15a085", "#f39c12"][i]}"></span>${s.name}</span><strong>${money(s.sales)}</strong></div>`).join("")}</div></div></div>
    <div class="panel"><h2>Category Sales vs Profit</h2>${table(category, [
      { title: "Category", key: "name" },
      { title: "Sales", key: "sales", format: money },
      { title: "Profit", key: "profit", format: money },
    ])}</div>
    <div class="panel"><h2>Region Sales vs Profit</h2>${table(region, [
      { title: "Region", key: "name" },
      { title: "Sales", key: "sales", format: money },
      { title: "Profit", key: "profit", format: money },
    ])}</div>
  </section>`
);

const page3 = page(
  "Six-Month Sales Forecast",
  "Forecast for January 2018 through June 2018 with 95% confidence ranges",
  `<section class="grid kpis" style="grid-template-columns:repeat(4,1fr)">
    ${card("Forecast Total", money(forecastTotal), "Jan-Jun 2018")}
    ${card("Jan Forecast", money(janForecast), "First forecast month")}
    ${card("Peak Upper 95%", money(peakForecast), "Highest confidence bound")}
    ${card("Avg Monthly Forecast", money(forecastTotal / forecastRows.length), "Forecast mean")}
  </section>
  <section class="grid layout-2">
    <div class="panel"><h2>Forecast Sales Trend</h2><div style="height:330px">${svgLine(forecastRows.map((r) => ({ value: r.forecast })), 920, 330)}</div></div>
    <div class="panel"><h2>Forecast by Month</h2><div style="height:330px">${svgBars(forecastRows.map((r) => ({ name: r.label, value: r.forecast, label: money(r.forecast) })), 570, 330, "#f39c12")}</div></div>
  </section>
  <section class="grid layout-2">
    <div class="panel"><h2>Forecast Table</h2>${table(forecastRows, [
      { title: "Month", key: "label" },
      { title: "Forecast", key: "forecast", format: money1 },
      { title: "Lower 95", key: "lower", format: money1 },
      { title: "Upper 95", key: "upper", format: money1 },
    ])}</div>
    <div class="panel"><h2>Forecast Reading</h2><div class="insight">
      <div>The forecast remains positive for all six months, with no invalid confidence intervals.</div>
      <div>March 2018 has the highest expected sales at ${money(forecastRows[2].forecast)}.</div>
      <div>The widest confidence band is normal for future-period uncertainty and should be explained in presentation.</div>
    </div></div>
  </section>`
);

const page4 = page(
  "Annual Growth & Profitability",
  "Year-over-year view for presentation and business interpretation",
  `<section class="grid layout-2">
    <div class="panel"><h2>Yearly Sales</h2><div style="height:360px">${svgBars(yearly.map((y) => ({ name: y.name, value: y.sales, label: money(y.sales) })), 900, 360, "#2f7dd3")}</div></div>
    <div class="panel"><h2>Yearly Profit</h2><div style="height:360px">${svgBars(yearly.map((y) => ({ name: y.name, value: y.profit, label: money(y.profit) })), 570, 360, "#15a085")}</div></div>
  </section>
  <section class="grid layout-2">
    <div class="panel"><h2>Performance Summary</h2>${table(yearly, [
      { title: "Year", key: "name" },
      { title: "Sales", key: "sales", format: money },
      { title: "Profit", key: "profit", format: money },
      { title: "Margin", key: "profit", format: (_, r) => pct(r.profit / r.sales) },
    ])}</div>
    <div class="panel"><h2>Submission Talking Points</h2><div class="insight">
      <div>Retail sales grew across the 2014-2017 history, giving enough monthly history for a forecast.</div>
      <div>West and East are the strongest revenue regions; South is the smallest but still profitable.</div>
      <div>Technology is the biggest category and a strong point for business recommendations.</div>
      <div>The dashboard covers EDA, KPIs, regional performance, product analysis, and a future forecast.</div>
    </div></div>
  </section>`
);

fs.mkdirSync(outDir, { recursive: true });
const pages = [
  ["01_executive_dashboard.html", page1],
  ["02_product_region_dashboard.html", page2],
  ["03_forecast_dashboard.html", page3],
  ["04_growth_profitability_dashboard.html", page4],
];
for (const [name, html] of pages) {
  fs.writeFileSync(path.join(outDir, name), html, "utf8");
}
fs.writeFileSync(
  path.join(outDir, "dashboard_metrics.json"),
  JSON.stringify(
    { totalSales, totalProfit, profitMargin, totalOrders, totalQty, avgDiscount, region, category, segment, forecastRows, forecastTotal },
    null,
    2
  )
);

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
if (fs.existsSync(edge)) {
  for (const [name] of pages) {
    const htmlPath = path.join(outDir, name);
    const pngPath = htmlPath.replace(/\.html$/, ".png");
    execFileSync(edge, [
      "--headless=new",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--hide-scrollbars",
      "--window-size=1600,1050",
      `--screenshot=${pngPath}`,
      `file:///${htmlPath.replaceAll("\\", "/")}`,
    ]);
  }
}

console.log(JSON.stringify({ outDir, pages: pages.map(([name]) => name.replace(".html", ".png")) }, null, 2));
