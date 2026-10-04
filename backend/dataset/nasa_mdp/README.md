# NASA Metrics Data Program (MDP) — JM1 Software Defect Dataset

## 1. Dataset Overview & Source
- **Dataset Name**: NASA MDP JM1
- **Source**: NASA Metrics Data Program (MDP), archived in the PROMISE Software Engineering Repository, distributed via OpenML (`data_id: 1053`).
- **Project Domain**: NASA real-time ground system software written in C and C++.
- **Task**: Binary classification for software defect / bug risk prediction ($1 = \text{Defective}, 0 = \text{Non-Defective}$).

---

## 2. Dataset Empirical Statistics
All statistics below are computed directly from the local `jm1.csv` file without synthetic interpolation:
- **Raw Total Records**: 10,885
- **Exact Duplicate Rows**: 1,973
- **Unique Records Actually Used**: 8,912
- **Missing Values**: 25 numeric values across 5 attributes (`uniq_Op`: 5, `uniq_Opnd`: 5, `total_Op`: 5, `total_Opnd`: 5, `branchCount`: 5), handled via median imputation.
- **Target Distribution (Clean / Non-Defective)**: 6,902 instances ($77.45\%$)
- **Target Distribution (Defective / Buggy)**: 2,010 instances ($22.55\%$)
- **Total Features**: 21 numeric software metrics + 1 binary target column (`defects`).

---

## 3. Available Features & Metric Definitions

### McCabe Cyclomatic & Structural Complexity Metrics
| Feature | Type | Definition / Explanation |
| :--- | :--- | :--- |
| `loc` | Float | McCabe's Lines of Code |
| `v(g)` | Float | Cyclomatic Complexity (number of independent paths: $E - N + 2P$) |
| `ev(g)` | Float | Essential Complexity (degree of unstructured logic) |
| `iv(g)` | Float | Design Complexity (cyclomatic complexity of module's reduced graph) |
| `branchCount` | Float | Total conditional and branch execution decision points |

### Halstead Derived Software Science Metrics
| Feature | Type | Definition / Explanation |
| :--- | :--- | :--- |
| `n` | Float | Halstead Total Length ($N_1 + N_2$: total operators + total operands) |
| `v` | Float | Halstead Volume ($N \times \log_2(\eta)$) |
| `l` | Float | Halstead Program Length ($\frac{2}{\eta_1} \times \frac{\eta_2}{N_2}$) |
| `d` | Float | Halstead Difficulty ($\frac{\eta_1}{2} \times \frac{N_2}{\eta_2}$) |
| `i` | Float | Halstead Intelligence Content ($I = L \times V$) |
| `e` | Float | Halstead Effort ($E = D \times V$, mental effort required to implement) |
| `b` | Float | Halstead Delivered Bugs Estimate ($B = \frac{V}{3000}$) |
| `t` | Float | Halstead Time Estimator ($T = \frac{E}{18}$ seconds) |

### Line Count & Comment Density Metrics
| Feature | Type | Definition / Explanation |
| :--- | :--- | :--- |
| `lOCode` | Integer | Total executable code lines |
| `lOComment` | Integer | Total comment lines |
| `lOBlank` | Integer | Total blank lines |
| `locCodeAndComment` | Integer | Lines containing both executable code and comments |

### Token Operator & Operand Counts
| Feature | Type | Definition / Explanation |
| :--- | :--- | :--- |
| `uniq_Op` | Float | Unique Operators ($\eta_1$) |
| `uniq_Opnd` | Float | Unique Operands ($\eta_2$) |
| `total_Op` | Float | Total Operator count ($N_1$) |
| `total_Opnd` | Float | Total Operand count ($N_2$) |

### Target Label
- **`defects`**: Boolean label indicating presence of software defects (`true` = defective, `false` = clean).
