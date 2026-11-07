/**
 * Campus Water-Pipeline Fault Isolation Tool
 * Engineering Isolation Report Generator & PDF Export
 * Karunya Institute of Technology and Sciences (25DC204)
 */

class ReportManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentReport = null;
    }

    renderReport(reportData) {
        this.currentReport = reportData;
        if (!reportData) {
            this.container.innerHTML = `
                <div class="empty-report-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Simulation Report Available Yet</h3>
                    <p>Run a pipeline fault simulation or select a demonstration scenario to generate an analytical engineering isolation report.</p>
                </div>
            `;
            return;
        }

        const { metadata, fault, phase1, phase2, waterSavedLiters, timestamp } = reportData;

        const totalBuildings = phase2.operationalBuildings.length + phase2.affectedBuildings.length;
        const protectionPct = phase2.metrics.protectionEfficiency || 0;

        let tableRows = "";
        
        // Operational buildings rows (Green)
        phase2.operationalBuildings.forEach(b => {
            tableRows += `
                <tr class="row-operational">
                    <td><span class="status-indicator-dot dot-green"></span> <strong>${b.name}</strong></td>
                    <td>${b.id}</td>
                    <td>${b.demand || 50} m³/day</td>
                    <td><span class="badge-status badge-success">● OPERATIONAL</span></td>
                    <td class="text-muted">Still connected to the water tower.</td>
                </tr>
            `;
        });

        // Affected buildings rows (Red)
        phase2.affectedBuildings.forEach(b => {
            tableRows += `
                <tr class="row-affected">
                    <td><span class="status-indicator-dot dot-red"></span> <strong>${b.name}</strong></td>
                    <td>${b.id}</td>
                    <td>${b.demand || 50} m³/day</td>
                    <td><span class="badge-status badge-danger">✖ ISOLATED (NO WATER)</span></td>
                    <td class="text-danger">Dispatch campus water tanker auxiliary line.</td>
                </tr>
            `;
        });

        const html = `
            <div class="report-toolbar no-print">
                <span>In the print dialog, choose <strong>Save as PDF</strong> to download the report.</span>
                <button class="btn btn-primary btn-print-pdf">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download / Print PDF
                </button>
            </div>
            <div class="report-document" id="printable-report">
                <!-- Official Header -->
                <div class="report-header">
                    <div class="report-brand">
                        <div class="brand-crest">💧</div>
                        <div>
                            <h2 class="institution-title">${metadata.institution}</h2>
                            <p class="department-subtitle">${metadata.course} (${metadata.courseCode}) | Academic Year: ${metadata.academicYear}</p>
                            <h1 class="project-title">${metadata.title}</h1>
                        </div>
                    </div>
                    <div class="report-meta">
                        <div class="meta-tag"><strong>Report Reference:</strong> KITS-WIR-${Math.floor(1000 + Math.random() * 9000)}</div>
                        <div class="meta-tag"><strong>Generated At:</strong> ${timestamp}</div>
                        <div class="meta-tag"><strong>Evaluation Status:</strong> Algorithmic Simulation Verified</div>
                    </div>
                </div>

                <!-- Executive Summary Cards -->
                <div class="report-kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">Ruptured Pipeline</div>
                        <div class="kpi-value highlight-red">${fault.pipeId}</div>
                        <div class="kpi-sub">${fault.u} ↔ ${fault.v} (${fault.label})</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Boundary Valves Isolated</div>
                        <div class="kpi-value highlight-orange">${phase1.boundaryValves.length}</div>
                        <div class="kpi-sub">[${phase1.boundaryValves.join(", ")}]</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Protected Campus Facilities</div>
                        <div class="kpi-value highlight-green">${phase2.operationalBuildings.length} / ${totalBuildings}</div>
                        <div class="kpi-sub">${protectionPct}% Supply Efficiency</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Rough Water-Loss Estimate</div>
                        <div class="kpi-value highlight-blue">${waterSavedLiters.toLocaleString()} L</div>
                        <div class="kpi-sub">Illustrative: design flow × 0.85 × 45 min</div>
                    </div>
                </div>

                <!-- Incident & Technical Telemetry -->
                <div class="report-section">
                    <h3 class="section-heading">1. Pipeline Rupture Incident Telemetry</h3>
                    <div class="telemetry-grid">
                        <div class="telemetry-item">
                            <span class="t-label">Pipeline Identifier:</span>
                            <span class="t-val">${fault.pipeId} (${fault.label})</span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">Endpoints Traversed:</span>
                            <span class="t-val">${fault.uName} (${fault.u}) ↔ ${fault.vName} (${fault.v})</span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">Conduit Nominal Diameter:</span>
                            <span class="t-val">${fault.dia} mm</span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">Segment Span:</span>
                            <span class="t-val">${fault.length} meters</span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">Design Flow (reference):</span>
                            <span class="t-val">${fault.flow} Liters / minute</span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">Incident Severity:</span>
                            <span class="t-val text-danger font-bold">Critical Rupture — Automatic BFS Isolation Triggered</span>
                        </div>
                    </div>
                </div>

                <!-- BFS Phase 1 Valve Discovery -->
                <div class="report-section">
                    <h3 class="section-heading">2. Step 2 – First BFS: Boundary Valves</h3>
                    <p class="section-desc">
                        Multi-source Breadth-First Search was initiated from endpoints <code>${fault.u}</code> and <code>${fault.v}</code>.
                        The search expanded one level (one pipe) at a time and stopped each branch at the first valve it met, so it found the nearest valves that isolate the rupture (fewest hops).
                    </p>
                    <div class="telemetry-grid">
                        <div class="telemetry-item">
                            <span class="t-label">BFS Traversal Order:</span>
                            <span class="t-val"><code>${phase1.traversalOrder.join(" → ")}</code></span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">Total Nodes Explored:</span>
                            <span class="t-val">${phase1.visitedCount} nodes</span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">Boundary Valves Identified:</span>
                            <span class="t-val text-warning font-bold">${phase1.boundaryValves.map(v => `${v} (CLOSED)`).join(", ")}</span>
                        </div>
                        <div class="telemetry-item">
                            <span class="t-label">First BFS Runtime:</span>
                            <span class="t-val font-mono">${phase1.timeMs} ms</span>
                        </div>
                    </div>
                </div>

                <!-- BFS Phase 2 Building Reachability Table -->
                <div class="report-section">
                    <h3 class="section-heading">3. Step 4 – Second BFS: Building Supply</h3>
                    <p class="section-desc">
                        Following physical closure of boundary valves, a reachability BFS was executed starting from the primary reservoir (<strong>Water Tower 'WT'</strong>).
                        Buildings it reached are still connected to the tower through open pipes; buildings it could not reach are cut off. (Connectivity only; flow and pressure are not simulated.)
                    </p>

                    <div class="table-responsive">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Campus Facility</th>
                                    <th>Node ID</th>
                                    <th>Daily Demand</th>
                                    <th>Water Supply Status</th>
                                    <th>Operational Contingency Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Academic Team Signature Footer -->
                <div class="report-footer">
                    <div class="team-credits">
                        <h4>Project Team Members (Micro-Project)</h4>
                        <div class="team-grid">
                            ${metadata.team.map(m => `
                                <div class="team-member-pill">
                                    <strong>${m.name}</strong>
                                    <span>${m.role}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                    <div class="report-actions no-print">
                        <button class="btn btn-primary btn-print-pdf">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download / Print PDF
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // Download / Print PDF: the browser print dialog offers "Save as PDF";
        // the @media print rules in style.css print only this report.
        this.container.querySelectorAll(".btn-print-pdf").forEach(btn => {
            btn.addEventListener("click", () => window.print());
        });
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = ReportManager;
}

