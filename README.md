# 🚀 AI-Based Software Bug Prediction & Code Quality Intelligence Platform

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Scikit--Learn-1.4+-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-Learn" />
  <img src="https://img.shields.io/badge/Dataset-NASA_MDP_JM1-0B3D91?style=for-the-badge&logo=nasa&logoColor=white" alt="NASA MDP JM1" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

An enterprise-grade, full-stack software defect prediction platform that combines **automated Abstract Syntax Tree (AST) static code analysis** across **Java, Python, C++, and C** with **machine learning classifiers trained on real NASA flight control software (NASA MDP JM1)**.

The platform extracts 8+ structural and complexity metrics in real-time, estimates McCabe cyclomatic complexity, predicts defect risk scores ($0-100\%$), classifies code into binary defect status (**Defective** vs. **Clean**), provides explainable AI factor attribution, and generates prioritized engineering refactoring recommendations with instant PDF export.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Machine Learning Benchmark (NASA MDP JM1)](#-machine-learning-benchmark-nasa-mdp-jm1)
  - [Dataset Specifications](#dataset-specifications)
  - [21 Extracted Software Metrics](#21-extracted-software-metrics)
  - [Preprocessing Pipeline](#preprocessing-pipeline)
  - [Empirical Test-Set Comparison](#empirical-test-set-comparison)
  - [Champion Model Selection](#champion-model-selection)
- [Source Code Static Analysis Engine](#-source-code-static-analysis-engine)
- [UI/UX & Interactive Modules](#-uiux--interactive-modules)
- [REST API Endpoints](#-rest-api-endpoints)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Quickstart Guide](#-quickstart-guide)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup-fastapi)
  - [2. Frontend Setup](#2-frontend-setup-react--vite)
  - [3. Running One-Click Launchers](#3-running-one-click-launchers-windows)
- [Limitations & Future Roadmap](#-limitations--future-roadmap)
- [Author & License](#-author--license)

---

## 🌟 Key Features

- 🧠 **NASA MDP JM1 Machine Learning Engine**: Calibrated Random Forest model trained on 8,912 unique real-world flight software modules with zero synthetic fabrication.
- ⚡ **Multi-Language Source Code Upload**: Drag-and-drop or paste code in **Java (.java)**, **Python (.py)**, **C++ (.cpp)**, and **C (.c)** with automated tokenization and parsing.
- 🔬 **8+ Structural Static Metrics**: Lines of Code (LOC), Executable Code Lines, Comments Count, Comment-to-Code Ratio, Functions/Methods, Classes, If Statements, Loops (for, while, do-while), and Switch Statements.
- 📐 **McCabe Cyclomatic Complexity $v(G)$**: Accurately computes independent execution decision paths and branches.
- 🎯 **Circular Defect Gauge & Risk Badges**: Visual risk indicator ($0-100\%$) categorized into **Low Risk (<35%)**, **Medium Risk (35-70%)**, and **High Risk (>70%)** alongside binary classification (**ML Defect Predicted** vs. **Clean / Non-Defective**).
- 🔍 **Explainable AI (XAI) Attribution**: Quantifies exact percentage contributions and causal rationales for each software metric.
- 🛠️ **Actionable Engineering Recommendations**: Auto-generates prioritized guidelines across *Refactoring*, *Testing*, *Architecture*, *Documentation*, and *CI/CD*.
- 📑 **Comprehensive PDF Export**: Client-side (jsPDF + autoTable) and server-side (FastAPI + ReportLab) executive PDF report generators.
- 🗄️ **Full CRUD Module Registry & Audit History**: Search, filter, update, and manage codebase modules with persistent SQLite database storage.
- 🌓 **Modern SaaS Glassmorphism UI**: High-contrast Dark & Light mode support, collapsible sidebar, responsive layout, and interactive Recharts visualizations.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 19 + Vite Frontend                        │
│   • Modern Glassmorphism Dashboard (Recharts Donut, Bar & Stacked)     │
│   • Source Code Drag-and-Drop Uploader (.java, .py, .cpp, .c)          │
│   • Circular Risk Gauge & NASA JM1 ML Prediction Badges                │
│   • Module Management Registry (CRUD) & Searchable History Log         │
│   • Instant Client & Server PDF Report Generation (jsPDF / autoTable)  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ HTTP / REST API (Axios Client)
┌───────────────────────────────────▼────────────────────────────────────┐
│                         FastAPI Backend Engine                         │
│   • /api/predictions/predict      -> ML Inference & Risk Scoring       │
│   • /api/predictions/ml-info     -> Dataset & Model Benchmark Specs   │
│   • /api/analysis/upload          -> Multi-Language AST Metric Parser  │
│   • /api/stats/dashboard          -> Codebase KPIs & Model Comparison  │
│   • /api/reports/pdf              -> Server-Side ReportLab PDF Builder │
│   • SQLite Database Engine with SQLAlchemy ORM & Pydantic v2 Schemas   │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Scikit-Learn ML Inference Core                      │
│   • Champion Model: best_defect_model.joblib (Random Forest Classifier)│
│   • Feature Normalizer: scaler.joblib (StandardScaler)                 │
│   • Metadata Benchmark: model_metadata.json (Empirical Test Metrics)   │
│   • Explainable AI Metric Attribution & Heuristic Recommendation Engine│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Machine Learning Benchmark (NASA MDP JM1)

### Dataset Specifications
The predictive engine is trained on the benchmark **NASA MDP JM1** software defect dataset, curated by the **NASA Metrics Data Program (MDP)** and hosted on OpenML (ID: 1053) and the PROMISE Software Engineering Repository.

| Attribute | Specification |
| :--- | :--- |
| **Dataset Name** | NASA MDP JM1 Software Defect Dataset |
| **Origin / Source** | NASA Metrics Data Program / OpenML ID: 1053 |
| **Application Domain** | Mission-critical real-time flight system software (C/C++) |
| **Raw Records** | 10,885 |
| **Duplicate Records Pruned** | 1,973 duplicate rows identified and removed |
| **Unique Records Used** | **8,912 unique instances** |
| **Target Label** | `defects` (`True` = Defective module, `False` = Clean / Non-Defective) |
| **Clean Modules Count** | 6,905 instances (77.48%) |
| **Defective Modules Count** | 2,007 instances (22.52%) |
| **Defect Class Imbalance Ratio**| 1 : 3.44 (22.52% Defective) |

### 21 Extracted Software Metrics
The model consumes 21 numerical features spanning McCabe complexity, Halstead software science attributes, and structural counts:

```
1.  loc                 : Lines of Code (McCabe)
2.  v(g)                : McCabe Cyclomatic Complexity
3.  ev(g)               : McCabe Essential Complexity
4.  iv(g)               : McCabe Design Complexity
5.  n                   : Halstead Total Operators + Operands
6.  v                   : Halstead Volume
7.  l                   : Halstead Program Length
8.  d                   : Halstead Difficulty
9.  i                   : Halstead Intelligence
10. e                   : Halstead Effort
11. b                   : Halstead B-Metric
12. t                   : Halstead Time Estimator
13. lOCode              : Lines of Executable Code
14. lOComment           : Lines of Comments
15. lOBlank             : Blank Lines Count
16. locCodeAndComment   : Lines with both Code and Comments
17. uniq_Op             : Unique Operators Count
18. uniq_Opnd           : Unique Operands Count
19. total_Op            : Total Operators Count
20. total_Opnd          : Total Operands Count
21. branchCount         : Total Decision Branches
```

### Preprocessing Pipeline
1. **Duplicate Pruning**: 1,973 duplicate records were dropped to prevent data leakage and artificially inflated accuracy.
2. **Missing-Value Imputation**: 5 features contained 25 total missing values (`uniq_Op`, `uniq_Opnd`, `total_Op`, `total_Opnd`, `branchCount`). Median imputation was fitted strictly on the training partition.
3. **Stratified Split**: An 80/20 stratified train/test split preserved the natural 22.52% defect ratio:
   - **Training Partition**: 7,129 samples (5,524 clean, 1,605 defective)
   - **Testing Partition**: 1,783 unseen samples (1,381 clean, 402 defective)
4. **Standardization**: Features normalized via `StandardScaler` ($\mu = 0, \sigma = 1$), persisted in `backend/saved_models/scaler.joblib`.
5. **Class Imbalance Mitigation**: `class_weight='balanced'` was applied to penalize false-negatives and prevent majority-class bias.

### Empirical Test-Set Comparison
All models were benchmarked on the identical unseen test split (**1,783 software modules**). Zero metrics were fabricated:

| Model Classifier | Accuracy | Precision | Recall (Catch Rate) | F1-Score | Confusion Matrix `[TN, FP, FN, TP]` | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** (L2 Balanced) | 71.34% | 39.08% | 48.51% | 0.4329 | `[1077, 304, 207, 195]` | Baseline |
| **Decision Tree** (CART Balanced) | 66.35% | 35.82% | **62.19%** | **0.4545** | `[933, 448, 152, 250]` | Baseline |
| **Random Forest** (100 Trees Balanced) | **72.69%** | **41.27%** | 50.00% | 0.4522 | `[1095, 286, 201, 201]` | 🏆 **Selected Champion** |

### Champion Model Selection
**Random Forest** was selected as the champion model for the following reasons:
- **Highest Test Accuracy (72.69%)**: Demonstrates superior generalization across unseen software modules.
- **36.2% Reduction in False Alarms**: Decreased false positives from 448 (Decision Tree) down to 286, achieving the highest precision (**41.27%**).
- **Balanced Catch Rate (50.00%)**: Successfully detects half of all defects in an imbalanced 22.5% defect environment while preserving overall system stability.

---

## 💻 Source Code Static Analysis Engine

The system supports automated AST inspection for 4 major software engineering languages:

| Language | Extension | AST Parser / Analysis Mechanics |
| :--- | :---: | :--- |
| **Python** | `.py` | Native Python `ast` module parsing AST nodes: `FunctionDef`, `AsyncFunctionDef`, `ClassDef`, `If`, `For`, `While`, `Try`, boolean operators (`And`, `Or`), and list/dict comprehensions. |
| **Java** | `.java` | Tokenizer filtering string and char literals; regex-based AST extraction for classes, interfaces, constructors, methods, control loops, switches, catches, ternary ops, and comments. |
| **C++** | `.cpp` | Lexical parser extracting classes, structs, member functions, pointer/reference signatures, nested conditionals, loops, switch statements, and block comments. |
| **C** | `.c` | Static analyzer extracting struct declarations, global/local functions, decision branches, bitwise operations, and preprocessor comments. |

---

## 🖥️ UI/UX & Interactive Modules

1. **Enterprise Dashboard**:
   - SaaS welcome banner with quick actions.
   - 5 Animated Metric Cards: Total Modules, High Risk Hotspots, Medium Risk, Low Risk, and Composite Defect Index.
   - **Machine Learning Defect Intelligence Section**: Live NASA MDP JM1 dataset stats card, defect class imbalance progress bar, champion model KPIs, and interactive 3-model empirical evaluation table.
   - 3 Recharts Visualizations: Risk Distribution Donut Chart, Complexity Analysis Bar Chart, and LOC Composition Chart.
   - Recent evaluations audit stream.
2. **Bug Prediction & Code Upload**:
   - Drag-and-drop file upload zone supporting `.java`, `.py`, `.cpp`, `.c`.
   - 4 Instant Sample Presets (`OrderProcessor.java`, `auth_service.py`, `data_buffer.cpp`, `packet_parser.c`).
   - Animated multi-stage upload progress indicator.
   - Result card with **Circular Progress Ring**, ML defect classification badge, model name, and probability.
   - 8 Glassmorphism metric cards and syntax-highlighted code preview with copy-to-clipboard.
   - Alternative manual sliders mode with real-time status indicators.
3. **Prediction Result & Explainable AI**:
   - Detailed breakdown of each metric's percentage impact and explanatory narrative.
   - Filterable refactoring recommendations by category.
   - Instant client-side PDF export.
4. **Module Registry (CRUD)**:
   - Searchable and sortable table with Add, Edit, Delete, and inline "Predict Risk Now" actions.
5. **Prediction History & Code Logs**:
   - Searchable audit log filterable by risk tier.
6. **Executive Reports & PDF Export**:
   - Summary cards, high-risk remediation list, and server-side PDF generator.

---

## 🔌 REST API Endpoints

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck returning service name, status, and version |
| `GET` | `/api/stats/dashboard` | Dashboard KPIs, top risky modules, and NASA MDP ML comparison data |
| `POST` | `/api/predictions/predict` | Run ML prediction on manual metrics (LOC, Complexity, Commits) |
| `GET` | `/api/predictions/ml-info` | Return NASA MDP JM1 dataset specifications and 3-model benchmark metrics |
| `GET` | `/api/predictions/history` | Retrieve historical predictions with search and risk filters |
| `POST` | `/api/analysis/upload` | Upload `.java`, `.py`, `.cpp`, `.c` file for AST analysis and ML prediction |
| `POST` | `/api/analysis/raw` | Analyze raw pasted code snippet |
| `GET` | `/api/analysis/history` | List previous static code analysis records |
| `GET` | `/api/analysis/{id}` | Retrieve detailed AST metrics, recommendations, and source code preview |
| `GET` | `/api/analysis/stats/visualizations` | Aggregate statistics for complexity distribution and LOC comparisons |
| `GET` | `/api/modules` | List all monitored software modules |
| `POST` | `/api/modules` | Register a new software module |
| `GET` | `/api/modules/{id}` | Retrieve single module details |
| `PUT` | `/api/modules/{id}` | Update existing module metrics |
| `DELETE` | `/api/modules/{id}` | Delete a software module |
| `GET` | `/api/reports/summary` | Generate high-level quality report summary |
| `GET` | `/api/reports/pdf` | Download official server-generated PDF defect report |

*Interactive OpenAPI / Swagger documentation is available at `http://127.0.0.1:8000/docs`.*

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS v4 + Glassmorphism surfaces
- **Charts**: Recharts (PieChart, BarChart, ResponsiveContainer)
- **Icons**: Lucide React
- **PDF Generation**: jsPDF + jspdf-autotable
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn (ASGI)
- **Machine Learning**: Scikit-Learn, Joblib, NumPy, Pandas
- **Static AST Analysis**: Python `ast`, regular expressions, multi-language tokenizers
- **Database**: SQLite with SQLAlchemy ORM
- **Validation**: Pydantic v2
- **PDF Reporting**: ReportLab

---

## 📂 Project Directory Structure

```
AI-Powered-Bug_Prediction-System/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes_code_analysis.py    # Code upload & AST analysis endpoints
│   │   │   ├── routes_dashboard.py        # Dashboard stats & ML benchmark endpoint
│   │   │   ├── routes_modules.py          # Module CRUD registry endpoints
│   │   │   ├── routes_predictions.py      # ML prediction & history endpoints
│   │   │   └── routes_reports.py          # PDF report generation endpoint
│   │   ├── core/
│   │   │   ├── config.py                  # CORS, API prefixes, project metadata
│   │   │   └── database.py                # SQLite engine & session factory
│   │   ├── models/
│   │   │   ├── code_analysis.py           # SQLite model for code analysis runs
│   │   │   ├── module.py                  # SQLite model for monitored modules
│   │   │   └── prediction.py              # SQLite model for prediction records
│   │   ├── schemas/
│   │   │   ├── code_analysis.py           # Pydantic schemas for code analysis
│   │   │   ├── module.py                  # Pydantic schemas for modules
│   │   │   └── prediction.py              # Pydantic schemas for ML predictions
│   │   ├── services/
│   │   │   ├── code_analyzer.py           # AST parser for Python, Java, C++, C
│   │   │   ├── code_recommendations.py    # Refactoring recommendation engine
│   │   │   ├── ml_engine.py               # Random Forest ML inference engine
│   │   │   └── recommendation.py          # Metric-driven recommendation generator
│   │   └── main.py                        # FastAPI application entrypoint
│   ├── dataset/
│   │   └── nasa_mdp/
│   │       ├── download_dataset.py        # Script to download JM1 from OpenML
│   │       ├── jm1.csv                    # NASA MDP JM1 dataset (8,912 unique rows)
│   │       └── README.md                  # Detailed dataset specifications
│   ├── saved_models/
│   │   ├── best_defect_model.joblib       # Trained Random Forest classifier
│   │   ├── scaler.joblib                  # Fitted StandardScaler
│   │   └── model_metadata.json            # Empirical benchmark evaluation results
│   ├── bug_predictor.db                   # SQLite database (pre-seeded)
│   ├── seed_data.py                       # Database seeder script
│   ├── test_api.py                        # Backend automated test suite
│   ├── test_code_analysis.py              # AST analyzer test suite
│   ├── train_ml_models.py                 # ML model training & evaluation pipeline
│   └── requirements.txt                   # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts                  # Axios API client functions
│   │   ├── components/
│   │   │   ├── code/                      # CodePreview, ExtractedMetricsCards
│   │   │   ├── common/                    # MetricCard, RiskBadge, CircularProgress, etc.
│   │   │   └── layout/                    # Header, Sidebar, Layout
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx           # Dark/Light theme provider
│   │   │   └── ToastContext.tsx           # Global toast notifications provider
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx              # Analytics dashboard with ML Benchmark
│   │   │   ├── BugPrediction.tsx          # Code uploader & prediction form
│   │   │   ├── PredictionResult.tsx       # Result gauge & recommendations
│   │   │   ├── ModuleManagement.tsx       # Module CRUD management table
│   │   │   ├── PredictionHistory.tsx      # Prediction history audit log
│   │   │   ├── CodeAnalysisHistory.tsx    # Source code analysis history
│   │   │   └── Reports.tsx                # Quality reports & PDF export
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript data models and interfaces
│   │   ├── App.tsx                        # Main application router
│   │   └── main.tsx                       # React application entrypoint
│   ├── package.json                       # Frontend dependencies & scripts
│   └── vite.config.ts                     # Vite build configuration & API proxy
├── run_backend.bat                        # Windows launcher for FastAPI backend
├── run_frontend.bat                       # Windows launcher for Vite frontend
├── .gitignore                             # Git ignore rules
└── README.md                              # Project documentation
```

---

## ⚡ Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Balaji-18-10/AI-Powered-Bud_Prediction-System.git
cd AI-Powered-Bud_Prediction-System
```

### 2. Backend Setup (FastAPI)
In a new terminal:
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Server: `http://127.0.0.1:8000`
- Swagger Documentation: `http://127.0.0.1:8000/docs`

*(Optional) To re-run the ML training & evaluation pipeline:*
```bash
python train_ml_models.py
```

### 3. Frontend Setup (React + Vite)
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
- The web app will launch at `http://localhost:5173`.
- Open `http://localhost:5173` in your browser.

### 4. Running One-Click Launchers (Windows)
Double-click:
- `run_backend.bat` to launch the FastAPI server.
- `run_frontend.bat` to launch the Vite development server.

---

## 📈 Limitations & Future Roadmap

1. **Cross-Project Defect Generalization**: NASA MDP JM1 reflects mission-critical C/C++ aerospace software. Cross-domain transfer learning across enterprise web repositories (Java Spring, TypeScript microservices) is planned for future releases.
2. **Deep Learning AST Embeddings**: Integrating Transformer-based code representations (**CodeBERT**, **GraphCodeBERT**) to capture semantic control-flow bugs (null pointer dereferences, resource leaks) beyond static numerical metrics.
3. **Automated CI/CD GitHub Action**: Packaging the AST analyzer as a GitHub Action to block pull requests exceeding cyclomatic complexity and bug risk thresholds.

---

## 📄 License & Author

Distributed under the **MIT License**. See `LICENSE` for more information.

- **Author**: Balaji
- **GitHub**: [@Balaji-18-10](https://github.com/Balaji-18-10)
- **Repository**: [AI-Powered-Bud_Prediction-System](https://github.com/Balaji-18-10/AI-Powered-Bud_Prediction-System)
