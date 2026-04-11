// Infinite canvas vibe graph — pan with drag, zoom with scroll.
// The SVG fills the full viewport; all content lives inside a
// pan+zoom <g> transform. No viewBox clipping.
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { roots, BubbleNodeDef } from '@/data/graphNodes';

interface VibeGraphProps {
  selectedNodes: string[];
  onToggleNode: (id: string) => void;
}

// Content coordinate space: 1600 × 900
const CX = 800, CY = 450;
type Pt = { x: number; y: number };
type View = { x: number; y: number; scale: number };

const EDGES: [string, string][] = [
  ['genre', 'mood'], ['mood', 'tempo'],
  ['genre', 'key'],  ['tempo', 'vocals'],
  ['key', 'energy'], ['vocals', 'texture'],
  ['energy', 'texture'], ['texture', 'genre'],
];

const ROOT_RING = 258;
const ROOT_R  = 64;
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
  delay?: number; kind?: 'l1' | 'l2'; floatSeed?: number;
}

function NodeCircle({ pos, r, hue, selected, hovered, label, fontSize, onClick, onHover, delay = 0, kind = 'l2', floatSeed = 0 }: NodeCircleProps) {
  const fh = selected ? OH : hue;
  const fs = selected ? OS : kind === 'l1' ? 48 : 42;
  const fl = selected ? OL : hovered ? (kind === 'l1' ? 31 : 28) : (kind === 'l1' ? 24 : 21);
  const glow = selected ? hsl(OH, 95, 60) : hsl(hue, 70, 58);
  const lines = getLabelLines(label, kind === 'l1' ? 12 : 10);
  const lineGap = lines.length > 1 ? Math.max(10, fontSize * 0.95) : 0;
  const floatOffset = 4 + (floatSeed % 3);
  const floatDuration = 4.2 + (floatSeed % 5) * 0.45;
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
      style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {selected && (
        <circle cx={pos.x} cy={pos.y} r={r * 2.0}
          fill="none" stroke={hsl(OH, 88, 60, 0.26)} strokeWidth={1.4}
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }} />
      )}
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
export default function VibeGraph({ selectedNodes, onToggleNode }: VibeGraphProps) {
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [expandedL1s,   setExpandedL1s  ] = useState<Set<string>>(new Set());
  const [hovered,       setHovered      ] = useState<string | null>(null);
  const [dragging,      setDragging     ] = useState(false);

  // Infinite canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef    = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const viewRef   = useRef(view);
  viewRef.current = view;
  const panOrigin = useRef({ mx: 0, my: 0, vx: 0, vy: 0 });

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
    if (e.buttons !== 1) return;
    setView(v => ({
      ...v,
      x: panOrigin.current.vx + e.clientX - panOrigin.current.mx,
      y: panOrigin.current.vy + e.clientY - panOrigin.current.my,
    }));
  }, []);

  const onBgUp = useCallback(() => setDragging(false), []);

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

  const layout = useMemo(() => roots.map((root, ri) => {
    const rp = polar(CX, CY, ROOT_RING, -Math.PI / 2 + (2 * Math.PI / roots.length) * ri);
    const outAngle = outwardAngle(rp.x, rp.y);
    const l1Pos = l1Positions(rp, outAngle, root.children.length);
    const l1Nodes = root.children.map((l1, li) => {
      const { angle: l1a, pos: l1p } = l1Pos[li];
      const l2c = l1.children ?? [];
      const l2Pos = l2Positions(l1a, l1p, l2c.length);
      return {
        node: l1, pos: l1p, angle: l1a,
        l2: l2c.map((l2, l2i) => ({ node: l2, pos: l2Pos[l2i].pos, angle: l2Pos[l2i].angle })),
      };
    });
    return { root, rootPos: rp, outAngle, l1Nodes };
  }), []);

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
    <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_26%,rgba(4,6,12,0.2)_65%,rgba(4,6,12,0.48)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_32px_80px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.04] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/20 to-transparent" />
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

          {/* Skeleton edges along the outer ring */}
          {EDGES.map(([a, b]) => {
            const pa = rootPosMap[a], pb = rootPosMap[b];
            if (!pa || !pb) return null;
            const lit = expandedRoots.has(a) || expandedRoots.has(b);
            return (
              <path key={`e-${a}-${b}`}
                d={perimeterArcPath(pa, pb, ROOT_RING)}
                fill="none"
                stroke="rgba(255,255,255,1)"
                strokeWidth={0.7}
                strokeOpacity={lit ? 0.09 : 0.03}
                style={{ transition: 'stroke-opacity 0.4s' }} />
            );
          })}

          {/* Root → L1 lines */}
          {layout.map(({ root, rootPos: rp, l1Nodes }) =>
            expandedRoots.has(root.id) && l1Nodes.map(({ node: l1, pos: l1p }) => (
              <motion.line key={`rl1-${l1.id}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                x1={rp.x} y1={rp.y} x2={l1p.x} y2={l1p.y}
                stroke={hsl(root.hue, 52, 58, selectedNodes.includes(l1.id) ? 0.68 : 0.22)}
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
                  stroke={hsl(root.hue, 46, 56, selectedNodes.includes(l2n.id) ? 0.58 : 0.16)}
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
                  onClick={() => toggleRoot(root.id)}
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
                        ? `drop-shadow(0 0 24px ${hsl(H, 72, 58, 0.64)})`
                        : `drop-shadow(0 0 7px ${hsl(H, 50, 40, 0.18)})`,
                      transition: 'all 0.3s',
                    }}
                  />
                  <circle cx={rp.x} cy={rp.y} r={ROOT_R} fill="url(#root-sphere-gloss)" style={{ pointerEvents: 'none' }} />
                  <text x={rp.x} y={rp.y - 6} textAnchor="middle" dominantBaseline="central"
                    fontSize={25} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {root.icon}
                  </text>
                  <text x={rp.x} y={rp.y + 24} textAnchor="middle" dominantBaseline="central"
                    fontSize={13.5} fontFamily="'Inter', sans-serif"
                    fontWeight={isExp ? 700 : 600}
                    fill={dimmed ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.96)'}
                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                    {root.label}
                  </text>
                </motion.g>

                {/* L1 children */}
                <AnimatePresence>
                  {isExp && l1Nodes.map(({ node: l1, pos: l1p, angle: l1a, l2 }, li) => (
                    <g key={l1.id}>
                      <NodeCircle
                        pos={l1p} r={L1_R} hue={H}
                        selected={selectedNodes.includes(l1.id)} hovered={hovered === l1.id}
                        label={l1.label} fontSize={14.5}
                        delay={li * 0.038}
                        kind="l1"
                        floatSeed={li + 1}
                        onClick={() => toggleL1(l1)}
                        onHover={(v) => setHovered(v ? l1.id : null)}
                      />
                      <AnimatePresence>
                        {expandedL1s.has(l1.id) && l2.map(({ node: l2n, pos: l2p, angle: l2a }, l2i) => (
                          <NodeCircle key={l2n.id}
                            pos={l2p} r={L2_R} hue={H}
                            selected={selectedNodes.includes(l2n.id)} hovered={hovered === l2n.id}
                            label={l2n.label} fontSize={11.5}
                            delay={l2i * 0.032}
                            floatSeed={l2i + li * 7 + 3}
                            onClick={() => onToggleNode(l2n.id)}
                            onHover={(v) => setHovered(v ? l2n.id : null)}
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
      </div>
    </div>
  );
}
