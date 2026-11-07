/**
 * Campus Water-Pipeline Fault Isolation Tool
 * Interactive SVG Network Graph Visualizer
 * 
 * Supports:
 * - Fluid pan & zoom controls
 * - Interactive node dragging
 * - Click-to-select faulty pipelines and endpoints
 * - Animated water flow direction particles
 * - Burst / rupture animations on faulty pipes
 * - Dynamic color transitions:
 *    * Blue: Normal pressurized pipelines
 *    * Red: Ruptured / Faulty pipeline
 *    * Orange: Isolation valves (open / rotating)
 *    * Crimson / Lock: Boundary closed valves
 *    * Green: Operational buildings receiving water
 *    * Grey / Red Slash: Affected buildings without water
 *    * Dark Blue: Main Water Tower
 */

class NetworkVisualizer {
    constructor(containerId, networkData, onPipeClick, onNodeClick) {
        this.container = document.getElementById(containerId);
        this.data = networkData;
        this.onPipeClick = onPipeClick;
        this.onNodeClick = onNodeClick;

        this.nodes = JSON.parse(JSON.stringify(networkData.nodes));
        this.pipelines = JSON.parse(JSON.stringify(networkData.pipelines));

        // State tracking
        this.selectedFault = null; // { u, v, pipeId }
        this.boundaryValves = new Set();
        this.closedValves = new Set();
        this.reachableNodes = new Set(Object.keys(this.nodes));
        this.visitedNodesPhase1 = new Set();
        this.highlightedEdges = new Set();
        this.simulationPhase = "NORMAL"; // NORMAL, FAULT, PHASE1_BFS, VALVES_CLOSED, PHASE2_BFS

        // Viewport Transform (Pan & Zoom)
        this.scale = 1.0;
        this.panX = 30;
        this.panY = 20;
        this.isPanning = false;
        this.startPan = { x: 0, y: 0 };

        // Node Dragging
        this.draggedNodeId = null;
        this.dragOffset = { x: 0, y: 0 };

        this.initSVG();
        this.setupEvents();
        this.render();
    }

    initSVG() {
        this.container.innerHTML = `
            <div class="visualizer-wrapper">
                <svg id="water-network-svg" class="network-svg" viewBox="0 0 1050 560" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <!-- Fluid Gradient for Pipes -->
                        <linearGradient id="pipe-water-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#38bdf8" />
                            <stop offset="50%" stop-color="#0284c7" />
                            <stop offset="100%" stop-color="#0369a1" />
                        </linearGradient>

                        <!-- Fault Rupture Gradient -->
                        <linearGradient id="fault-burst-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#ef4444" />
                            <stop offset="50%" stop-color="#b91c1c" />
                            <stop offset="100%" stop-color="#f87171" />
                        </linearGradient>

                        <!-- Dry / Deprived Gradient -->
                        <linearGradient id="dry-pipe-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#94a3b8" />
                            <stop offset="100%" stop-color="#64748b" />
                        </linearGradient>

                        <!-- Glow Filters -->
                        <filter id="glow-water" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="glow-fault" x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="glow-valve" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>

                        <!-- Arrow Marker -->
                        <marker id="flow-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1 L 8 5 L 0 9 z" fill="#0284c7" />
                        </marker>
                    </defs>

                    <g id="viewport-group" transform="translate(${this.panX}, ${this.panY}) scale(${this.scale})">
                        <!-- Background Grid -->
                        <g id="grid-layer" opacity="0.3"></g>
                        <!-- Pipelines Layer -->
                        <g id="pipes-layer"></g>
                        <!-- Water Flow Animations Layer -->
                        <g id="flow-layer"></g>
                        <!-- Nodes Layer -->
                        <g id="nodes-layer"></g>
                        <!-- Annotations & Labels Layer -->
                        <g id="overlay-layer"></g>
                    </g>
                </svg>

                <!-- Floating Canvas Controls -->
                <div class="canvas-controls">
                    <button class="ctrl-btn" id="btn-zoom-in" title="Zoom In">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    </button>
                    <button class="ctrl-btn" id="btn-zoom-out" title="Zoom Out">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    </button>
                    <button class="ctrl-btn" id="btn-zoom-reset" title="Reset View">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                    </button>
                </div>

                <!-- Hover Tooltip -->
                <div id="graph-tooltip" class="graph-tooltip hidden"></div>
            </div>
        `;

        this.svg = document.getElementById("water-network-svg");
        this.viewportGroup = document.getElementById("viewport-group");
        this.pipesLayer = document.getElementById("pipes-layer");
        this.flowLayer = document.getElementById("flow-layer");
        this.nodesLayer = document.getElementById("nodes-layer");
        this.overlayLayer = document.getElementById("overlay-layer");
        this.tooltip = document.getElementById("graph-tooltip");

        this.renderGrid();
    }

