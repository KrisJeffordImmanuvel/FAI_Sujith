# Campus Water-Pipeline Fault Isolation Tool Using Breadth-First Search (BFS)

**A Complete AI/Algorithm-Based Micro-Project Website**  
**Institution:** Karunya Institute of Technology and Sciences  
**Course:** Fundamentals of Artificial Intelligence  
**Course Code:** 25DC204  
**Academic Year:** 2026–2027  

---

## 👥 Project Team Members
1. **Dabria Susan Sam** — Algorithm & Graph Modeling
2. **G Revanth Hari** — Hydraulic Network Simulation
3. **Sujith S.** — Full-Stack Development & UI/UX
4. **Leah Sasha V.L.** — Testing & Analytical Reporting

---

## 🌟 1. Project Overview & Objective

Municipal and campus water distribution networks are vulnerable to sub-surface pipeline fractures, ruptures, and pressure surges. In conventional systems, locating which isolation valves to shut off requires manual trial-and-error, resulting in:
1. Massive water wastage (hundreds of thousands of liters lost).
2. Prolonged campus water outages affecting student residences and research laboratories.
3. Unnecessary shutoffs of unaffected campus buildings.

### The Algorithmic Solution
This web-based interactive tool models the college campus water distribution network as an unweighted topological graph **\( G = (V, E) \)** and executes a **Two-Phase Breadth-First Search (BFS)** algorithm:

1. **First BFS (Boundary Isolation Valve Identification):**
   - Multi-source level-order search starting simultaneously from both endpoints of the ruptured pipe.
   - Explores outwards through junctions and buildings.
   - Halts immediately upon encountering any isolation valve (`V1`, `V2`, `V3`, `V4`), discovering the minimal boundary perimeter.
2. **Second BFS (Campus Building Reachability & Water Supply Assessment):**
   - Simulates physical closure of the identified boundary valves and removes the damaged pipeline.
   - Starts BFS from the primary source (**Central Water Tower 'WT'**).
   - Identifies which campus buildings remain supplied with water via redundant circulation loops (marked **Green**) vs which buildings lose water supply (marked **Grey/Red**).
3. **Automated Engineering Report Generation:**
   - Produces a formal isolation report detailing pipeline specifications, BFS traversal order, identified boundary valves, affected buildings, and estimated water conserved, exportable/printable to PDF.

---

## 🛠️ 2. Technology Stack & Architecture

- **Frontend:** HTML5, CSS3, JavaScript (ES6+ Modules)
- **Visual Graph Visualization:** Interactive SVG canvas with fluid flow pulses, zoom, pan, and draggable nodes.
- **Backend / Algorithmic Engine:**
  - **Dual-Engine Design:**
    - **Engine A (Python REST API Backend):** Zero-dependency REST API powered by Python 3 standard library (`http.server`) running on `http://localhost:5000`.
    - **Engine B (Client-Side JS Engine):** High-precision client-side JavaScript implementation allowing direct execution even without starting the server (`file:///` protocol).
- **Styling:** Premium blue-and-white water theme, glassmorphic cards, responsive grid, GitHub-style alerts, KaTeX-ready notation.

---

## 🚀 3. How to Run Locally on Windows 11

### Method 1: One-Click Launch (Recommended)
Double-click `run_server.bat` in the project root:
```cmd
c:\.dev\campus-water-bfs\run_server.bat
```
This automatically starts the Python server and opens `http://localhost:5000` in your default browser.

### Method 2: Manual Terminal Command
Open PowerShell or Command Prompt:
```powershell
cd c:\.dev\campus-water-bfs
python backend\app.py
```
Then visit: `http://localhost:5000` in Google Chrome or Microsoft Edge.

### Method 3: Direct Browser Launch (Zero-Install)
Simply double-click `index.html` to open it in any modern browser! The built-in JavaScript BFS engine runs with full interactive features.

### Method 3: Direct Browser Launch (Zero-Install)
Simply double-click `index.html` to open it in any modern browser! The built-in JavaScript BFS engine runs with full interactive features.

---

## 📊 4. Campus Water Network Topology

### Nodes (14 Nodes):
- **Water Tower (WT):** Main water source & elevated reservoir (Capacity: 500,000 L, Head: 35 m, 3.5 bar).
- **Junctions (J1, J2, J3, J4, J5):** Distribution manifolds splitting water between North, South, Central, and Eastern loops.
- **Valves (V1, V2, V3, V4):**
  - `V1`: Hostel Residential Isolation Valve
  - `V2`: Research Laboratories Isolation Valve
  - `V3`: Food Court & Canteen Isolation Valve
  - `V4`: Eastern Academic & Library Sector Valve
