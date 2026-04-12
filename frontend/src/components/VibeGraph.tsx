// Infinite canvas vibe graph — pan with drag, zoom with scroll.
// The SVG fills the full viewport; all content lives inside a
// pan+zoom <g> transform. No viewBox clipping.
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { roots, BubbleNodeDef } from '@/data/graphNodes';

interface VibeGraphProps {
  selectedNodes: string[];
  onToggleNode: (id: string) => void;
  onClearSelections: () => void;
  resetKey?: number;
}

// Content coordinate space: 1600 × 900
const CX = 800, CY = 450;
type Pt = { x: number; y: number };
type View = { x: number; y: number; scale: number };
type DragTarget = { id: string; startClient: Pt; startPos: Pt; moved: boolean };

const EDGES: [string, string][] = [
  ['genre', 'mood'], ['mood', 'tempo'],
  ['genre', 'key'],  ['tempo', 'vocals'],
  ['key', 'energy'], ['vocals', 'texture'],
  ['energy', 'texture'], ['texture', 'genre'],
];

const ROOT_RING = 268;
const ROOT_R  = 82;
const L1_R    = 37;
const L2_R    = 30;
const L1_DIST = 244;
const L2_BASE = 168;
const DENSE   = 6;

const OH = 25, OS = 95, OL = 55;

function polar(cx: number, cy: number, r: number, a: number): Pt {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}
function outwardAngle(rx: number, ry: number) {
  return Math.atan2(ry - CY, rx - CX);
}
function inwardAngle(rx: number, ry: number) {
  return Math.atan2(CY - ry, CX - rx);
}

function normalizeAngle(angle: number) {
  const twoPi = Math.PI * 2;
  let next = angle % twoPi;
  if (next < 0) next += twoPi;
  return next;
}

