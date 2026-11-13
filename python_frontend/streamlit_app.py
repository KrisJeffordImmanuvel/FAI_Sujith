"""
Campus Water-Pipeline Fault Isolation Tool - Python (Streamlit) front end.

Run from the project folder:
    pip install -r python_frontend/requirements.txt
    streamlit run python_frontend/streamlit_app.py

It uses the same BFS engine as the Python backend (backend/bfs_engine.py), so the
results are identical to the HTML/JavaScript version of the site.
"""

import os
import sys
import time
from datetime import datetime
from html import escape

import pandas as pd
import streamlit as st

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "backend"))

from bfs_engine import get_default_network, run_first_bfs, run_second_bfs  # noqa: E402
from network_figure import build_figure, building_status, BUILDING_STYLE  # noqa: E402

st.set_page_config(page_title="Campus Water BFS", page_icon="💧", layout="wide")

NODES, PIPES = get_default_network()
PIPE_BY_ID = {p["id"]: p for p in PIPES}
BUILDINGS = [n for n, d in NODES.items() if d["type"] == "building"]
VALVES = [n for n, d in NODES.items() if d["type"] == "valve"]

SCENARIOS = [
    {"title": "Water Tower Trunk Rupture", "tag": "Worst case", "pipe": "P1",
     "text": "P1 is the only pipe leaving the water tower and has no valve, so no valve can isolate it."},
    {"title": "Hostel Service Line Rupture", "tag": "Single building", "pipe": "P3",
     "text": "Valve V1 sits between the tower and the burst; closing it cuts off only the Hostel."},
    {"title": "Academic Block Lateral Rupture", "tag": "Shared valve", "pipe": "P14",
     "text": "Closing V4 stops the leak, but V4 also feeds the Library, so two buildings lose water."},
    {"title": "North-East Bypass Loop Rupture", "tag": "Looped pipe", "pipe": "P16",
     "text": "Water reroutes around the loop so no building loses supply, but no valve can stop the leak."},
]

STEPS = ["Select pipe", "Find boundary valves (1st BFS)", "Close valves", "Check supply (2nd BFS)", "Report"]
SPEEDS = {"Slow": 0.9, "Normal": 0.45, "Fast": 0.15, "Instant": 0.0}
PAGES = ["🏠 Dashboard", "🕹️ Simulation", "🔍 BFS Inspector", "📚 BFS Theory", "📋 Isolation Report", "👥 About"]


# ======================================================================
# State
# ======================================================================
def init_state():
    defaults = {
        "page": PAGES[0], "pipe_choice": None, "pipe": None, "stage": "NORMAL",
        "p1": None, "p2": None, "closed": [], "trace": "p1", "step": 0,
        "report_shown": False, "autoplay": [], "log": [], "worst": None, "speed": "Normal", "run_id": 0,
    }
    for key, value in defaults.items():
        st.session_state.setdefault(key, value)