- **Campus Buildings (5 Consumer Nodes):**
  - `Hostel Residence Complex` (Demand: 120 m³/day, Occupancy: 1,800 students)
  - `Science & Research Laboratories` (Demand: 65 m³/day, Hazardous chemical safety priority)
  - `Campus Food Court & Canteen` (Demand: 45 m³/day, Kitchen & catering services)
  - `Main Academic Block` (Demand: 85 m³/day, Lecture auditoriums & classrooms)
  - `Central Campus Library` (Demand: 30 m³/day, 4-storey study archives)

### Pipelines (17 Edges):
- `P1`: WT ↔ J1 (Main Transmission Trunk)
- `P2`: J1 ↔ V1 (Hostel Approach Line)
- `P3`: V1 ↔ Hostel (Hostel Service Lateral)
- `P4`: J1 ↔ J2 (North Ring Main)
- `P5`: J1 ↔ J3 (South Ring Main)
- `P6`: J2 ↔ V2 (Lab Approach Line)
- `P7`: V2 ↔ Laboratory (Lab Service Lateral)
- `P8`: J3 ↔ V3 (Canteen Approach Line)
- `P9`: V3 ↔ Canteen (Canteen Service Lateral)
- `P10`: J2 ↔ J5 (North-Central Link)
- `P11`: J3 ↔ J5 (South-Central Link)
- `P12`: J5 ↔ J4 (East Header Conduit)
- `P13`: J4 ↔ V4 (Academic/Library Approach Line)
- `P14`: V4 ↔ Academic (Academic Lateral)
- `P15`: V4 ↔ Library (Library Lateral)
- `P16`: J2 ↔ J4 (North-East Bypass Loop)
- `P17`: J3 ↔ J4 (South-East Bypass Loop)

---

## 🧪 5. Demonstration Fault Scenarios

1. **Scenario 1: Hostel Residential Feed Rupture (`V1 ↔ Hostel`, P3)**
   - **Boundary Valve Identified:** `V1`
   - **Operational Buildings:** Laboratory, Canteen, Academic Block, Library (**80% preserved**)
   - **Affected Buildings:** Hostel only
2. **Scenario 2: Research Laboratory Service Fracture (`V2 ↔ Laboratory`, P7)**
   - **Boundary Valve Identified:** `V2`
   - **Operational Buildings:** Hostel, Canteen, Academic Block, Library (**80% preserved**)
   - **Affected Buildings:** Laboratory only
3. **Scenario 3: Food Court Supply Conduit Burst (`V3 ↔ Canteen`, P9)**
   - **Boundary Valve Identified:** `V3`
   - **Operational Buildings:** Hostel, Laboratory, Academic Block, Library (**80% preserved**)
   - **Affected Buildings:** Canteen only
4. **Scenario 4: East Academic Quadrant Pipe Rupture (`V4 ↔ Academic`, P14)**
   - **Boundary Valve Identified:** `V4`
   - **Operational Buildings:** Hostel, Laboratory, Canteen (**60% preserved**)
   - **Affected Buildings:** Academic Block, Library
5. **Scenario 5: North Ring Main Transmission Rupture (`J1 ↔ J2`, P4)**
   - **Boundary Valves Identified:** `V1, V2, V3, V4`
   - **Operational Buildings:** None (Trunk isolation safeguards against campus-wide drainage)
   - **Affected Buildings:** All 5 buildings

---

## 📋 6. Key Features Checklist

- [x] Modern blue & white water theme with fluid gradient elements
- [x] Responsive layout for laptop, tablet, and mobile screens
- [x] Interactive SVG graph with pan, zoom, and node dragging
- [x] Click-to-select faulty pipelines directly on the canvas
- [x] Real BFS algorithm implementation (both in Python & client-side JavaScript)
- [x] Transparent FIFO Queue inspector with real-time Enqueue/Dequeue logging
- [x] Phase 1 BFS: Boundary Valve Identification halting at valve nodes
- [x] Phase 2 BFS: Building Reachability from Water Tower
- [x] Interactive Stepper Controls: Play, Pause, Next Step, Prev Step, Reset
- [x] Real-time Step-by-Step BFS Animation with active node halo & edge probe indicators
- [x] Live FIFO Queue Visualizer with animated HEAD & TAIL indicator tags
- [x] Live Visited Nodes list & dynamic count
- [x] Live Traversal Order sequence breadcrumbs (`WT → J1 → V1...`)
- [x] Keyboard Shortcuts: Spacebar (Play/Pause), Right Arrow (Next), Left Arrow (Prev), 'R' (Reset)
- [x] Speed multiplier slider (0.5x, 1x, 2x, 5x, Instant)
- [x] Printable and PDF-exportable engineering isolation reports
- [x] Educational Theory section explaining Graph Modeling & BFS
- [x] Full Academic Details: Karunya Institute of Technology and Sciences, 25DC204, Team Members
- [x] Simulation modeling disclaimer (clearly labeled as simulation tool)