function perimeterArcPath(a: Pt, b: Pt, radius: number) {
  const start = normalizeAngle(Math.atan2(a.y - CY, a.x - CX));
  const end = normalizeAngle(Math.atan2(b.y - CY, b.x - CX));
  const delta = (end - start + Math.PI * 2) % (Math.PI * 2);
  const sweepFlag = delta <= Math.PI ? 1 : 0;
  const largeArcFlag = delta <= Math.PI ? 0 : 1;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${b.x} ${b.y}`;
}

function getLabelLines(label: string, maxChars = 12) {
  const words = label.split(' ');
  if (words.length === 1 || label.length <= maxChars) return [label];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || current.length === 0) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function l1Positions(rp: Pt, angle: number, count: number) {
  if (count === 0) return [] as { angle: number; pos: Pt }[];
  const spread = Math.min(count * 0.28, 1.78);
  return Array.from({ length: count }, (_, i) => {
    const a = count === 1 ? angle : angle - spread / 2 + (spread / (count - 1)) * i;
    return { angle: a, pos: polar(rp.x, rp.y, L1_DIST, a) };
  });
}

function l2Positions(l1a: number, l1p: Pt, count: number) {
  if (count === 0) return [] as { angle: number; pos: Pt }[];
  const ring = count > DENSE ? L2_BASE * (1 + (count - DENSE) * 0.14) : L2_BASE * 1.06;
  if (count === 1) return [{ angle: l1a, pos: polar(l1p.x, l1p.y, ring, l1a) }];
  const spread = Math.min((L2_R * 3.7 * (count - 1)) / ring, count > DENSE ? 2.18 : 1.92);
  return Array.from({ length: count }, (_, i) => {
    const a = l1a - spread / 2 + (spread / (count - 1)) * i;
    return { angle: a, pos: polar(l1p.x, l1p.y, ring, a) };
  });
}

// ── NodeCircle ────────────────────────────────────────────────────────────────
interface NodeCircleProps {
  pos: Pt; r: number; hue: number;
  selected: boolean; hovered: boolean;
  label: string; fontSize: number;
  onClick: () => void; onHover: (v: boolean) => void;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
  delay?: number; kind?: 'l1' | 'l2'; floatSeed?: number;
}

function NodeCircle({ pos, r, hue, selected, hovered, label, fontSize, onClick, onHover, onPointerDown, delay = 0, kind = 'l2', floatSeed = 0 }: NodeCircleProps) {
  const fh = selected ? OH : hue;
  const fs = selected ? OS : kind === 'l1' ? 48 : 42;
  const fl = selected ? OL : hovered ? (kind === 'l1' ? 31 : 28) : (kind === 'l1' ? 24 : 21);
  const glow = selected ? hsl(OH, 95, 60) : hsl(hue, 72, 68);
  const lines = getLabelLines(label, kind === 'l1' ? 12 : 10);
  const lineGap = lines.length > 1 ? Math.max(10, fontSize * 0.95) : 0;
  const floatOffset = 4 + (floatSeed % 3);
  const floatDuration = 4.2 + (floatSeed % 5) * 0.45;
  const baseOpacity = 1;
  const labelColor = selected
    ? 'rgba(255,255,255,0.99)'
    : hovered
      ? 'rgba(255,255,255,0.97)'
      : 'rgba(255,255,255,0.95)';

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: [0, -floatOffset, 0] }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        scale: { type: 'spring', stiffness: 340, damping: 26, delay },
        opacity: { duration: 0.22, delay },
        y: { duration: floatDuration, repeat: Infinity, ease: 'easeInOut', delay: delay + floatSeed * 0.03 },
      }}
      style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer', opacity: baseOpacity }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerDown={onPointerDown}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {selected && (
        <circle cx={pos.x} cy={pos.y} r={r * 2.0}
          fill="none" stroke={hsl(OH, 88, 60, 0.26)} strokeWidth={1.4}
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }} />
      )}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={r * 1.18}
        fill={kind === 'l1' ? hsl(hue, 72, 62, 0.07) : hsl(hue, 68, 58, 0.05)}
        style={{ pointerEvents: 'none', filter: `blur(${kind === 'l1' ? 4 : 3}px)` }}
      />
      {hovered && !selected && (
        <circle cx={pos.x} cy={pos.y} r={r * 1.7} fill={hsl(hue, 55, 40, 0.11)} />
      )}
        <circle cx={pos.x} cy={pos.y} r={r}
          fill={hsl(fh, fs, fl)}
        stroke={hsl(fh, fs + 8, selected ? 78 : hovered ? 68 : 54)}
        strokeWidth={selected ? 1.3 : kind === 'l1' ? 1 : 0.8}
        style={{
          filter: selected
            ? `drop-shadow(0 0 18px ${glow}) drop-shadow(0 14px 22px rgba(0,0,0,0.30))`
            : hovered
              ? `drop-shadow(0 0 8px ${hsl(hue, 58, 50, 0.32)}) drop-shadow(0 12px 18px rgba(0,0,0,0.24))`
              : 'drop-shadow(0 10px 16px rgba(0,0,0,0.18))',
          transition: 'fill 0.22s, filter 0.22s',
        }}
      />
      <ellipse
        cx={pos.x - r * 0.18}
        cy={pos.y - r * 0.22}
        rx={r * 0.48}
        ry={r * 0.22}
        fill="rgba(255,255,255,0.13)"
        opacity={0.9}
        transform={`rotate(-18 ${pos.x} ${pos.y})`}
        style={{ pointerEvents: 'none' }}
      />
      <circle
        cx={pos.x + r * 0.16}
        cy={pos.y + r * 0.18}
        r={r * 0.72}
        fill={hsl(fh, Math.max(18, fs - 10), Math.max(8, fl - 10), 0.18)}
        style={{ pointerEvents: 'none' }}
      />
      <circle cx={pos.x} cy={pos.y} r={r} fill="url(#sphere-gloss)" style={{ pointerEvents: 'none' }} />
      <text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontFamily="'Inter', sans-serif"
        fontWeight={selected || kind === 'l1' ? 600 : 500}
        fill={labelColor}
        style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.22s', letterSpacing: '-0.01em' }}
      >
        {lines.length === 1 ? (
          <tspan x={pos.x} dy="0.34em">{lines[0]}</tspan>
        ) : (
          lines.map((line, index) => (
            <tspan
              key={`${label}-${line}-${index}`}
              x={pos.x}
              dy={index === 0 ? `${-lineGap / 2}px` : `${lineGap}px`}
            >
              {line}
            </tspan>
          ))
        )}
      </text>
    </motion.g>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VibeGraph({ selectedNodes, onToggleNode, onClearSelections, resetKey }: VibeGraphProps) {
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [expandedL1s,   setExpandedL1s  ] = useState<Set<string>>(new Set());
  const [hovered,       setHovered      ] = useState<string | null>(null);
  const [dragging,      setDragging     ] = useState(false);
  const [nodePositions, setNodePositions] = useState<Record<string, Pt>>({});
  const dragRef = useRef<DragTarget | null>(null);
  const suppressClickRef = useRef<Set<string>>(new Set());

  // Infinite canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef    = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const viewRef   = useRef(view);
  viewRef.current = view;
  const panOrigin = useRef({ mx: 0, my: 0, vx: 0, vy: 0 });

  // Collapse all expanded bubbles when parent signals a reset
  useEffect(() => {
    if (resetKey === undefined) return;
    setExpandedRoots(new Set());
    setExpandedL1s(new Set());
    setNodePositions({});
  }, [resetKey]);

  const anyExpanded    = expandedRoots.size > 0;
  const selectionCount = selectedNodes.length;

  // Center and fit graph on mount
  const fitToScreen = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const vw = rect?.width ?? window.innerWidth;
    const vh = rect?.height ?? window.innerHeight;
    const paddingX = Math.max(80, vw * 0.08);
    const paddingY = Math.max(72, vh * 0.1);
    const s = Math.min((vw - paddingX * 2) / 1600, (vh - paddingY * 2) / 900);
    const scale = Math.max(0.3, s);
    setView({ x: (vw - 1600 * scale) / 2, y: (vh - 900 * scale) / 2, scale });
  }, []);

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  // Wheel zoom — centered on cursor
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setView(v => {
        const ns = Math.max(0.15, Math.min(5, v.scale * factor));
        return { scale: ns, x: mx - (mx - v.x) * (ns / v.scale), y: my - (my - v.y) * (ns / v.scale) };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Pan handlers on background rect
  const onBgDown = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    panOrigin.current = { mx: e.clientX, my: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
  }, []);

  const onBgMove = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    if (e.buttons !== 1 || dragRef.current) return;
    setView(v => ({
      ...v,
      x: panOrigin.current.vx + e.clientX - panOrigin.current.mx,
      y: panOrigin.current.vy + e.clientY - panOrigin.current.my,
    }));
  }, []);

  const onBgUp = useCallback(() => setDragging(false), []);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left - viewRef.current.x) / viewRef.current.scale,
      y: (clientY - rect.top - viewRef.current.y) / viewRef.current.scale,
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const active = dragRef.current;
      if (!active) return;
      const next = getSvgPoint(e.clientX, e.clientY);
      const dx = next.x - active.startClient.x;
      const dy = next.y - active.startClient.y;
      if (!active.moved && Math.hypot(dx, dy) > 4 / viewRef.current.scale) {
        active.moved = true;
        suppressClickRef.current.add(active.id);
      }
      setNodePositions(prev => ({
        ...prev,
        [active.id]: {
          x: active.startPos.x + dx,
          y: active.startPos.y + dy,
        },
      }));
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setTimeout(() => {
        suppressClickRef.current.clear();
      }, 0);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [getSvgPoint]);

  const startNodeDrag = useCallback((id: string, pos: Pt) => (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    const startClient = getSvgPoint(e.clientX, e.clientY);
    dragRef.current = { id, startClient, startPos: pos, moved: false };
  }, [getSvgPoint]);

  const guardedClick = useCallback((id: string, handler: () => void) => {
    if (suppressClickRef.current.has(id)) return;
    handler();
  }, []);

  function toggleRoot(id: string) {
    setExpandedRoots(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const root = roots.find(r => r.id === id);
        if (root) setExpandedL1s(el => {
          const el2 = new Set(el);
          root.children.forEach(c => el2.delete(c.id));
          return el2;
        });
      } else { next.add(id); }
      return next;
    });
  }

  function toggleL1(node: BubbleNodeDef) {
    if ((node.children ?? []).length > 0) {
      setExpandedL1s(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
    onToggleNode(node.id);
  }

  const layout = useMemo(() => {
    // Step 1: compute raw positions
    const rawLayout = roots.map((root, ri) => {
      const rootBase = polar(CX, CY, ROOT_RING, -Math.PI / 2 + (2 * Math.PI / roots.length) * ri);
      const rp = nodePositions[root.id] ?? rootBase;
      const outAngle = outwardAngle(rp.x, rp.y);
      const l1Pos = l1Positions(rp, outAngle, root.children.length);
      const l1Nodes = root.children.map((l1, li) => {
        const { angle: l1a, pos: l1Base } = l1Pos[li];
        const l1p = nodePositions[l1.id] ?? l1Base;
        const l2c = l1.children ?? [];
        const l2Pos = l2Positions(l1a, l1p, l2c.length);
        return {
          node: l1, pos: l1p, angle: l1a,
          l2: l2c.map((l2, l2i) => ({
            node: l2,
            pos: nodePositions[l2.id] ?? l2Pos[l2i].pos,
            angle: l2Pos[l2i].angle,
          })),
        };
      });
      return { root, rootPos: rp, outAngle, l1Nodes };
    });

    // Step 2: gather visible nodes for repulsion
    type RepNode = { id: string; x: number; y: number; r: number; fixed: boolean };
    const repNodes: RepNode[] = [];

    rawLayout.forEach(({ root, rootPos: rp, l1Nodes }) => {
      // Root nodes are always fixed — anchor the ring
      repNodes.push({ id: root.id, x: rp.x, y: rp.y, r: ROOT_R, fixed: true });
      if (expandedRoots.has(root.id)) {
        l1Nodes.forEach(({ node: l1, pos: l1p, l2 }) => {
          repNodes.push({ id: l1.id, x: l1p.x, y: l1p.y, r: L1_R, fixed: !!nodePositions[l1.id] });
          if (expandedL1s.has(l1.id)) {
            l2.forEach(({ node: l2n, pos: l2p }) => {
              repNodes.push({ id: l2n.id, x: l2p.x, y: l2p.y, r: L2_R, fixed: !!nodePositions[l2n.id] });
            });
          }
        });
      }
    });

    // Step 3: iterative repulsion — push overlapping nodes apart
    const PAD = 12;
    const ITERS = 40;
    const adj: Record<string, { x: number; y: number }> = {};
    repNodes.forEach(n => { adj[n.id] = { x: n.x, y: n.y }; });

    for (let iter = 0; iter < ITERS; iter++) {
      for (let i = 0; i < repNodes.length; i++) {
        for (let j = i + 1; j < repNodes.length; j++) {
          const a = repNodes[i];
          const b = repNodes[j];
          const pa = adj[a.id];
          const pb = adj[b.id];
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const minDist = a.r + b.r + PAD;
          if (dist < minDist) {
            const push = (minDist - dist) * 0.5;
            const nx = (dx / dist) * push;
            const ny = (dy / dist) * push;
            if (!a.fixed) { adj[a.id] = { x: pa.x - nx, y: pa.y - ny }; }
            if (!b.fixed) { adj[b.id] = { x: pb.x + nx, y: pb.y + ny }; }
          }
        }
      }
    }

    // Step 4: return layout with repulsion-adjusted positions
    return rawLayout.map(item => ({
      ...item,
      rootPos: adj[item.root.id] ?? item.rootPos,
      l1Nodes: item.l1Nodes.map(l1item => ({
        ...l1item,
        pos: adj[l1item.node.id] ?? l1item.pos,
        l2: l1item.l2.map(l2item => ({
          ...l2item,
          pos: adj[l2item.node.id] ?? l2item.pos,
        })),
      })),
    }));
  }, [nodePositions, expandedRoots, expandedL1s]);

  const rootPosMap = useMemo(() => {
    const m: Record<string, Pt> = {};
    layout.forEach(({ root, rootPos }) => { m[root.id] = rootPos; });
    return m;
  }, [layout]);

  const getViewportCenter = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      mx: (rect?.width ?? window.innerWidth) / 2,
      my: (rect?.height ?? window.innerHeight) / 2,
    };
  };

  return (
    <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden rounded-[28px] border border-sky-100/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_32px_80px_rgba(0,0,0,0.42)] before:absolute before:inset-0 before:z-[1] before:pointer-events-none before:bg-[radial-gradient(circle,rgba(255,255,255,0.055)_1px,transparent_1px)] before:bg-[size:32px_32px]"
      style={{
        background: 'radial-gradient(circle_at_top,rgba(110,156,255,0.12),rgba(36,65,140,0.06)_22%,rgba(6,10,22,0.18)_48%,rgba(2,5,14,0.72)_100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(121,163,255,0.1),transparent_24%),radial-gradient(circle_at_78%_22%,rgba(85,132,246,0.08),transparent_22%),radial-gradient(circle_at_50%_82%,rgba(78,111,196,0.07),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.035] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/24 to-transparent" />
      <svg ref={svgRef} className="w-full h-full" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="sphere-gloss" cx="38%" cy="32%" r="70%" fx="32%" fy="26%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.40)" />
            <stop offset="28%"  stopColor="rgba(255,255,255,0.11)" />
            <stop offset="62%"  stopColor="rgba(255,255,255,0.00)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </radialGradient>
          <radialGradient id="root-sphere-gloss" cx="36%" cy="30%" r="70%" fx="30%" fy="23%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.46)" />
            <stop offset="26%"  stopColor="rgba(255,255,255,0.13)" />
            <stop offset="58%"  stopColor="rgba(255,255,255,0.00)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.20)" />
          </radialGradient>
          <radialGradient id="fusion-gloss" cx="36%" cy="30%" r="68%" fx="30%" fy="24%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.46)" />
            <stop offset="32%"  stopColor="rgba(255,255,255,0.12)" />
            <stop offset="62%"  stopColor="rgba(255,255,255,0.00)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
          </radialGradient>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(249,115,22,0.07)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </radialGradient>
        </defs>

        {/* Background — catches all pan/drag gestures */}
        <rect
          width="100%" height="100%"
          fill="transparent"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onPointerDown={onBgDown}
          onPointerMove={onBgMove}
          onPointerUp={onBgUp}
        />

        {/* Canvas — everything inside this group pans and zooms freely */}
        <g transform={`translate(${view.x.toFixed(1)},${view.y.toFixed(1)}) scale(${view.scale.toFixed(4)})`}>

          {/* Subtle center bloom */}
          {selectionCount > 0 && (
            <circle cx={CX} cy={CY} r={380} fill="url(#center-glow)" />
          )}


          {/* Root → L1 lines */}
          {layout.map(({ root, rootPos: rp, l1Nodes }) =>
            expandedRoots.has(root.id) && l1Nodes.map(({ node: l1, pos: l1p }) => (
              <motion.line key={`rl1-${l1.id}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                x1={rp.x} y1={rp.y} x2={l1p.x} y2={l1p.y}
                stroke={hsl(root.hue, 52, 58, 0.22)}
                strokeWidth={0.9} />
            ))
          )}

          {/* L1 → L2 lines */}
          {layout.map(({ root, l1Nodes }) =>
            expandedRoots.has(root.id) && l1Nodes.map(({ node: l1, pos: l1p, l2 }) =>
              expandedL1s.has(l1.id) && l2.map(({ node: l2n, pos: l2p }) => (
                <motion.line key={`l1l2-${l2n.id}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  x1={l1p.x} y1={l1p.y} x2={l2p.x} y2={l2p.y}
                  stroke={hsl(root.hue, 46, 56, 0.16)}
                  strokeWidth={0.55} />
              ))
            )
          )}

          {/* Center fusion node */}
          <AnimatePresence>
            {selectionCount >= 2 && (
              <motion.g key="fusion"
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                style={{ transformOrigin: `${CX}px ${CY}px` }}
              >
                <circle cx={CX} cy={CY} r={60} fill="none" stroke={hsl(OH, 88, 55, 0.18)} strokeWidth={1.4}>
                  <animate attributeName="r" values="58;72;58" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.18;0.04;0.18" dur="2.6s" repeatCount="indefinite" />
                </circle>
                <circle cx={CX} cy={CY} r={48}
                  fill={hsl(20, 78, 12)} stroke={hsl(OH, 85, 54, 0.88)} strokeWidth={1.2}
                  style={{ filter: 'drop-shadow(0 0 32px rgba(249,115,22,0.55))' }} />
                <circle cx={CX} cy={CY} r={48} fill="url(#fusion-gloss)" style={{ pointerEvents: 'none' }} />
                <text x={CX} y={CY - 8} textAnchor="middle" dominantBaseline="central"
                  fontSize={19} fontFamily="'JetBrains Mono', monospace" fill={hsl(OH, 75, 88)} fontWeight={700}>
                  {selectionCount}
                </text>
                <text x={CX} y={CY + 15} textAnchor="middle" dominantBaseline="central"
                  fontSize={10} fontFamily="'Inter', sans-serif" fill={hsl(OH, 35, 65)}>
                  vibes
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* Root nodes */}
          {layout.map(({ root, rootPos: rp, l1Nodes }) => {
            const isExp  = expandedRoots.has(root.id);
            const dimmed = anyExpanded && !isExp;
            const H = root.hue;
            return (
              <g key={root.id}>
                <motion.g
                  style={{ transformOrigin: `${rp.x}px ${rp.y}px`, cursor: 'pointer' }}
                  whileHover={{ scale: 1.08 }}
                  onClick={() => guardedClick(root.id, () => toggleRoot(root.id))}
                  onPointerDown={startNodeDrag(root.id, rp)}
                  onMouseEnter={() => setHovered(root.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {isExp && (
                    <circle cx={rp.x} cy={rp.y} r={ROOT_R * 1.62}
                      fill="none" stroke={hsl(H, 62, 62, 0.28)}
                      strokeWidth={0.7} strokeDasharray="4 6">
                      <animateTransform attributeName="transform" type="rotate"
                        from={`0 ${rp.x} ${rp.y}`} to={`360 ${rp.x} ${rp.y}`} dur="12s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {!isExp && !dimmed && (
                    <circle cx={rp.x} cy={rp.y} r={ROOT_R * 1.45}
                      fill="none" stroke={hsl(H, 55, 58, 0.12)} strokeWidth={0.5}>
                      <animate attributeName="r"
                        values={`${ROOT_R*1.25};${ROOT_R*1.65};${ROOT_R*1.25}`} dur="4s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.12;0.03;0.12" dur="4s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={rp.x} cy={rp.y} r={ROOT_R}
                    fill={hsl(H, isExp ? 65 : 52, dimmed ? 18 : isExp ? 33 : 26)}
                    stroke={hsl(H, 62, dimmed ? 34 : isExp ? 72 : 60)}
                    strokeWidth={isExp ? 1.4 : 0.75}
                    style={{
                      filter: isExp
                        ? `drop-shadow(0 0 24px ${hsl(H, 72, 58, 0.64)}) drop-shadow(0 18px 28px rgba(0,0,0,0.28))`
                        : `drop-shadow(0 0 10px ${hsl(H, 50, 40, 0.22)}) drop-shadow(0 16px 22px rgba(0,0,0,0.22))`,
                      transition: 'fill 0.3s, stroke 0.3s, filter 0.3s',
                    }}
                  />
                  <circle cx={rp.x} cy={rp.y} r={ROOT_R} fill="url(#root-sphere-gloss)" style={{ pointerEvents: 'none' }} />
                  <text x={rp.x} y={rp.y - 8} textAnchor="middle" dominantBaseline="central"
                    fontSize={30} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {root.icon}
                  </text>
                  <text x={rp.x} y={rp.y + 28} textAnchor="middle" dominantBaseline="central"
                    fontSize={16} fontFamily="'Inter', sans-serif"
                    fontWeight={isExp ? 700 : 600}
                    fill={dimmed ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.96)'}
                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                    {root.label}
                  </text>
                </motion.g>

                {/* L1 children */}
                <AnimatePresence>
                  {isExp && l1Nodes.map(({ node: l1, pos: l1p, l2 }, li) => (
                    <g key={l1.id}>
                      <NodeCircle
                        pos={l1p} r={L1_R} hue={H}
                        selected={selectedNodes.includes(l1.id)} hovered={hovered === l1.id}
                        label={l1.label} fontSize={14.5}
                        delay={li * 0.038}
                        kind="l1"
                        floatSeed={li + 1}
                        onClick={() => guardedClick(l1.id, () => toggleL1(l1))}
                        onHover={(v) => setHovered(v ? l1.id : null)}
                        onPointerDown={startNodeDrag(l1.id, l1p)}
                      />
                      <AnimatePresence>
                        {expandedL1s.has(l1.id) && l2.map(({ node: l2n, pos: l2p }, l2i) => (
                          <NodeCircle key={l2n.id}
                            pos={l2p} r={L2_R} hue={H}
                            selected={selectedNodes.includes(l2n.id)} hovered={hovered === l2n.id}
                            label={l2n.label} fontSize={11.5}
                            delay={l2i * 0.032}
                            floatSeed={l2i + li * 7 + 3}
                            onClick={() => guardedClick(l2n.id, () => onToggleNode(l2n.id))}
                            onHover={(v) => setHovered(v ? l2n.id : null)}
                            onPointerDown={startNodeDrag(l2n.id, l2p)}
                            kind="l2"
                          />
                        ))}
                      </AnimatePresence>
                    </g>
                  ))}
                </AnimatePresence>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Canvas controls */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => setView(v => {
            const ns = Math.min(5, v.scale * 1.25);
            const { mx, my } = getViewportCenter();
            return { scale: ns, x: mx - (mx - v.x) * (ns / v.scale), y: my - (my - v.y) * (ns / v.scale) };
          })}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          className="w-7 h-7 rounded-md text-sm font-bold flex items-center justify-center hover:bg-white/10 transition-colors">
          +
        </button>
        <button
          onClick={() => setView(v => {
            const ns = Math.max(0.15, v.scale / 1.25);
            const { mx, my } = getViewportCenter();
            return { scale: ns, x: mx - (mx - v.x) * (ns / v.scale), y: my - (my - v.y) * (ns / v.scale) };
          })}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          className="w-7 h-7 rounded-md text-sm font-bold flex items-center justify-center hover:bg-white/10 transition-colors">
          −
        </button>
        <button
          onClick={fitToScreen}
          title="Fit to screen"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          className="w-7 h-7 rounded-md text-xs flex items-center justify-center hover:bg-white/10 transition-colors">
          ⊡
        </button>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />
        <button
          onClick={() => { setNodePositions({}); setExpandedRoots(new Set()); setExpandedL1s(new Set()); }}
          title="Reset positions"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          className="w-7 h-7 rounded-md text-xs flex items-center justify-center hover:bg-white/10 transition-colors">
          ↺
        </button>
        <button
          onClick={() => {
            setExpandedRoots(new Set());
            setExpandedL1s(new Set());
            onClearSelections();
          }}
          title="Clear selections"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          className="w-7 h-7 rounded-md text-xs flex items-center justify-center hover:bg-white/10 transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}
