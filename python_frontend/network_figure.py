"""
Campus Water-Pipeline Fault Isolation Tool - network drawing for the Streamlit front end.

Builds a Plotly figure of the campus water network for one moment of the simulation:
which pipe is broken, which nodes the BFS has visited, which valves are closed and which
buildings are supplied, cut off, or not checked yet.
"""

import plotly.graph_objects as go

# Colours shared with the HTML version of the site
BLUE = "#0284c7"
LIGHT_BLUE = "#38bdf8"
RED = "#ef4444"
DARK_RED = "#dc2626"
AMBER = "#f59e0b"
DEEP_AMBER = "#ea580c"
GREEN = "#10b981"
GREY = "#94a3b8"
NAVY = "#0f172a"

BUILDING_STYLE = {
    "supplied": {"color": GREEN, "fill": "#ecfdf5", "label": "WATER ACTIVE"},
    "cut": {"color": RED, "fill": "#fef2f2", "label": "SUPPLY CUT OFF"},
    "checking": {"color": GREY, "fill": "#f8fafc", "label": "CHECKING…"},
}


def building_status(node_id, view):
    """'supplied', 'cut' or 'checking' for a building in the current view."""
    stage = view["stage"]
    reached = node_id in view["reachable"]
    if stage == "PHASE2_RUNNING":
        return "supplied" if reached else "checking"
    if stage == "COMPLETE":
        return "supplied" if reached else "cut"
    return "supplied"


def _is_fault(pipe, fault):
    return fault is not None and pipe["id"] == fault["id"]