    renderGrid() {
        const grid = document.getElementById("grid-layer");
        let pathStr = "";
        for (let x = 0; x <= 1050; x += 40) {
            pathStr += `M ${x} 0 L ${x} 560 `;
        }
        for (let y = 0; y <= 560; y += 40) {
            pathStr += `M 0 ${y} L 1050 ${y} `;
        }
        grid.innerHTML = `<path d="${pathStr}" stroke="#cbd5e1" stroke-width="0.8" stroke-dasharray="2 4" />`;
    }

    setupEvents() {
        // Zoom buttons
        document.getElementById("btn-zoom-in").addEventListener("click", () => this.zoom(1.2));
        document.getElementById("btn-zoom-out").addEventListener("click", () => this.zoom(0.8));
        document.getElementById("btn-zoom-reset").addEventListener("click", () => this.resetView());

        // Mouse wheel zoom
        this.svg.addEventListener("wheel", (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            this.zoom(factor);
        }, { passive: false });

        // Pan with mouse drag
        this.svg.addEventListener("mousedown", (e) => {
            if (e.target.closest(".node-group")) return; // Don't pan if dragging a node
            this.isPanning = true;
            this.startPan = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            this.svg.style.cursor = "grabbing";
        });

        window.addEventListener("mousemove", (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.startPan.x;
                this.panY = e.clientY - this.startPan.y;
                this.updateTransform();
            } else if (this.draggedNodeId) {
                const pt = this.getSVGCoordinates(e);
                this.nodes[this.draggedNodeId].x = Math.max(30, Math.min(1000, pt.x - this.dragOffset.x));
                this.nodes[this.draggedNodeId].y = Math.max(30, Math.min(520, pt.y - this.dragOffset.y));
                this.render();
            }
        });

