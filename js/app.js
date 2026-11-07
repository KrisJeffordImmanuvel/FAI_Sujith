/**
 * Campus Water-Pipeline Fault Isolation Tool
 * Main Application Orchestrator & UI Controller
 * Institution: Karunya Institute of Technology and Sciences
 * Course: Fundamentals of Artificial Intelligence (25DC204)
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize BFS Engine & Data
    const data = CAMPUS_NETWORK_DATA;
    const bfsEngine = new CampusWaterBFS(data);

    // 2. Set up Visualizer
    let visualizer = null;
    let reportManager = null;
    let simController = null;

    // Toast notification helper
    function showToast(message, type = "info") {
        const toastContainer = document.getElementById("toast-container");
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️"}</div>
            <div class="toast-content">${message}</div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("toast-fadeout");
            setTimeout(() => toast.remove(), 400);
        }, 3800);
    }

    // Traversal log helper
    function addLogMessage(msg) {
        const logContainer = document.getElementById("algorithm-log-list");
        if (!logContainer) return;
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement("div");
        entry.className = "log-entry";
        entry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-msg">${msg}</span>`;
        logContainer.prepend(entry);
    }

    // 3. Setup UI Callbacks for Simulation Controller
    const uiCallbacks = {
        onStateChange: (state) => {
            updateDashboardMetrics(state);
            updateControlButtons(state);
            updateStaticInspectorWidgets(state);
        },
        onPlayStateChange: (isPlaying) => {
            updatePlayPauseButton(isPlaying);
        },
        onStepUpdate: (stepInfo) => {
            updateLiveStepDisplay(stepInfo);
        },
        onLogMessage: (msg) => {
            addLogMessage(msg);
        },
        onError: (err) => {
            showToast(err, "error");
        },
        onReportReady: (reportData) => {
            if (reportManager) reportManager.renderReport(reportData);
            showToast("Isolation report generated successfully! View under 'Isolation Report' tab.", "success");
        }
    };

    // 4. Initialize Visualizer & Controller
    visualizer = new NetworkVisualizer(
        "network-canvas-container",
        data,
        (pipeId, u, v) => onPipelineClicked(pipeId, u, v),
        (nodeId) => onNodeClicked(nodeId)
    );

    reportManager = new ReportManager("report-view-container");
    simController = new SimulationController(data, visualizer, bfsEngine, uiCallbacks);

    // Populate selectors
    populateDropdowns();
    populateScenarios();
    setupNavigation();
    setupSimulationButtons();
    setupKeyboardShortcuts();
    checkBackendHealth();

    // 5. Pipe & Node Click Handlers
    function onPipelineClicked(pipeId, u, v) {
        document.getElementById("fault-pipe-select").value = pipeId;
        document.getElementById("endpoint-u-select").value = u;
        document.getElementById("endpoint-v-select").value = v;
        simController.detectFault(u, v, pipeId);
        showToast(`Selected pipeline ${pipeId} (${u} ↔ ${v}) as faulty. Use Play (▶) or Next Step (⏭) to begin isolation.`, "info");
    }

    function onNodeClicked(nodeId) {
        const uSelect = document.getElementById("endpoint-u-select");
        const vSelect = document.getElementById("endpoint-v-select");

        if (!uSelect.value || (uSelect.value && vSelect.value)) {
            uSelect.value = nodeId;
            vSelect.value = "";
            showToast(`Selected Endpoint 1: ${nodeId}. Now select Endpoint 2.`, "info");
        } else if (uSelect.value && !vSelect.value) {
            if (uSelect.value === nodeId) return;
            vSelect.value = nodeId;
            const pipe = bfsEngine.findPipe(uSelect.value, nodeId);
            if (pipe) {
                document.getElementById("fault-pipe-select").value = pipe.id;
                simController.detectFault(uSelect.value, nodeId, pipe.id);
            } else {
                showToast(`No direct pipeline exists between ${uSelect.value} and ${nodeId}. Please pick adjacent nodes.`, "error");
                vSelect.value = "";
            }
        }
    }

    // 6. Dropdown Population
    function populateDropdowns() {
        const uSelect = document.getElementById("endpoint-u-select");
        const vSelect = document.getElementById("endpoint-v-select");
        const pipeSelect = document.getElementById("fault-pipe-select");

        uSelect.innerHTML = '<option value="">-- Endpoint 1 --</option>';
        vSelect.innerHTML = '<option value="">-- Endpoint 2 --</option>';
        pipeSelect.innerHTML = '<option value="">-- Choose Pipeline --</option>';

        Object.keys(data.nodes).forEach(nid => {
            const node = data.nodes[nid];
            uSelect.innerHTML += `<option value="${nid}">${nid} - ${node.name}</option>`;
            vSelect.innerHTML += `<option value="${nid}">${nid} - ${node.name}</option>`;
        });

        data.pipelines.forEach(pipe => {
            pipeSelect.innerHTML += `<option value="${pipe.id}">${pipe.id}: ${pipe.u} ↔ ${pipe.v} (${pipe.label})</option>`;
        });

        pipeSelect.addEventListener("change", (e) => {
            const pid = e.target.value;
            if (!pid) return;
            const pipe = data.pipelines.find(p => p.id === pid);
            if (pipe) {
                uSelect.value = pipe.u;
                vSelect.value = pipe.v;
                simController.detectFault(pipe.u, pipe.v, pipe.id);
            }
        });

        const onEndpointChange = () => {
            const u = uSelect.value;
            const v = vSelect.value;
            if (u && v) {
                const pipe = bfsEngine.findPipe(u, v);
                if (pipe) {
                    pipeSelect.value = pipe.id;
                    simController.detectFault(u, v, pipe.id);
                } else {
                    showToast(`No direct pipeline connects ${u} and ${v}.`, "error");
                }
            }
        };

        uSelect.addEventListener("change", onEndpointChange);
        vSelect.addEventListener("change", onEndpointChange);
    }

    // 7. Scenario List Population
    function populateScenarios() {
        const list = document.getElementById("scenarios-list");
        if (!list) return;

        list.innerHTML = "";
        data.scenarios.forEach(sc => {
            const card = document.createElement("div");
            card.className = "scenario-card";
            card.innerHTML = `
                <div class="sc-header">
                    <span class="sc-badge badge-${sc.badgeColor}">${sc.badge}</span>
                    <strong class="sc-title">${sc.title}</strong>
                </div>
                <p class="sc-desc">${sc.description}</p>
                <div class="sc-meta">
                    <span>Target: <strong>${sc.pipe_id} (${sc.fault_u} ↔ ${sc.fault_v})</strong></span>
                    <button class="btn btn-sm btn-outline load-sc-btn" data-id="${sc.id}">Load & Simulate</button>
                </div>
            `;
            list.appendChild(card);
        });

        list.querySelectorAll(".load-sc-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const scId = btn.getAttribute("data-id");
                const sc = data.scenarios.find(s => s.id === scId);
                if (sc) {
                    document.getElementById("fault-pipe-select").value = sc.pipe_id;
                    document.getElementById("endpoint-u-select").value = sc.fault_u;
                    document.getElementById("endpoint-v-select").value = sc.fault_v;
                    switchTab("tab-simulation");
                    simController.startFullSimulation(sc.fault_u, sc.fault_v, sc.pipe_id);
                    showToast(`Loaded "${sc.title}" and started automated BFS simulation!`, "success");
                }
            });
        });
    }

    // 8. Navigation & Tabs
    function setupNavigation() {
        const navBtns = document.querySelectorAll(".nav-link");
        navBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const targetTab = btn.getAttribute("data-tab");
                switchTab(targetTab);
            });
        });

        // Quick action buttons in dashboard
        document.querySelectorAll("[data-action='quick-simulate']").forEach(el => {
            el.addEventListener("click", () => {
                switchTab("tab-simulation");
            });
        });
    }

    function switchTab(tabId) {
        document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
        document.querySelectorAll(".nav-link").forEach(btn => btn.classList.remove("active"));

        const targetPane = document.getElementById(tabId);
        const targetBtn = document.querySelector(`.nav-link[data-tab='${tabId}']`);

        if (targetPane) targetPane.classList.add("active");
        if (targetBtn) targetBtn.classList.add("active");

        if (tabId === "tab-simulation" && visualizer) {
            setTimeout(() => visualizer.render(), 50);
        }
    }

    // 9. Simulation Controls & Stepper Buttons
    function setupSimulationButtons() {
        // Step workflow buttons
        document.getElementById("btn-detect-fault").addEventListener("click", () => {
            const u = document.getElementById("endpoint-u-select").value;
            const v = document.getElementById("endpoint-v-select").value;
            const pipeId = document.getElementById("fault-pipe-select").value;
            if (!u || !v) {
                showToast("Please choose faulty pipeline endpoints first.", "error");
                return;
            }
            simController.detectFault(u, v, pipeId);
        });

        document.getElementById("btn-run-first-bfs").addEventListener("click", () => {
            simController.runFirstBFS(true);
        });

        document.getElementById("btn-close-valves").addEventListener("click", () => {
            simController.closeBoundaryValves();
        });

        document.getElementById("btn-run-second-bfs").addEventListener("click", () => {
            simController.runSecondBFS(true);
        });

        document.getElementById("btn-gen-report").addEventListener("click", () => {
            const reportData = simController.getReportData();
            if (!reportData) {
                showToast("Please complete both BFS phases before generating report.", "error");
                return;
            }
            reportManager.renderReport(reportData);
            switchTab("tab-report");
        });

        document.getElementById("btn-start-full-sim").addEventListener("click", () => {
            const u = document.getElementById("endpoint-u-select").value;
            const v = document.getElementById("endpoint-v-select").value;
            const pipeId = document.getElementById("fault-pipe-select").value;
            if (!u || !v) {
                const sc = data.scenarios[0];
                document.getElementById("fault-pipe-select").value = sc.pipe_id;
                document.getElementById("endpoint-u-select").value = sc.fault_u;
                document.getElementById("endpoint-v-select").value = sc.fault_v;
                simController.startFullSimulation(sc.fault_u, sc.fault_v, sc.pipe_id);
            } else {
                simController.startFullSimulation(u, v, pipeId);
            }
        });

        document.getElementById("btn-reset-network").addEventListener("click", () => {
            resetAllInputs();
            simController.resetNetwork();
            showToast("Network restored to normal operational baseline.", "info");
        });

        // Sample network button
        document.getElementById("btn-sample-network").addEventListener("click", () => {
            const sc = data.scenarios[0];
            document.getElementById("fault-pipe-select").value = sc.pipe_id;
            document.getElementById("endpoint-u-select").value = sc.fault_u;
            document.getElementById("endpoint-v-select").value = sc.fault_v;
            simController.detectFault(sc.fault_u, sc.fault_v, sc.pipe_id);
            showToast("Sample Network Fault loaded: Hostel line burst (P3).", "info");
        });

        // Speed slider
        const speedSelect = document.getElementById("sim-speed-select");
        if (speedSelect) {
            speedSelect.addEventListener("change", (e) => {
                simController.setSpeed(e.target.value);
            });
        }

        // Engine Toggle
        const engineSelect = document.getElementById("engine-mode-select");
        if (engineSelect) {
            engineSelect.addEventListener("change", (e) => {
                simController.setEngineMode(e.target.value);
            });
        }

        // --- NEW STEPPER & PLAYBACK CONTROLS ---
        const btnPlayPause = document.getElementById("btn-play-pause");
        const btnStepNext = document.getElementById("btn-step-next");
        const btnStepPrev = document.getElementById("btn-step-prev");
        const btnPlaybackReset = document.getElementById("btn-playback-reset");

        if (btnPlayPause) {
            btnPlayPause.addEventListener("click", () => {
                simController.togglePlayPause();
            });
        }

        if (btnStepNext) {
            btnStepNext.addEventListener("click", () => {
                simController.nextStep();
            });
        }

        if (btnStepPrev) {
            btnStepPrev.addEventListener("click", () => {
                simController.prevStep();
            });
        }

        if (btnPlaybackReset) {
            btnPlaybackReset.addEventListener("click", () => {
                resetAllInputs();
                simController.resetNetwork();
                showToast("Simulation and network state reset.", "info");
            });
        }
    }

    function resetAllInputs() {
        document.getElementById("endpoint-u-select").value = "";
        document.getElementById("endpoint-v-select").value = "";
        document.getElementById("fault-pipe-select").value = "";
    }

    // Keyboard Shortcuts (Spacebar, Arrows, 'R')
    function setupKeyboardShortcuts() {
        window.addEventListener("keydown", (e) => {
            // Avoid triggering shortcuts while typing inside select or text inputs
            if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
                return;
            }

            if (e.code === "Space") {
                e.preventDefault();
                simController.togglePlayPause();
            } else if (e.code === "ArrowRight") {
                e.preventDefault();
                simController.nextStep();
            } else if (e.code === "ArrowLeft") {
                e.preventDefault();
                simController.prevStep();
            } else if (e.key === "r" || e.key === "R") {
                e.preventDefault();
                resetAllInputs();
                simController.resetNetwork();
            }
        });
    }

    function updatePlayPauseButton(isPlaying) {
        const iconEl = document.getElementById("play-pause-icon");
        const textEl = document.getElementById("play-pause-text");
        const btn = document.getElementById("btn-play-pause");
        if (!btn || !iconEl || !textEl) return;

        if (isPlaying) {
            iconEl.textContent = "⏸";
            textEl.textContent = "Pause";
            btn.style.background = "linear-gradient(135deg, #ea580c, #c2410c)";
            btn.style.borderColor = "#fb923c";
        } else {
            iconEl.textContent = "▶";
            textEl.textContent = "Play";
            btn.style.background = "linear-gradient(135deg, #0284c7, #0369a1)";
            btn.style.borderColor = "#38bdf8";
        }
    }

    // 10. Dashboard Metrics Update
    function updateDashboardMetrics(state) {
        const totalNodes = Object.keys(data.nodes).length;
        const totalPipes = data.pipelines.length;
        const totalValves = Object.values(data.nodes).filter(n => n.type === "valve").length;
        const totalBuildings = Object.values(data.nodes).filter(n => n.type === "building").length;

        document.getElementById("metric-total-nodes").textContent = totalNodes;
        document.getElementById("metric-total-pipes").textContent = totalPipes;
        document.getElementById("metric-total-valves").textContent = totalValves;
        document.getElementById("metric-total-buildings").textContent = totalBuildings;

        const faultsCount = state.selectedFault ? 1 : 0;
        const affectedCount = state.phase2Result ? state.phase2Result.affectedBuildings.length : (state.selectedFault ? "Pending BFS" : 0);

        document.getElementById("metric-faults-count").textContent = faultsCount;
        document.getElementById("metric-affected-count").textContent = affectedCount;

        const statusEl = document.getElementById("metric-network-status");
        if (state.phase === "NORMAL") {
            statusEl.innerHTML = `<span class="status-pill status-normal">● NORMAL</span>`;
        } else if (state.phase === "FAULT") {
            statusEl.innerHTML = `<span class="status-pill status-fault">⚠️ FAULT DETECTED</span>`;
        } else if (state.phase === "PHASE1_BFS") {
            statusEl.innerHTML = `<span class="status-pill status-processing">⚙️ 1ST BFS RUNNING</span>`;
        } else if (state.phase === "VALVES_CLOSED") {
            statusEl.innerHTML = `<span class="status-pill status-isolated">🔒 VALVES ISOLATED</span>`;
        } else if (state.phase === "PHASE2_BFS") {
            statusEl.innerHTML = `<span class="status-pill status-processing">⚙️ 2ND BFS RUNNING</span>`;
        } else if (state.phase === "COMPLETE") {
            statusEl.innerHTML = `<span class="status-pill status-complete">✅ ISOLATION COMPLETE</span>`;
        }
    }

    function updateControlButtons(state) {
        const stepItems = document.querySelectorAll(".step-indicator-item");
        stepItems.forEach(item => item.classList.remove("active", "completed"));

        const phase = state.phase;
        if (phase === "FAULT") {
            if (stepItems[0]) stepItems[0].classList.add("active");
        } else if (phase === "PHASE1_BFS") {
            if (stepItems[0]) stepItems[0].classList.add("completed");
            if (stepItems[1]) stepItems[1].classList.add("active");
        } else if (phase === "VALVES_CLOSED") {
            if (stepItems[0]) stepItems[0].classList.add("completed");
            if (stepItems[1]) stepItems[1].classList.add("completed");
            if (stepItems[2]) stepItems[2].classList.add("active");
        } else if (phase === "PHASE2_BFS") {
            if (stepItems[0]) stepItems[0].classList.add("completed");
            if (stepItems[1]) stepItems[1].classList.add("completed");
            if (stepItems[2]) stepItems[2].classList.add("completed");
            if (stepItems[3]) stepItems[3].classList.add("active");
        } else if (phase === "COMPLETE") {
            stepItems.forEach(item => item.classList.add("completed"));
        }
    }

    function updateStaticInspectorWidgets(state) {
        const valvesContainer = document.getElementById("live-valves-display");
        if (valvesContainer) {
            if (state.boundaryValves.length === 0) {
                valvesContainer.innerHTML = `<span class="text-muted">None discovered yet</span>`;
            } else {
                valvesContainer.innerHTML = state.boundaryValves.map(v => `
                    <span class="valve-pill ${state.closedValves.includes(v) ? 'valve-pill-closed' : 'valve-pill-open'}">
                        ${v} (${state.closedValves.includes(v) ? 'CLOSED' : 'IDENTIFIED'})
                    </span>
                `).join("");
            }
        }
    }

    /**
     * Updates all Live Telemetry Widgets: Queue, Visited Nodes, Traversal Order & Progress Bar
     */
    function updateLiveStepDisplay(stepInfo) {
        const { stepNumber, totalSteps, phase, action, currentNode, queue, visitedNodes, traversalOrder, message, isPlaying } = stepInfo;

        // 1. Progress Bar & Step Counter
        const pct = totalSteps > 0 ? Math.round((stepNumber / totalSteps) * 100) : 0;
        const progressFill = document.getElementById("playback-progress-fill");
        const stepCounter = document.getElementById("playback-step-counter");
        const phaseBadge = document.getElementById("playback-phase-badge");
        const simPhaseTag = document.getElementById("sim-live-phase-tag");

        if (progressFill) progressFill.style.width = `${pct}%`;
        if (stepCounter) stepCounter.textContent = `Step ${stepNumber} / ${totalSteps} (${pct}%)`;

        let phaseName = "Phase 1: Boundary Valve Search";
        if (phase === 2) phaseName = "Phase 2: Supply Reachability";
        else if (phase === 0) phaseName = "Baseline Ready";

        if (phaseBadge) phaseBadge.textContent = phaseName;
        if (simPhaseTag) simPhaseTag.textContent = phaseName;

        // 2. Action Banner
        const actionTitle = document.getElementById("sim-live-action-title");
        const actionText = document.getElementById("sim-live-action-text");
        if (actionTitle) actionTitle.textContent = action ? `[${action.replace(/_/g, " ")}]:` : "Action:";
        if (actionText) actionText.textContent = message || "Processing BFS traversal step...";

        // 3. FIFO Queue Visualizer (Both on Simulation Tab and Inspector Tab)
        renderQueueWidgets(queue, currentNode);

        // 4. Visited Nodes Visualizer
        renderVisitedWidgets(visitedNodes);

        // 5. Traversal Order Breadcrumbs
        renderTraversalWidgets(traversalOrder);

        // 6. Inspector Active Node & Message
        const currNodeEl = document.getElementById("live-current-node");
        if (currNodeEl) currNodeEl.textContent = currentNode || "None";

        const stepMsgEl = document.getElementById("live-step-message");
        if (stepMsgEl) stepMsgEl.textContent = message || "Ready";

        updatePlayPauseButton(isPlaying);
    }

    function renderQueueWidgets(queue, currentNode) {
        const queueHtml = (!queue || queue.length === 0)
            ? `<span class="queue-empty">[ Empty Queue ]</span>`
            : queue.map((item, idx) => {
                const isHead = (idx === 0);
                const isTail = (idx === queue.length - 1);
                return `
                    <div class="queue-item-box ${isHead ? 'queue-box-head' : ''}">
                        <span class="q-label">${item}</span>
                        ${isHead ? '<span class="q-sub-tag">HEAD</span>' : isTail ? '<span class="q-sub-tag">TAIL</span>' : ''}
                    </div>
                `;
            }).join('<span class="queue-arrow">←</span>');

        const simQueue = document.getElementById("sim-live-queue");
        const inspectorQueue = document.getElementById("live-queue-display");
        const countBadge = document.getElementById("sim-queue-count");

        if (simQueue) simQueue.innerHTML = queueHtml;
        if (inspectorQueue) inspectorQueue.innerHTML = queueHtml;
        if (countBadge) countBadge.textContent = `${(queue || []).length} items`;
    }

    function renderVisitedWidgets(visitedNodes) {
        const visitedList = visitedNodes || [];
        const chipsHtml = visitedList.length === 0
            ? `<span class="text-muted" style="font-size: 0.8rem;">None visited yet</span>`
            : visitedList.map(n => {
                const nodeObj = data.nodes[n];
                const type = nodeObj ? nodeObj.type : "";
                let typeColorClass = "node-mini-pill";
                if (type === "valve") typeColorClass = "valve-pill valve-pill-open";
                return `<span class="${typeColorClass}">${n}</span>`;
            }).join(" ");

        const simVisited = document.getElementById("sim-live-visited");
        const inspectorVisited = document.getElementById("live-visited-display");
        const countBadge = document.getElementById("sim-visited-count");

        if (simVisited) simVisited.innerHTML = chipsHtml;
        if (inspectorVisited) inspectorVisited.innerHTML = chipsHtml;
        if (countBadge) countBadge.textContent = `${visitedList.length} visited`;
    }

    function renderTraversalWidgets(traversalOrder) {
        const list = traversalOrder || [];
        const traversalHtml = list.length === 0
            ? `<span class="text-muted" style="font-size: 0.8rem;">No traversal sequence yet</span>`
            : list.map((n, i) => {
                const isLatest = (i === list.length - 1);
                return `
                    <span class="traversal-chip ${isLatest ? 'traversal-chip-new' : ''}">
                        ${n}
                    </span>
                    ${i < list.length - 1 ? '<span class="traversal-arrow">→</span>' : ''}
                `;
            }).join(" ");

        const simTraversal = document.getElementById("sim-live-traversal");
        const inspectorTraversal = document.getElementById("inspector-live-traversal");
        const countBadge = document.getElementById("sim-traversal-count");

        if (simTraversal) simTraversal.innerHTML = traversalHtml;
        if (inspectorTraversal) inspectorTraversal.innerHTML = traversalHtml;
        if (countBadge) countBadge.textContent = `${list.length} nodes`;
    }

    async function checkBackendHealth() {
        const statusBadge = document.getElementById("backend-health-pill");
        if (!statusBadge) return;
        const apiBase = (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http"))
            ? window.location.origin
            : "http://localhost:5000";
        try {
            const resp = await fetch(`${apiBase}/api/status`, { cache: "no-store" });
            if (resp.ok) {
                statusBadge.innerHTML = `<span class="dot-online"></span> Python REST API Online (Port 5000)`;
                statusBadge.className = "engine-health-badge badge-online";
            }
        } catch (e) {
            statusBadge.innerHTML = `<span class="dot-offline"></span> Standalone Client Mode (Python offline)`;
            statusBadge.className = "engine-health-badge badge-client";
        }
    }
});
