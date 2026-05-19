# 📊 Sales Forecasting & Business Performance Dashboard

> **Analyze historical retail sales data, uncover business insights, and forecast the next 6 months of sales using time-series modeling.**

---

## 🎯 Project Overview

This project is a complete end-to-end **Sales Analytics & Forecasting** system built using the **Superstore Sales Dataset** (2014–2017). It covers data cleaning, exploratory data analysis, Excel reporting, time-series forecasting, and an interactive HTML dashboard — replacing Power BI with locally-generated dashboard images.

| Metric | Value |
|---|---|
| 📦 Total Records | 9,994 rows |
| 📅 Date Range | Jan 2014 – Dec 2017 |
| 💰 Total Revenue | $2,297,200.86 |
| 📈 Total Profit | $286,397.02 |
| 🧾 Profit Margin | 12.47% |
| 🛒 Distinct Orders | 5,009 |
| 🏆 Top Region | West ($725,457.82) |
| 🥇 Top Category | Technology ($836,154.03) |

---

## 🛠️ Technologies Used

| Tool | Purpose |
|---|---|
| **Python 3.11** | Data cleaning, EDA, forecasting |
| **pandas / numpy** | Data manipulation |
| **matplotlib / seaborn** | Static chart generation |
| **statsmodels (SARIMA)** | Time-series forecasting |
| **scikit-learn** | Supporting ML utilities |
| **openpyxl** | Excel workbook generation |
| **Jupyter Notebooks** | Interactive analysis |
| **Excel** | Pivot summaries, raw data, budget sheets |
| **HTML/CSS/SVG** | Dashboard pages (Power BI replacement) |

---

## 📁 Project Structure

```
Sales-Forecast-Dashboard/
│
├── 📂 data/                          # Datasets
│   ├── superstore_raw.csv            # Original raw Superstore dataset
│   ├── superstore_cleaned.csv        # Cleaned & feature-engineered dataset
│   ├── sales_forecast_6months.csv    # SARIMA 6-month forecast output
│   └── Superstore_Sales_Analysis.xlsx # Excel workbook with pivot summaries
│
├── 📂 notebooks/                     # Jupyter analysis notebooks
│   ├── 01_data_cleaning_eda.ipynb    # Phase 1 & 2: Data cleaning + EDA (8 charts)
│   └── 02_sales_forecasting.ipynb    # Phase 3: SARIMA time-series forecasting
│
├── 📂 outputs/                       # All generated visual outputs
│   ├── 01_monthly_sales_trend.png    # Monthly sales line chart (2014–2017)
│   ├── 02_region_wise_sales.png      # Region bar chart
│   ├── 03_category_sales_profit.png  # Category sales vs profit comparison
│   ├── 04_top10_products.png         # Top 10 products by revenue
│   ├── 05_discount_vs_profit.png     # Discount-profit scatter plot
│   ├── 06_yoy_sales_comparison.png   # Year-over-year monthly comparison
│   ├── 07_correlation_heatmap.png    # Correlation heatmap
│   ├── 08_segment_sales_pie.png      # Customer segment pie chart
│   ├── 09_raw_monthly_sales.png      # Raw monthly aggregated sales
│   ├── 10_acf_pacf.png               # Autocorrelation / Partial autocorrelation
│   ├── 11_model_diagnostics.png      # SARIMA model diagnostics
│   ├── 12_sales_forecast.png         # 6-month forecast with confidence bands
│   ├── 13_forecast_bar.png           # Forecast bar chart by month
│   ├── 14_actual_vs_fitted.png       # Actual vs fitted model comparison
│   │
│   └── 📂 dashboard_images/          # 📌 Dashboard (Power BI replacement)
│       ├── 01_executive_dashboard.png         # KPIs, monthly trend, region, category
│       ├── 01_executive_dashboard.html        # Interactive HTML version
│       ├── 02_product_region_dashboard.png    # Products, sub-categories, segments
│       ├── 02_product_region_dashboard.html
│       ├── 03_forecast_dashboard.png          # 6-month forecast view
│       ├── 03_forecast_dashboard.html
│       ├── 04_growth_profitability_dashboard.png  # YoY growth & profitability
│       ├── 04_growth_profitability_dashboard.html
│       └── dashboard_metrics.json             # Raw computed KPIs (JSON)
│
├── 📂 scripts/                       # Utility scripts
│   └── build_dashboard_images.js     # Node.js script that generates HTML dashboards
│
├── 📂 reports/                       # Project documentation
│   └── project_validation_summary.md # Data validation & requirement checklist
│
├── requirements.txt                  # Python dependencies
├── .gitignore                        # Git ignore rules
└── README.md                         # This file
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/Sales-Forecast-Dashboard.git
cd Sales-Forecast-Dashboard
```

### 2. Create a Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Notebooks

Launch Jupyter and open the notebooks in order:

```bash
jupyter notebook
```

| Notebook | Description |
|---|---|
| `notebooks/01_data_cleaning_eda.ipynb` | Cleans raw data, engineers features, produces 8 EDA charts |
| `notebooks/02_sales_forecasting.ipynb` | Builds SARIMA model, generates 6-month forecast |

---

## 📊 Dashboard (Power BI Replacement)

Since Power BI desktop deployment was not feasible, we generated **4 professional HTML dashboard pages** with embedded SVG charts and real computed KPIs from the dataset.

| Dashboard | Content |
|---|---|
| `01_executive_dashboard` | Total revenue, profit margin, orders, monthly trend, region performance, category split |
| `02_product_region_dashboard` | Top products table, sub-category sales, segment mix, category vs profit |
| `03_forecast_dashboard` | Jan–Jun 2018 forecast with confidence intervals, monthly breakdown table |
| `04_growth_profitability_dashboard` | Year-over-year growth chart, annual profit comparison, summary talking points |

To view dashboards, open any `.html` file from `outputs/dashboard_images/` in your browser.

---

## 📈 Key Business Insights

1. **Seasonality**: Sales consistently peak in **November–December** every year (festive / end-of-year effect).
2. **Discount Problem**: Discounts above **40%** reliably produce **negative profit** — a critical pricing issue.
3. **Technology** is the highest-revenue and highest-profit category.
4. **West region** leads in total revenue; **Central** has the lowest profit margin.
5. **Consumer segment** drives ~50.5% of all revenue.
6. **6-Month Forecast**: Total projected sales for Jan–Jun 2018 = **$351,751**. March 2018 is the strongest month at **$73,653**.

---

## 📋 Excel Workbook

`data/Superstore_Sales_Analysis.xlsx` contains the following sheets:

| Sheet | Description |
|---|---|
| **Summary** | High-level KPI summary with key metrics |
| **Raw Data** | Full cleaned dataset |
| **Monthly Summary** | Monthly aggregated sales & profit |
| **Region Summary** | Region-wise sales & profit pivot |
| **Category Summary** | Category-wise breakdown |
| **Budget vs Actual** | Comparison of budgeted vs actual performance |

---

## 📦 Dataset

**Source:** [Sample Superstore Dataset — Kaggle](https://www.kaggle.com/datasets/vivek468/superstore-dataset-final)

- **Industry:** US Retail (Office Supplies, Technology, Furniture)
- **Period:** January 2014 – December 2017
- **Rows:** 9,994 order line items
- **Key Columns:** Order ID, Order Date, Region, Category, Sub-Category, Product Name, Sales, Quantity, Discount, Profit

---

## 🤝 Author

**Sales Forecasting & Business Performance Dashboard**  
*A complete data analytics & forecasting project covering EDA, Excel reporting, time-series modeling, and business dashboard design.*