        window.addEventListener("mouseup", () => {
            this.isPanning = false;
            this.draggedNodeId = null;
            if (this.svg) this.svg.style.cursor = "default";
        });
    }

    getSVGCoordinates(e) {
        const rect = this.svg.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const matrix = this.viewportGroup.getCTM();
        if (!matrix) return { x: clientX, y: clientY };
        const pt = this.svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        return pt.matrixTransform(matrix.inverse());
    }

    zoom(factor) {
        this.scale = Math.max(0.5, Math.min(2.5, this.scale * factor));
        this.updateTransform();
    }

    resetView() {
        this.scale = 1.0;
        this.panX = 30;
        this.panY = 20;
        this.updateTransform();
    }

    updateTransform() {
        this.viewportGroup.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
    }

    setSimulationState(state) {
        this.simulationPhase = state.phase || "NORMAL";
        this.selectedFault = state.fault || null;
        this.activeNode = state.activeNode || state.currentNode || null;
        this.boundaryValves = new Set(state.boundaryValves || []);
        this.closedValves = new Set(state.closedValves || []);
        this.reachableNodes = new Set(state.reachableNodes || Object.keys(this.nodes));
        this.visitedNodesPhase1 = new Set(state.visitedNodesPhase1 || state.visitedNodes || []);
        this.highlightedEdges = new Set(state.highlightedEdges || []);
        this.render();
    }

    render() {
        this.renderPipelines();
        this.renderNodes();
    }

    renderPipelines() {
        let pipesHtml = "";
        let flowHtml = "";

        for (const pipe of this.pipelines) {
            const u = this.nodes[pipe.u];
            const v = this.nodes[pipe.v];
            if (!u || !v) continue;

            const isFaulty = this.selectedFault &&
                ((this.selectedFault.u === pipe.u && this.selectedFault.v === pipe.v) ||
                    (this.selectedFault.u === pipe.v && this.selectedFault.v === pipe.u) ||
                    (this.selectedFault.pipeId === pipe.id));

            const isHighlighted = this.highlightedEdges.has(pipe.id);
            const isIsolated = this.closedValves.size > 0 && isFaulty;

            // Determine if water flows through this pipe in Phase 2
            const isWaterFlowing = !isFaulty &&
                this.reachableNodes.has(pipe.u) &&
                this.reachableNodes.has(pipe.v) &&
                !(this.closedValves.has(pipe.u) && this.closedValves.has(pipe.v));

            let pipeClass = "pipeline-line";
            let strokeColor = "#0284c7"; // normal water blue
            let strokeWidth = Math.max(4, Math.round(pipe.dia / 40));
            let dashArray = "none";
            let filter = "";

            if (isFaulty) {
                pipeClass += " pipeline-faulty";
                strokeColor = "#ef4444"; // bright red
                strokeWidth += 3;
                filter = 'filter="url(#glow-fault)"';
            } else if (isHighlighted) {
                strokeColor = "#f59e0b"; // glowing amber
                strokeWidth += 2;
                filter = 'filter="url(#glow-valve)"';
            } else if (this.simulationPhase === "PHASE2_BFS" || this.simulationPhase === "COMPLETE") {
                if (!isWaterFlowing) {
                    pipeClass += " pipeline-dry";
                    strokeColor = "#94a3b8"; // grey dried up
                    strokeWidth = 3;
                    dashArray = "4,4";
                }
            }

            // Pipe base line
            pipesHtml += `
                <g class="pipe-group" data-pipe-id="${pipe.id}" data-u="${pipe.u}" data-v="${pipe.v}">
                    <!-- Invisible wide stroke for easier clicking -->
                    <line x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}"
                          stroke="transparent" stroke-width="22" class="pipe-hitbox" />
                    <!-- Visual pipe stroke -->
                    <line x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}"
                          stroke="${strokeColor}" stroke-width="${strokeWidth}"
                          stroke-dasharray="${dashArray}"
                          class="${pipeClass}" ${filter} />
                </g>
            `;

            // Pipe label in middle of line
            const midX = (u.x + v.x) / 2;
            const midY = (u.y + v.y) / 2;
            pipesHtml += `
                <g class="pipe-label-group" transform="translate(${midX}, ${midY})">
                    <rect x="-18" y="-9" width="36" height="18" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
                    <text x="0" y="3" text-anchor="middle" font-size="10" font-weight="700" fill="#475569">${pipe.id}</text>
                </g>
            `;

            // Active water flow particles
            if (isWaterFlowing && !isFaulty) {
                flowHtml += `
                    <line x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}"
                          stroke="#7dd3fc" stroke-width="${Math.max(2, strokeWidth - 2)}"
                          stroke-dasharray="8,12" stroke-linecap="round"
                          class="flow-pulse-animation" />
                `;
            }

            // Rupture burst icon if faulty
            if (isFaulty) {
                flowHtml += `
                    <g class="burst-marker-group" transform="translate(${midX}, ${midY})">
                        <circle cx="0" cy="0" r="16" class="burst-pulse-circle" />
                        <circle cx="0" cy="0" r="9" fill="#dc2626" />
                        <!-- Water leak burst rays -->
                        <path d="M -6 -6 L -14 -14 M 6 -6 L 14 -14 M -6 6 L -14 14 M 6 6 L 14 14 M 0 -8 L 0 -16 M 0 8 L 0 16"
                              stroke="#f87171" stroke-width="2.5" stroke-linecap="round" class="leak-spray-animation" />
                        <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="900" fill="#ffffff">!</text>
                    </g>
                `;
            }
        }

        this.pipesLayer.innerHTML = pipesHtml;
        this.flowLayer.innerHTML = flowHtml;

        // Pipe click & hover listeners
        this.pipesLayer.querySelectorAll(".pipe-group").forEach(el => {
            const pipeId = el.getAttribute("data-pipe-id");
            const u = el.getAttribute("data-u");
            const v = el.getAttribute("data-v");
            const pipe = this.pipelines.find(p => p.id === pipeId);

            el.addEventListener("click", () => {
                if (this.onPipeClick) this.onPipeClick(pipeId, u, v);
            });

            el.addEventListener("mouseenter", (e) => {
                this.showTooltip(e, `
                    <div class="tt-header">Pipeline: ${pipe.id} - ${pipe.label}</div>
                    <div class="tt-row"><span>Endpoints:</span> <strong>${u} ↔ ${v}</strong></div>
                    <div class="tt-row"><span>Diameter:</span> <strong>${pipe.dia} mm</strong></div>
                    <div class="tt-row"><span>Length:</span> <strong>${pipe.length} m</strong></div>
                    <div class="tt-row"><span>Design Flow:</span> <strong>${pipe.flow} L/min</strong></div>
                    <div class="tt-footer">Click to simulate fault on this pipeline</div>
                `);
            });

            el.addEventListener("mousemove", (e) => this.moveTooltip(e));
            el.addEventListener("mouseleave", () => this.hideTooltip());
        });
    }

    renderNodes() {
        let nodesHtml = "";

        for (const [nodeId, node] of Object.entries(this.nodes)) {
            const isReachable = this.reachableNodes.has(nodeId);
            const isVisitedPhase1 = this.visitedNodesPhase1.has(nodeId);
            const isBoundaryValve = this.boundaryValves.has(nodeId);
            const isClosedValve = this.closedValves.has(nodeId);
            const isActiveNode = (this.activeNode === nodeId);

            let activeHaloHtml = "";
            if (isActiveNode) {
                activeHaloHtml = `
                    <circle cx="0" cy="0" r="38" class="active-node-halo-pulse" />
                    <g transform="translate(0, -36)">
                        <rect x="-24" y="-8" width="48" height="16" rx="4" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" />
                        <text x="0" y="3.5" text-anchor="middle" font-size="8.5" font-weight="900" fill="#0f172a">ACTIVE</text>
                    </g>
                `;
            }

            let nodeHtml = "";

            if (node.type === "source") {
                // Water Tower Node
                nodeHtml = `
                    <g class="node-group node-source ${isActiveNode ? 'node-is-active' : ''}" data-id="${nodeId}" transform="translate(${node.x}, ${node.y})">
                        ${activeHaloHtml}
                        <!-- Ripple ring -->
                        <circle cx="0" cy="0" r="34" class="source-ripple-ring" />
                        <!-- Base reservoir circle -->
                        <circle cx="0" cy="0" r="26" fill="url(#pipe-water-grad)" stroke="#0369a1" stroke-width="3" filter="url(#glow-water)" />
                        <!-- Water Tower Icon SVG -->
                        <g transform="translate(-14, -14) scale(0.055)">
                            <path fill="#ffffff" d="M256 0C167.6 0 96 71.6 96 160c0 40.5 15.1 77.5 40 105.7V464c0 26.5 21.5 48 48 48h144c26.5 0 48-21.5 48-48V265.7c24.9-28.2 40-65.2 40-105.7C416 71.6 344.4 0 256 0zm-80 464V320h160v144H176z"/>
                        </g>
                        <!-- Badge Label -->
                        <rect x="-65" y="32" width="130" height="22" rx="11" fill="#0f172a" opacity="0.85" />
                        <text x="0" y="47" text-anchor="middle" font-size="11" font-weight="700" fill="#38bdf8">WATER TOWER</text>
                    </g>
                `;
            } else if (node.type === "valve") {
                // Valve Node (V1 - V4)
                let valveColor = "#f59e0b"; // Orange/Amber
                let valveStatusText = "VALVE OPEN";
                let valveAnimClass = "valve-open-spin";

                if (isClosedValve) {
                    valveColor = "#dc2626"; // Crimson
                    valveStatusText = "CLOSED (ISOLATED)";
                    valveAnimClass = "valve-locked";
                } else if (isBoundaryValve) {
                    valveColor = "#ea580c"; // Deep Amber
                    valveStatusText = "BOUNDARY VALVE";
                    valveAnimClass = "valve-boundary-alert";
                }

                nodeHtml = `
                    <g class="node-group node-valve ${isActiveNode ? 'node-is-active' : ''}" data-id="${nodeId}" transform="translate(${node.x}, ${node.y})">
                        ${activeHaloHtml}
                        <!-- Glow Aura -->
                        <circle cx="0" cy="0" r="22" fill="${valveColor}" opacity="0.25" class="${isBoundaryValve ? 'valve-beacon-aura' : ''}" />
                        <!-- Valve Body -->
                        <circle cx="0" cy="0" r="16" fill="#ffffff" stroke="${valveColor}" stroke-width="3" filter="url(#glow-valve)" />
                        
                        <!-- Valve bowtie graphic -->
                        <g class="${valveAnimClass}">
                            <polygon points="-8,-8 -8,8 0,0" fill="${valveColor}" />
                            <polygon points="8,-8 8,8 0,0" fill="${valveColor}" />
                            <circle cx="0" cy="0" r="3.5" fill="#1e293b" />
                        </g>

                        <!-- Lock Badge if closed -->
                        ${isClosedValve ? `
                            <g transform="translate(8, -16)">
                                <circle cx="5" cy="5" r="9" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
                                <path d="M3 5 V3.5 A2 2 0 0 1 7 3.5 V5 M2 5 H8 V8.5 H2 Z" fill="#ffffff" stroke="#ffffff" stroke-width="0.8" />
                            </g>
                        ` : ''}

                        <!-- Label -->
                        <rect x="-35" y="20" width="70" height="19" rx="9" fill="#1e293b" opacity="0.85" />
                        <text x="0" y="33" text-anchor="middle" font-size="10" font-weight="700" fill="#f8fafc">${node.id}</text>
                    </g>
                `;
            } else if (node.type === "junction") {
                // Junction Node (J1 - J5)
                const juncFill = isVisitedPhase1 ? "#f59e0b" : "#0284c7";
                nodeHtml = `
                    <g class="node-group node-junction ${isActiveNode ? 'node-is-active' : ''}" data-id="${nodeId}" transform="translate(${node.x}, ${node.y})">
                        ${activeHaloHtml}
                        <!-- Visited aura ring -->
                        ${isVisitedPhase1 ? `<circle cx="0" cy="0" r="20" fill="none" stroke="#fcd34d" stroke-width="2" stroke-dasharray="3 3" />` : ''}
                        <circle cx="0" cy="0" r="14" fill="#ffffff" stroke="${juncFill}" stroke-width="3" />
                        <circle cx="0" cy="0" r="7" fill="${juncFill}" />
                        <text x="0" y="25" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">${node.id}</text>
                    </g>
                `;
            } else if (node.type === "building") {
                // Building Node (Hostel, Lab, Canteen, Academic, Library)
                const isSupplied = (this.simulationPhase === "NORMAL" || this.simulationPhase === "FAULT" || isReachable);
                const buildingBorder = isSupplied ? "#10b981" : "#ef4444";
                const badgeColor = isSupplied ? "#10b981" : "#64748b";
                const statusBadgeText = isSupplied ? "WATER ACTIVE" : "SUPPLY CUT OFF";

                nodeHtml = `
                    <g class="node-group node-building ${isSupplied ? 'building-supplied' : 'building-deprived'} ${isActiveNode ? 'node-is-active' : ''}"
                       data-id="${nodeId}" transform="translate(${node.x}, ${node.y})">
                        ${activeHaloHtml}
                        <!-- Card Background -->
                        <rect x="-65" y="-30" width="130" height="60" rx="10"
                              fill="#ffffff" stroke="${buildingBorder}" stroke-width="2.5"
                              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.08))" />

                        <!-- Droplet Water Indicator -->
                        <circle cx="-42" cy="0" r="14" fill="${isSupplied ? '#dcfce7' : '#fee2e2'}" />
                        ${isSupplied ? `
                            <!-- Water Droplet Icon -->
                            <path transform="translate(-48, -6) scale(0.6)" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
                                  fill="#10b981" stroke="#059669" stroke-width="1.5" />
                        ` : `
                            <!-- Slashed Droplet Icon -->
                            <path transform="translate(-48, -6) scale(0.6)" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
                                  fill="#ef4444" opacity="0.6" />
                            <line x1="-48" y1="6" x2="-36" y2="-6" stroke="#991b1b" stroke-width="2" />
                        `}

                        <!-- Building Name -->
                        <text x="14" y="-8" text-anchor="middle" font-size="11" font-weight="800" fill="#1e293b">${node.name}</text>
                        
                        <!-- Status Pill -->
                        <rect x="-24" y="5" width="80" height="16" rx="8" fill="${isSupplied ? '#ecfdf5' : '#fef2f2'}" stroke="${isSupplied ? '#a7f3d0' : '#fecaca'}" stroke-width="1" />
                        <text x="16" y="16.5" text-anchor="middle" font-size="8.5" font-weight="700" fill="${isSupplied ? '#047857' : '#b91c1c'}">${statusBadgeText}</text>
                    </g>
                `;
            }

            nodesHtml += nodeHtml;
        }

        this.nodesLayer.innerHTML = nodesHtml;

        // Node click & hover listeners
        this.nodesLayer.querySelectorAll(".node-group").forEach(el => {
            const nodeId = el.getAttribute("data-id");
            const node = this.nodes[nodeId];

            el.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                this.draggedNodeId = nodeId;
                const pt = this.getSVGCoordinates(e);
                this.dragOffset = { x: pt.x - node.x, y: pt.y - node.y };
            });

            el.addEventListener("click", () => {
                if (this.onNodeClick) this.onNodeClick(nodeId);
            });

            el.addEventListener("mouseenter", (e) => {
                let statusDetails = "";
                if (node.type === "building") {
                    const isSupplied = (this.simulationPhase === "NORMAL" || this.simulationPhase === "FAULT" || this.reachableNodes.has(nodeId));
                    statusDetails = `
                        <div class="tt-row"><span>Status:</span> <strong style="color: ${isSupplied ? '#10b981' : '#ef4444'}">${isSupplied ? 'Supplied (Operational)' : 'Isolated (Deprived)'}</strong></div>
                        <div class="tt-row"><span>Demand:</span> <strong>${node.demand} m³/day</strong></div>
                        <div class="tt-row"><span>Occupancy:</span> <strong>${node.occupancy} persons</strong></div>
                    `;
                } else if (node.type === "valve") {
                    const isClosed = this.closedValves.has(nodeId);
                    statusDetails = `
                        <div class="tt-row"><span>State:</span> <strong style="color: ${isClosed ? '#ef4444' : '#f59e0b'}">${isClosed ? 'CLOSED (Boundary Locked)' : 'OPEN (Normal)'}</strong></div>
                        <div class="tt-row"><span>Role:</span> <strong>${node.description}</strong></div>
                    `;
                } else if (node.type === "source") {
                    statusDetails = `
                        <div class="tt-row"><span>Reservoir Head:</span> <strong>35 meters (3.5 bar)</strong></div>
                        <div class="tt-row"><span>Capacity:</span> <strong>500,000 Liters</strong></div>
                    `;
                }

                this.showTooltip(e, `
                    <div class="tt-header">${node.name} (${nodeId})</div>
                    <div class="tt-type">Type: ${node.type.toUpperCase()}</div>
                    <div class="tt-desc">${node.description}</div>
                    ${statusDetails}
                    <div class="tt-footer">Drag node to reposition layout</div>
                `);
            });

            el.addEventListener("mousemove", (e) => this.moveTooltip(e));
            el.addEventListener("mouseleave", () => this.hideTooltip());
        });
    }

    showTooltip(e, html) {
        this.tooltip.innerHTML = html;
        this.tooltip.classList.remove("hidden");
        this.moveTooltip(e);
    }

    moveTooltip(e) {
        const containerRect = this.container.getBoundingClientRect();
        let left = e.clientX - containerRect.left + 15;
        let top = e.clientY - containerRect.top + 15;

        // Keep inside container bounds
        if (left + 260 > containerRect.width) left = e.clientX - containerRect.left - 270;
        if (top + 180 > containerRect.height) top = e.clientY - containerRect.top - 190;

        this.tooltip.style.left = `${Math.max(10, left)}px`;
        this.tooltip.style.top = `${Math.max(10, top)}px`;
    }

    hideTooltip() {
        this.tooltip.classList.add("hidden");
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = NetworkVisualizer;
}