def build_figure(nodes, pipelines, view, height=520):
    """
    view keys:
      stage        NORMAL | FAULT | PHASE1_RUNNING | VALVES_CLOSED | PHASE2_RUNNING | COMPLETE
      fault        the broken pipe dict, or None
      active       node currently being expanded by BFS, or None
      highlight    pipe ids highlighted in this BFS step
      visited      nodes visited by the 1st BFS (shown as rings)
      boundary     valves found / selected by the 1st BFS
      closed       valves that are closed
      reachable    nodes reached by the 2nd BFS
    """
    fig = go.Figure()
    fault = view.get("fault")
    stage = view["stage"]
    closed = set(view.get("closed", []))
    reachable = set(view.get("reachable", []))
    highlight = set(view.get("highlight", []))

    # ---------- pipes ----------
    for pipe in pipelines:
        u, v = nodes[pipe["u"]], nodes[pipe["v"]]
        flowing = (
            not _is_fault(pipe, fault)
            and pipe["u"] in reachable
            and pipe["v"] in reachable
            and not (pipe["u"] in closed and pipe["v"] in closed)
        )
        color, width, dash = BLUE, max(3, pipe["dia"] / 50), "solid"
        if _is_fault(pipe, fault):
            color, width = RED, 9
        elif pipe["id"] in highlight:
            color, width = AMBER, 8
        elif stage in ("PHASE2_RUNNING", "COMPLETE") and flowing:
            color, width = LIGHT_BLUE, width + 2
        elif stage == "COMPLETE" and not flowing:
            color, width, dash = GREY, 3, "dash"

        fig.add_trace(go.Scatter(
            x=[u["x"], v["x"]], y=[-u["y"], -v["y"]],
            mode="lines", line=dict(color=color, width=width, dash=dash),
            hoverinfo="skip", showlegend=False,
        ))

    # Pipe labels at the midpoints (also the click targets for choosing a pipe)
    mid_x, mid_y, labels, hovers, ids, colors = [], [], [], [], [], []
    for pipe in pipelines:
        u, v = nodes[pipe["u"]], nodes[pipe["v"]]
        mid_x.append((u["x"] + v["x"]) / 2)
        mid_y.append(-(u["y"] + v["y"]) / 2)
        labels.append(pipe["id"])
        ids.append(pipe["id"])
        colors.append(RED if _is_fault(pipe, fault) else "#ffffff")
        hovers.append(
            f"<b>{pipe['id']}: {pipe['label']}</b><br>{pipe['u']} ↔ {pipe['v']}<br>"
            f"Diameter {pipe['dia']} mm · Length {pipe['length']} m<br>Click to break this pipe"
        )
    fig.add_trace(go.Scatter(
        x=mid_x, y=mid_y, mode="markers+text", text=labels, customdata=ids,
        textfont=dict(size=10, color="#334155"), textposition="middle center",
        marker=dict(symbol="square", size=26, color=colors, line=dict(color="#cbd5e1", width=1)),
        hovertext=hovers, hoverinfo="text", showlegend=False, name="pipes",
    ))

    # ---------- nodes ----------
    def add_nodes(ids_, symbol, size, fill, border, text, text_pos, hover, border_width=3, text_color=NAVY):
        fig.add_trace(go.Scatter(
            x=[nodes[i]["x"] for i in ids_], y=[-nodes[i]["y"] for i in ids_],
            mode="markers+text", text=text, textposition=text_pos,
            textfont=dict(size=11, color=text_color, family="Arial, Helvetica, sans-serif", weight="bold"),
            marker=dict(symbol=symbol, size=size, color=fill, line=dict(color=border, width=border_width)),
            hovertext=hover, hoverinfo="text", showlegend=False,
        ))

    for nid, node in nodes.items():
        kind = node["type"]
        hover = f"<b>{node['name']} ({nid})</b><br>Type: {kind}"
        if kind == "source":
            add_nodes([nid], "circle", 38, BLUE, "#0369a1", ["WATER TOWER"], "bottom center", [hover + "<br>Where all the water comes from"])
        elif kind == "junction":
            ring = AMBER if nid in view.get("visited", []) and stage == "PHASE1_RUNNING" else BLUE
            add_nodes([nid], "circle", 20, "#ffffff", ring, [nid], "bottom center", [hover])
        elif kind == "valve":
            if nid in closed:
                color, state = DARK_RED, "CLOSED"
            elif nid in view.get("boundary", []):
                color, state = DEEP_AMBER, "valve to close"
            else:
                color, state = AMBER, "open"
            label = f"{nid} 🔒" if nid in closed else nid
            add_nodes([nid], "bowtie", 26, color, "#ffffff", [label], "bottom center", [f"{hover}<br>State: {state}"], border_width=2)
        elif kind == "building":
            status = building_status(nid, view)
            style = BUILDING_STYLE[status]
            add_nodes([nid], "square", 34, style["fill"], style["color"],
                      [f"{node['name']}<br>{style['label']}"], "top center",
                      [f"{hover}<br>Demand: {node.get('demand', '?')} m³/day<br>Status: {style['label']}"],
                      text_color=style["color"] if status != "supplied" else "#065f46")

    # Burst marker on the broken pipe
    if fault is not None:
        u, v = nodes[fault["u"]], nodes[fault["v"]]
        vertical = abs(u["x"] - v["x"]) < abs(u["y"] - v["y"])
        dx, dy = (48, 0) if vertical else (0, 24)  # keep the label clear of the pipe-ID box
        fig.add_trace(go.Scatter(
            x=[(u["x"] + v["x"]) / 2 + dx], y=[-(u["y"] + v["y"]) / 2 + dy], mode="text", text=["💥 BURST"],
            textfont=dict(size=12, color=DARK_RED, family="Arial, Helvetica, sans-serif", weight="bold"), hoverinfo="skip", showlegend=False,
        ))

    # Ring around the node BFS is expanding right now
    active = view.get("active")
    if active:
        fig.add_trace(go.Scatter(
            x=[nodes[active]["x"]], y=[-nodes[active]["y"]], mode="markers+text", text=["ACTIVE"],
            textposition="top center", textfont=dict(size=10, color=DEEP_AMBER, family="Arial, Helvetica, sans-serif", weight="bold"),
            marker=dict(symbol="circle-open", size=50, color=AMBER, line=dict(width=4)),
            hoverinfo="skip", showlegend=False,
        ))

    xs = [n["x"] for n in nodes.values()]
    ys = [-n["y"] for n in nodes.values()]
    fig.update_layout(
        height=height, margin=dict(l=10, r=10, t=10, b=10),
        plot_bgcolor="#f8fbff", paper_bgcolor="#ffffff",
        xaxis=dict(visible=False, range=[min(xs) - 70, max(xs) + 110], fixedrange=False),
        yaxis=dict(visible=False, range=[min(ys) - 70, max(ys) + 55], scaleanchor="x", scaleratio=1),
        dragmode="pan", clickmode="event+select", hoverlabel=dict(bgcolor=NAVY, font_color="#f8fafc"), font=dict(family="Arial, Helvetica, sans-serif"),
    )
    return fig