def log(msg):
    st.session_state.log.insert(0, f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def pipe_label(pid):
    if pid is None:
        return "— choose a pipe —"
    p = PIPE_BY_ID[pid]
    return f"{pid}: {p['u']} ↔ {p['v']} ({p['label']})"


def reset_results():
    ss = st.session_state
    ss.p1, ss.p2, ss.closed = None, None, []
    ss.trace, ss.step, ss.report_shown, ss.autoplay = "p1", 0, False, []


# ---------------- workflow actions (used as button callbacks) ----------------
def select_pipe(pid):
    ss = st.session_state
    reset_results()
    ss.pipe, ss.pipe_choice = pid, pid
    ss.stage = "FAULT" if pid else "NORMAL"
    if pid:
        p = PIPE_BY_ID[pid]
        log(f"Step 1: pipe {pid} ({p['label']}) marked as burst between {p['u']} and {p['v']}.")


def on_pipe_dropdown():
    select_pipe(st.session_state.pipe_choice)


def step2_find_valves(animate=True):
    ss = st.session_state
    if not ss.pipe:
        st.toast("Step 1: choose a pipe first.", icon="⚠️")
        return
    p = PIPE_BY_ID[ss.pipe]
    ss.p1 = run_first_bfs(NODES, PIPES, p["u"], p["v"], p["id"])
    ss.run_id += 1
    ss.p2, ss.closed, ss.report_shown = None, [], False
    ss.stage, ss.trace = "PHASE1", "p1"
    ss.step = 0 if animate else len(ss.p1["steps"]) - 1
    if animate:
        ss.autoplay = ["p1"]
    if ss.p1["isolatable"]:
        log(f"Step 2: valves to close: {', '.join(ss.p1['boundary_valves'])}.")
    else:
        log("Step 2: the search reached the water tower without passing a valve, so no valve can isolate this pipe.")


def step3_close_valves():
    ss = st.session_state
    if not ss.p1:
        st.toast("Run Step 2 (Find boundary valves) first.", icon="⚠️")
        return
    ss.closed = list(ss.p1["boundary_valves"])
    ss.stage, ss.autoplay = "VALVES_CLOSED", []
    if ss.closed:
        log(f"Step 3: closed {', '.join(ss.closed)}. The burst pipe is cut off from the water tower.")
    else:
        log("Step 3: nothing closed. No valve stands between the water tower and this pipe.")
        st.toast("No valve can isolate this pipe, so nothing was closed.", icon="ℹ️")


def step4_check_supply(animate=True):
    ss = st.session_state
    if not ss.p1:
        st.toast("Complete Step 2 and Step 3 first.", icon="⚠️")
        return
    if ss.stage == "PHASE1":
        ss.closed = list(ss.p1["boundary_valves"])
    p = PIPE_BY_ID[ss.pipe]
    ss.p2 = run_second_bfs(NODES, PIPES, p["u"], p["v"], ss.closed)
    ss.run_id += 1
    ss.stage, ss.trace = "COMPLETE", "p2"
    ss.step = 0 if animate else len(ss.p2["steps"]) - 1
    if animate:
        ss.autoplay = ["p2"]
    log(f"Step 4: {len(ss.p2['affected_buildings'])} of {len(BUILDINGS)} buildings cut off; "
        f"leak {'stopped' if ss.p2['leak_isolated'] else 'NOT stopped'}.")


def step5_report():
    ss = st.session_state
    if not ss.p2:
        st.toast("Complete Steps 2–4 before Step 5: Report.", icon="⚠️")
        return
    ss.report_shown, ss.page, ss.autoplay = True, PAGES[4], []
    log("Step 5: isolation report generated.")


def full_simulation(pid=None):
    ss = st.session_state
    pid = pid or ss.pipe or "P3"
    animate = SPEEDS[ss.speed] > 0
    select_pipe(pid)
    step2_find_valves(animate=False)
    step3_close_valves()
    step4_check_supply(animate=False)
    ss.page = PAGES[1]
    if animate:
        ss.trace, ss.step, ss.autoplay = "p1", 0, ["p1", "p2"]


def reset_all():
    select_pipe(None)
    log("Network reset: all pipes and valves open.")


def on_graph_click():
    event = st.session_state.get("graph")
    try:
        points = event["selection"]["points"]
    except (KeyError, TypeError):
        return
    for point in points:
        pid = point.get("customdata")
        if isinstance(pid, list):
            pid = pid[0] if pid else None
        if pid in PIPE_BY_ID:
            select_pipe(pid)
            return


# ======================================================================
# Views
# ======================================================================
def progress():
    """(steps done, step in progress) for the 5-step indicator."""
    ss = st.session_state
    done, active = {"NORMAL": (0, 1), "FAULT": (1, 2), "PHASE1": (2, 3),
                    "VALVES_CLOSED": (3, 4), "COMPLETE": (4, 5)}[ss.stage]
    if ss.stage == "COMPLETE" and ss.report_shown:
        done, active = 5, 0
    return done, active


def step_view(trace, idx):
    """Graph state for step idx of the given BFS trace (or the current stage)."""
    ss = st.session_state
    fault = PIPE_BY_ID[ss.pipe] if ss.pipe else None
    view = {"stage": "NORMAL", "fault": fault, "active": None, "highlight": [], "visited": [],
            "boundary": [], "closed": [], "reachable": list(NODES), "step": None}
    if ss.stage == "NORMAL":
        return view
    if ss.stage == "FAULT":
        view["stage"] = "FAULT"
        return view
    if ss.stage == "VALVES_CLOSED":
        view.update(stage="VALVES_CLOSED", boundary=ss.closed, closed=ss.closed)
        return view

    steps = ss[trace]["steps"]
    idx = max(0, min(idx, len(steps) - 1))
    s = steps[idx]
    highlight = s.get("highlightEdges") or ([s["pipeline_id"]] if s.get("pipeline_id") else [])
    if trace == "p1":
        view.update(stage="PHASE1_RUNNING", active=s.get("currentNode"), highlight=highlight,
                    visited=s.get("visitedNodes", []), boundary=s.get("boundaryValves", []))
    else:
        last = idx == len(steps) - 1
        view.update(stage="COMPLETE" if last else "PHASE2_RUNNING", closed=ss.closed,
                    boundary=ss.closed, reachable=s.get("reachableNodes", []),
                    active=None if last else s.get("currentNode"), highlight=[] if last else highlight)
    view["step"] = s
    return view


def badges(items, color="blue"):
    return " ".join(f":{color}-badge[{escape(str(i))}]" for i in items) if items else "_none_"


def render_step_details(view, container):
    s = view.get("step")
    with container.container():
        if not s:
            container_msg = {
                "NORMAL": "Step 1: choose a pipe in the sidebar (or click a pipe label on the graph).",
                "FAULT": "Pipe selected. Next: Step 2 – Find boundary valves.",
                "VALVES_CLOSED": "Valves closed. Next: Step 4 – Check supply.",
            }.get(st.session_state.stage, "")
            st.info(container_msg)
            return
        st.info(f"**{s.get('action', '').replace('_', ' ')}** — {s.get('message', '')}")
        c1, c2, c3 = st.columns(3)
        queue = s.get("queue_snapshot", [])
        c1.markdown("**📥 FIFO queue** (head → tail)")
        c1.markdown(badges(queue, "orange"))
        visited = s.get("visitedNodes") or s.get("reachableNodes") or []
        c2.markdown(f"**👁️ Visited** ({len(visited)})")
        c2.markdown(badges(visited, "blue"))
        order = s.get("traversalOrder", [])
        c3.markdown(f"**👣 Traversal order** ({len(order)})")
        c3.markdown(" → ".join(order) if order else "_none_")


def draw(view, chart_box, details_box, key):
    fig = build_figure(NODES, PIPES, view)
    if key == "graph":
        chart_box.plotly_chart(fig, key="graph", on_select=on_graph_click, selection_mode="points",
                               config={"displayModeBar": False, "scrollZoom": True})
    else:
        chart_box.plotly_chart(fig, key=key, config={"displayModeBar": False})
    render_step_details(view, details_box)


def legend():
    st.caption(
        "🟦 Normal pipe · 🟥 Burst pipe · 🟧 Open valve · 🔴🔒 Closed valve · "
        "🟩 Supplied building · ❌ Cut-off building · ⬜ Not checked yet (Step 4) · 💡 Click a pipe label to break it"
    )


# ---------------- pages ----------------
def page_dashboard():
    st.title("💧 Campus Water Distribution Dashboard")
    st.caption("Automated fault isolation and boundary valve discovery using two-phase Breadth-First Search (BFS) · Python front end")
    ss = st.session_state
    cols = st.columns(6)
    cols[0].metric("Network nodes", len(NODES))
    cols[1].metric("Pipelines", len(PIPES))
    cols[2].metric("Isolation valves", len(VALVES))
    cols[3].metric("Buildings", len(BUILDINGS))
    status = {"NORMAL": "Normal", "FAULT": "Fault", "PHASE1": "Valves found",
              "VALVES_CLOSED": "Valves closed", "COMPLETE": "Complete"}[ss.stage]
    cols[4].metric("Network status", status)
    cols[5].metric("Buildings cut off", len(ss.p2["affected_buildings"]) if ss.p2 else 0)

    st.subheader("🔬 Demonstration scenarios")
    for row_start in range(0, len(SCENARIOS), 2):
        row = st.columns(2)
        for col, sc in zip(row, SCENARIOS[row_start:row_start + 2]):
            p = PIPE_BY_ID[sc["pipe"]]
            r1 = run_first_bfs(NODES, PIPES, p["u"], p["v"], p["id"])
            r2 = run_second_bfs(NODES, PIPES, p["u"], p["v"], r1["boundary_valves"])
            with col.container(border=True):
                st.markdown(f":blue-badge[{sc['tag']}] **{sc['title']}** — `{p['id']}: {p['u']} ↔ {p['v']}`")
                st.write(sc["text"])
                st.caption(f"Valves closed: **{', '.join(r1['boundary_valves']) or 'None'}** · "
                           f"Buildings cut off: **{len(r2['affected_buildings'])} of {len(BUILDINGS)}** · "
                           f"Leak stopped: **{'Yes' if r2['leak_isolated'] else 'No'}**")
                st.button("Load & simulate", key=f"sc-{sc['pipe']}", on_click=full_simulation, args=(sc["pipe"],))

    st.subheader("🧮 Worst single fault")
    st.write("Breaks every pipe in turn and ranks the pipes by how many buildings lose water.")
    if st.button("Find worst single fault", type="primary"):
        rows = []
        for p in PIPES:
            r1 = run_first_bfs(NODES, PIPES, p["u"], p["v"], p["id"])
            r2 = run_second_bfs(NODES, PIPES, p["u"], p["v"], r1["boundary_valves"])
            rows.append({"Pipe": p["id"], "Endpoints": f"{p['u']} ↔ {p['v']}", "Label": p["label"],
                         "Valves closed": ", ".join(r1["boundary_valves"]) or "None",
                         "Buildings cut off": len(r2["affected_buildings"]),
                         "Which buildings": ", ".join(r2["affected_buildings"]),
                         "Leak stopped?": "Yes" if r2["leak_isolated"] else "No",
                         "BFS steps": len(r1["steps"]) + len(r2["steps"])})
        df = pd.DataFrame(rows)
        df["_num"] = df["Pipe"].str[1:].astype(int)
        df = df.sort_values(["Buildings cut off", "Leak stopped?", "_num"], ascending=[False, True, True]).drop(columns="_num")
        df.insert(0, "Rank", df["Buildings cut off"].rank(method="min", ascending=False).astype(int))
        ss.worst = df.reset_index(drop=True)
    if ss.worst is not None:
        df = ss.worst
        not_iso = df[df["Leak stopped?"] == "No"]["Pipe"].tolist()
        top = df[df["Rank"] == 1]["Pipe"].tolist()
        st.info(f"**Worst case:** {', '.join(top)} ({df.iloc[0]['Buildings cut off']} of {len(BUILDINGS)} buildings). "
                f"**Cannot be isolated by valves:** {len(not_iso)} of {len(df)} pipes ({', '.join(sorted(not_iso, key=lambda x: int(x[1:])))}).")
        st.dataframe(df, hide_index=True, width="stretch")
        pick = st.selectbox("Replay one of these on the map", df["Pipe"].tolist(), format_func=pipe_label)
        st.button("Simulate selected pipe", on_click=full_simulation, args=(pick,))


def page_simulation():
    ss = st.session_state
    st.title("🕹️ Interactive Campus Water Network Simulation")
    st.caption("Choose a pipe, then follow Steps 1–5 in the sidebar. Click a pipe label on the graph to break it.")

    trace_steps = None
    if ss.stage == "COMPLETE" and not ss.autoplay:
        choice = st.segmented_control(
            "Show BFS trace of", ["Step 2 – find valves", "Step 4 – check supply"],
            default="Step 4 – check supply" if ss.trace == "p2" else "Step 2 – find valves")
        new_trace = {"Step 2 – find valves": "p1", "Step 4 – check supply": "p2"}.get(choice, ss.trace)
        if new_trace != ss.trace:
            ss.trace, ss.step = new_trace, len(ss[new_trace]["steps"]) - 1
    if ss.stage in ("PHASE1", "COMPLETE"):
        trace_steps = ss[ss.trace]["steps"]

    chart_box = st.empty()
    legend()
    controls = st.container()
    details_box = st.empty()

    # Animation: play the queued BFS traces frame by frame
    if ss.autoplay and trace_steps is not None:
        delay = SPEEDS[ss.speed]
        for trace in list(ss.autoplay):
            steps = ss[trace]["steps"]
            start = ss.step if trace == ss.trace else 0
            for i in range(start, len(steps)):
                if delay == 0:
                    break
                draw(step_view(trace, i), chart_box, details_box, key=f"anim-{trace}-{i}-{time.time_ns()}")
                time.sleep(delay)
            ss.trace, ss.step = trace, len(steps) - 1
        ss.autoplay = []
        trace_steps = ss[ss.trace]["steps"]

    if trace_steps is not None:
        with controls:
            c1, c2 = st.columns([5, 1])
            ss.step = c1.slider(f"BFS step ({'Step 2' if ss.trace == 'p1' else 'Step 4'})", 1, len(trace_steps),
                                ss.step + 1, key=f"slider-{ss.trace}-{ss.run_id}") - 1
            if c2.button("▶ Replay", width="stretch"):
                ss.step, ss.autoplay = 0, [ss.trace]
                ss.run_id += 1
                st.rerun()

    view = step_view(ss.trace, ss.step)
    draw(view, chart_box, details_box, key="graph")

    if ss.stage == "COMPLETE" and view["stage"] == "COMPLETE":
        render_impact()


def render_impact():
    ss = st.session_state
    p1, p2 = ss.p1, ss.p2
    st.subheader(f"📊 Impact of this rupture — {pipe_label(ss.pipe)}")
    c = st.columns(4)
    cut = p2["affected_buildings"]
    c[0].metric("Buildings cut off", f"{len(cut)} / {len(BUILDINGS)}")
    c[0].caption(", ".join(NODES[b]["name"] for b in cut) or "None – every building is still supplied")
    c[1].metric("Valves closed", len(ss.closed))
    c[1].caption(", ".join(ss.closed) or "None – no valve stands between the tower and this pipe")
    c[2].metric("Leak stopped?", "Yes" if p2["leak_isolated"] else "No")
    c[2].caption("The burst pipe is cut off from the water tower" if p2["leak_isolated"]
                 else "Leak continues until the pipe is repaired or the tower is shut")
    c[3].metric("BFS steps taken", len(p1["steps"]) + len(p2["steps"]))
    c[3].caption(f"1st BFS: {len(p1['steps'])} + 2nd BFS: {len(p2['steps'])}")


def page_inspector():
    ss = st.session_state
    st.title("🔍 BFS Algorithm Inspector")
    if not ss.p1:
        st.info("Run Step 2 to see the BFS event log.")
    for key, title in (("p1", "Step 2 – first BFS (find the valves to close)"), ("p2", "Step 4 – second BFS (check supply)")):
        if ss.get(key):
            st.subheader(title)
            rows = [{"#": i + 1, "Action": s.get("action", ""), "Node": s.get("currentNode") or "",
                     "Queue (head → tail)": " ".join(s.get("queue_snapshot", [])), "Message": s.get("message", "")}
                    for i, s in enumerate(ss[key]["steps"])]
            st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
    if ss.log:
        st.subheader("📜 Activity log")
        st.code("\n".join(ss.log[:40]), language=None)


def page_theory():
    st.title("📚 BFS Algorithm Theory")
    st.markdown("""
**Graph model.** The campus network is an undirected, unweighted graph *G = (V, E)*: 1 water tower, 5 junctions,
4 valves (one on each building branch), 5 buildings, and 17 pipes. Every pipe counts as one hop; BFS ignores
pipe length, diameter and flow.

**What BFS finds.** BFS explores level by level using a FIFO queue, so it finds **the nearest valves that isolate
the rupture (fewest hops)**. It keeps only the valves on the **water-tower side** of the burst: no water reaches
the burst through the others, so closing them would be unnecessary. If the search reaches the water tower without
passing a valve, no valve can isolate that pipe and none is closed.

**What it does not do.** It does not simulate flow rates or pressure ("supplied" means *still connected to the
tower through open pipes*), and it cannot isolate a pipe that has no valve between it and the tower.

**Complexity:** time *O(V + E)*, space *O(V)*.
""")
    st.subheader("Step 2 – first BFS: find the valves to close")
    st.code("""FirstBFS(u, v):
    queue ← [u, v] (valve endpoints go straight into B); visited ← {u, v}
    if u or v is the water tower: return ∅            # cannot isolate
    while queue not empty:
        curr ← queue.pop_front()
        for each neighbour n of curr (not across the burst pipe):
            if n not visited:
                visited.add(n)
                if n is a valve:   B.add(n)           # stop this branch
                elif n is the tower: return ∅         # no valve between tower and burst
                else: queue.push_back(n)
    region ← visited minus valves
    return { b in B : tower reaches b without entering region }   # upstream valves only""", language=None)
    st.subheader("Step 4 – second BFS: check supply")
    st.code("""SecondBFS(closed):
    queue ← [WT]; reached ← {WT}
    while queue not empty:
        curr ← queue.pop_front()
        if curr in closed: continue                   # water stops at a closed valve
        for each neighbour n of curr (not across the burst pipe):
            if n not in reached: reached.add(n); queue.push_back(n)
    supplied ← buildings in reached;  cut off ← the other buildings""", language=None)


def report_html(data):
    rows = "".join(
        f"<tr><td>{escape(b['name'])}</td><td>{b['id']}</td><td>{b['demand']} m³/day</td>"
        f"<td style='color:{'#047857' if b['ok'] else '#b91c1c'};font-weight:700'>{'Supplied' if b['ok'] else 'Cut off'}</td></tr>"
        for b in data["buildings"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>Isolation Report {data['pipe']}</title>
<style>body{{font-family:Arial,sans-serif;max-width:820px;margin:30px auto;color:#1e293b}}h1{{color:#0369a1}}
table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}}
.k{{display:inline-block;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin:4px}}</style></head><body>
<h1>💧 Campus Water Network – Isolation Report</h1>
<p>Karunya Institute of Technology and Sciences · Fundamentals of AI (25DC204) · Generated {data['time']}</p>
<div class="k"><b>Burst pipe</b><br>{data['pipe']}: {data['ends']} ({escape(data['label'])})</div>
<div class="k"><b>Valves closed</b><br>{data['valves'] or 'None'}</div>
<div class="k"><b>Buildings cut off</b><br>{data['cut']} of {data['total']}</div>
<div class="k"><b>Leak stopped?</b><br>{'Yes' if data['leak'] else 'No – no valve between the tower and this pipe'}</div>
<h2>Step 2 – first BFS</h2><p>Traversal order: {' → '.join(data['order1'])}</p>
<h2>Step 4 – second BFS: building supply</h2><table><tr><th>Building</th><th>ID</th><th>Demand</th><th>Status</th></tr>{rows}</table>
<p style="color:#64748b;font-size:12px">Connectivity model only: flow rates and pressure are not simulated.</p></body></html>"""


def page_report():
    ss = st.session_state
    st.title("📋 Isolation Report")
    if not ss.p2:
        st.info("Complete Steps 1–4 (or run a full simulation), then press Step 5: Report.")
        return
    p = PIPE_BY_ID[ss.pipe]
    data = {
        "pipe": p["id"], "ends": f"{p['u']} ↔ {p['v']}", "label": p["label"],
        "valves": ", ".join(ss.closed), "cut": len(ss.p2["affected_buildings"]), "total": len(BUILDINGS),
        "leak": ss.p2["leak_isolated"], "order1": ss.p1["traversal_order"],
        "time": datetime.now().strftime("%d %b %Y, %H:%M"),
        "buildings": [{"id": b, "name": NODES[b]["name"], "demand": NODES[b].get("demand", "?"),
                       "ok": b in ss.p2["operational_buildings"]} for b in BUILDINGS],
    }
    st.caption(f"Karunya Institute of Technology and Sciences · Fundamentals of AI (25DC204) · Generated {data['time']}")
    c = st.columns(4)
    c[0].metric("Burst pipe", p["id"])
    c[0].caption(f"{p['u']} ↔ {p['v']}")
    c[1].metric("Valves closed", len(ss.closed))
    c[1].caption(data["valves"] or "None – cannot be isolated by valves")
    c[2].metric("Buildings cut off", f"{data['cut']} / {data['total']}")
    c[3].metric("Leak stopped?", "Yes" if data["leak"] else "No")
    st.subheader("Pipe details")
    st.write(f"**{p['label']}** · diameter {p['dia']} mm · length {p['length']} m · design flow {p['flow']} L/min (reference only)")
    st.subheader("Step 2 – first BFS")
    st.write(("Valves on the water-tower side: **" + data["valves"] + "**.") if ss.p1["isolatable"]
             else "The search reached the water tower without passing a valve, so no valve can isolate this pipe.")
    st.write("Traversal order: " + " → ".join(data["order1"]))
    st.subheader("Step 4 – second BFS: building supply")
    st.dataframe(pd.DataFrame([{"Building": b["name"], "ID": b["id"], "Daily demand (m³)": b["demand"],
                                "Status": "✅ Supplied" if b["ok"] else "❌ Cut off"} for b in data["buildings"]]),
                 hide_index=True, width="stretch")
    st.download_button("⬇️ Download report (HTML – open it and print to PDF)", report_html(data),
                       file_name=f"isolation-report-{p['id']}.html", mime="text/html", type="primary")


def page_about():
    st.title("👥 Project Details & Team")
    st.markdown("""
**Institution:** Karunya Institute of Technology and Sciences
**Course:** Fundamentals of Artificial Intelligence (25DC204) · **Academic year:** 2026–2027

| Team member | Role |
|---|---|
| Dabria Susan Sam | Algorithm & Graph Modeling |
| G Revanth Hari | Hydraulic Network Simulation |
| Sujith S. | Full-Stack Development & UI/UX |
| Leah Sasha V.L. | Testing & Analytical Reporting |

This Python front end is built with **Streamlit** and **Plotly** and calls the project's Python BFS engine
(`backend/bfs_engine.py`) directly. It is a connection model for teaching: it does not simulate flow or pressure.
""")


# ======================================================================
# Layout
# ======================================================================
def sidebar():
    ss = st.session_state
    with st.sidebar:
        st.markdown("## 💧 Campus Water BFS")
        st.caption("Pipe-burst isolation with Breadth-First Search")
        st.radio("Page", PAGES, key="page", label_visibility="collapsed")
        st.divider()
        st.markdown("**Guided BFS workflow**")
        done, active = progress()
        for i, name in enumerate(STEPS, start=1):
            mark = "✅" if i <= done else ("▶️" if i == active else "⚪")
            st.markdown(f"{mark} **{i}** · {name}")
        st.selectbox("Step 1: Select pipe", [None] + [p["id"] for p in PIPES], key="pipe_choice",
                     format_func=pipe_label, on_change=on_pipe_dropdown)
        st.button("Step 2: Find boundary valves", on_click=step2_find_valves, width="stretch")
        st.button("Step 3: Close valves", on_click=step3_close_valves, width="stretch")
        st.button("Step 4: Check supply", on_click=step4_check_supply, width="stretch")
        st.button("Step 5: Report", on_click=step5_report, width="stretch")
        c1, c2 = st.columns([3, 2])
        c1.button("⚡ Full simulation", on_click=full_simulation, type="primary", width="stretch")
        c2.button("🔄 Reset", on_click=reset_all, width="stretch")
        st.select_slider("Animation speed", list(SPEEDS), key="speed")
        st.caption("Engine: Python (backend/bfs_engine.py)")


def main():
    init_state()
    sidebar()
    page = st.session_state.page
    {
        PAGES[0]: page_dashboard, PAGES[1]: page_simulation, PAGES[2]: page_inspector,
        PAGES[3]: page_theory, PAGES[4]: page_report, PAGES[5]: page_about,
    }[page]()


main()
