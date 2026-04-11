// Expanding bubble network — sector-based layout: each root owns a guaranteed arc slice,
// so expanding multiple roots simultaneously never causes cross-root overlap.
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { roots, BubbleNodeDef } from '@/data/graphNodes';

interface VibeGraphProps {
  selectedNodes: string[];
  onToggleNode: (id: string) => void;
}

// ── Layout constants (viewBox "-25 -25 150 150", center = 50,50) ─────────────
const CX = 50, CY = 50;
const ROOT_DIST = 23;       // center → root ring
const L1_DIST   = 47;       // center → L1 ring  (sector-guaranteed)
const L2_RING   = 15;       // L1 node → L2 fan distance
const ROOT_R    = 5.5;
const L1_R      = 2.7;
const L2_R      = 1.8;

// Each of the 7 roots gets an equal sector; children fill 84% of it
const SECTOR      = (2 * Math.PI) / roots.length;
const SECTOR_FILL = 0.84;

type Pt = { x: number; y: number };

function polar(cx: number, cy: number, r: number, a: number): Pt {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function rootAngle(i: number) { return -Math.PI / 2 + SECTOR * i; }
function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

// L1: evenly spaced within the root's sector arc at L1_DIST from center
function l1Positions(rootIdx: number, count: number) {
  if (count === 0) return [] as Array<{ angle: number; pos: Pt }>;
  const mid     = rootAngle(rootIdx);
  const halfArc = (SECTOR * SECTOR_FILL) / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = count === 1
      ? mid
      : mid - halfArc + (2 * halfArc / (count - 1)) * i;
    return { angle, pos: polar(CX, CY, L1_DIST, angle) };
  });
}

// L2: adaptive fan radiating outward from the L1 node
function l2Positions(l1Angle: number, l1Pos: Pt, count: number) {
  if (count === 0) return [] as Array<{ angle: number; pos: Pt }>;
  if (count === 1) return [{ angle: l1Angle, pos: polar(l1Pos.x, l1Pos.y, L2_RING, l1Angle) }];
  const spread = (L2_R * 3.4 * (count - 1)) / L2_RING;
  return Array.from({ length: count }, (_, i) => {
    const angle = l1Angle - spread / 2 + (spread / (count - 1)) * i;
    return { angle, pos: polar(l1Pos.x, l1Pos.y, L2_RING, angle) };
  });
}

// ── Amber selection palette ───────────────────────────────────────────────────
const AH = 38, AS = 92, AL = 50;

// ── NodeCircle sub-component ─────────────────────────────────────────────────
interface NodeCircleProps {
  pos: Pt; r: number; hue: number;
  selected: boolean; hovered: boolean;
  label: string; labelDir: number; fontSize: number;
  onClick: () => void; onHover: (v: boolean) => void;
  delay?: number;
}

function NodeCircle({ pos, r, hue, selected, hovered, label, labelDir, fontSize, onClick, onHover, delay = 0 }: NodeCircleProps) {
  const fh = selected ? AH : hue;
  const fs = selected ? AS : 62;
  const fl = selected ? AL : (hovered ? 56 : 44);
  const glow = selected ? hsl(AH, 90, 55) : hsl(hue, 70, 60);

  const lOff = r + 3.2;
  const lx   = pos.x + lOff * Math.cos(labelDir);
  const ly   = pos.y + lOff * Math.sin(labelDir);
  const anch = Math.abs(Math.cos(labelDir)) < 0.28 ? 'middle'
    : Math.cos(labelDir) > 0 ? 'start' : 'end';

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26, delay }}
      style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {selected && (
        <circle cx={pos.x} cy={pos.y} r={r * 2.1}
          fill="none" stroke={hsl(AH, 90, 60, 0.3)} strokeWidth={0.5}
          style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
      )}
      {hovered && !selected && (
        <circle cx={pos.x} cy={pos.y} r={r * 1.7} fill={hsl(hue, 60, 40, 0.15)} />
      )}
      <circle cx={pos.x} cy={pos.y} r={r}
        fill={hsl(fh, fs, fl)}
        stroke={hsl(fh, fs + 5, selected ? 72 : hovered ? 76 : 58)}
        strokeWidth={selected ? 0.25 : 0.12}
        style={{ filter: selected ? `drop-shadow(0 0 4px ${glow})` : undefined, transition: 'fill 0.25s' }}
      />
      <ellipse cx={pos.x - r * 0.26} cy={pos.y - r * 0.28}
        rx={r * 0.5} ry={r * 0.34}
        fill="rgba(255,255,255,0.2)" style={{ pointerEvents: 'none' }} />
      <text x={lx} y={ly} textAnchor={anch} dominantBaseline="central"
        fontSize={fontSize} fontFamily="'Inter', sans-serif"
        fontWeight={selected ? 600 : 400}
        fill={selected ? hsl(AH, 80, 84) : hsl(hue, 18, 74)}
        style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.25s' }}>
        {label}
      </text>
    </motion.g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VibeGraph({ selectedNodes, onToggleNode }: VibeGraphProps) {
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [expandedL1s,   setExpandedL1s  ] = useState<Set<string>>(new Set());
  const [hovered,       setHovered      ] = useState<string | null>(null);

  const anyExpanded    = expandedRoots.size > 0;
  const selectionCount = selectedNodes.length;

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
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleL1(node: BubbleNodeDef) {
    if ((node.children ?? []).length > 0) {
      setExpandedL1s(prev => {
        const next = new Set(prev);
        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
        return next;
      });
    }
    onToggleNode(node.id);
  }

  const layout = useMemo(() => roots.map((root, ri) => {
    const ra    = rootAngle(ri);
    const rp    = polar(CX, CY, ROOT_DIST, ra);
    const l1Pos = l1Positions(ri, root.children.length);

    const l1Nodes = root.children.map((l1, li) => {
      const { angle: l1a, pos: l1p } = l1Pos[li];
      const l2c   = l1.children ?? [];
      const l2Pos = l2Positions(l1a, l1p, l2c.length);
      return {
        node: l1, pos: l1p, angle: l1a,
        l2: l2c.map((l2, l2i) => ({ node: l2, pos: l2Pos[l2i].pos, angle: l2Pos[l2i].angle })),
      };
    });

    return { root, rootPos: rp, rootAngle: ra, l1Nodes };
  }), []);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      <svg viewBox="-25 -25 150 150" className="w-full h-full" style={{ minHeight: '420px' }}>
        <defs>
          <radialGradient id="vg-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(99,102,241,0.09)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </radialGradient>
        </defs>

        {selectionCount > 0 && <circle cx={CX} cy={CY} r={22} fill="url(#vg-bg)" />}

        {/* ── Spoke lines: center → root ── */}
        {layout.map(({ root, rootPos: rp }) => {
          const isExp  = expandedRoots.has(root.id);
          const dimmed = anyExpanded && !isExp;
          return (
            <line key={`spoke-${root.id}`}
              x1={CX} y1={CY} x2={rp.x} y2={rp.y}
              stroke={hsl(root.hue, 40, 42, dimmed ? 0.05 : isExp ? 0.38 : 0.13)}
              strokeWidth={isExp ? 0.22 : 0.1}
              style={{ transition: 'all 0.35s' }} />
          );
        })}

        {/* ── Root → L1 lines ── */}
        {layout.map(({ root, rootPos: rp, l1Nodes }) =>
          expandedRoots.has(root.id) && l1Nodes.map(({ node: l1, pos: l1p }) => (
            <motion.line key={`rl1-${l1.id}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              x1={rp.x} y1={rp.y} x2={l1p.x} y2={l1p.y}
              stroke={hsl(root.hue, 52, 56, selectedNodes.includes(l1.id) ? 0.7 : 0.28)}
              strokeWidth={0.18} />
          ))
        )}

        {/* ── L1 → L2 lines ── */}
        {layout.map(({ root, l1Nodes }) =>
          expandedRoots.has(root.id) && l1Nodes.map(({ node: l1, pos: l1p, l2 }) =>
            expandedL1s.has(l1.id) && l2.map(({ node: l2n, pos: l2p }) => (
              <motion.line key={`l1l2-${l2n.id}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                x1={l1p.x} y1={l1p.y} x2={l2p.x} y2={l2p.y}
                stroke={hsl(root.hue, 46, 56, selectedNodes.includes(l2n.id) ? 0.6 : 0.2)}
                strokeWidth={0.13} />
            ))
          )
        )}

        {/* ── Center fusion node ── */}
        <AnimatePresence>
          {selectionCount >= 2 && (
            <motion.g key="fusion"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            >
              <circle cx={CX} cy={CY} r={7.5}
                fill={hsl(260, 62, 17)} stroke={hsl(260, 72, 55, 0.75)} strokeWidth={0.28}
                style={{ filter: 'drop-shadow(0 0 7px rgba(99,102,241,0.55))' }} />
              <text x={CX} y={CY - 1.6} textAnchor="middle" dominantBaseline="central"
                fontSize={2.8} fontFamily="'JetBrains Mono', monospace"
                fill={hsl(260, 70, 82)} fontWeight={700}>
                {selectionCount}
              </text>
              <text x={CX} y={CY + 3.0} textAnchor="middle" dominantBaseline="central"
                fontSize={1.5} fontFamily="'Inter', sans-serif" fill={hsl(260, 38, 66)}>
                traits
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Root nodes ── */}
        {layout.map(({ root, rootPos: rp, rootAngle: ra, l1Nodes }) => {
          const isExp  = expandedRoots.has(root.id);
          const dimmed = anyExpanded && !isExp;
          const H      = root.hue;
          return (
            <g key={root.id}>
              <motion.g
                style={{ transformOrigin: `${rp.x}px ${rp.y}px`, cursor: 'pointer' }}
                whileHover={{ scale: 1.12 }}
                onClick={() => toggleRoot(root.id)}
                onMouseEnter={() => setHovered(root.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Spinning dashed ring when expanded */}
                {isExp && (
                  <circle cx={rp.x} cy={rp.y} r={ROOT_R * 1.75}
                    fill="none" stroke={hsl(H, 62, 58, 0.32)}
                    strokeWidth={0.14} strokeDasharray="0.9 1.4">
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${rp.x} ${rp.y}`} to={`360 ${rp.x} ${rp.y}`}
                      dur="14s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Idle pulse ring on root when collapsed */}
                {!isExp && !dimmed && (
                  <circle cx={rp.x} cy={rp.y} r={ROOT_R * 1.5}
                    fill="none" stroke={hsl(H, 55, 55, 0.18)} strokeWidth={0.12}>
                    <animate attributeName="r"
                      values={`${ROOT_R * 1.3};${ROOT_R * 1.65};${ROOT_R * 1.3}`}
                      dur="3.5s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity"
                      values="0.18;0.06;0.18" dur="3.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={rp.x} cy={rp.y} r={ROOT_R}
                  fill={hsl(H, isExp ? 66 : 52, dimmed ? 27 : isExp ? 40 : 34)}
                  stroke={hsl(H, 62, dimmed ? 38 : 66)}
                  strokeWidth={isExp ? 0.32 : 0.16}
                  style={{
                    filter: isExp ? `drop-shadow(0 0 5px ${hsl(H, 72, 55, 0.55)})` : undefined,
                    transition: 'all 0.3s',
                  }}
                />
                {/* Emoji icon inside bubble */}
                <text x={rp.x} y={rp.y - 1.0} textAnchor="middle" dominantBaseline="central"
                  fontSize={3.4} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {root.icon}
                </text>
                {/* Category label below bubble */}
                <text x={rp.x} y={rp.y + ROOT_R + 3.2} textAnchor="middle"
                  fontSize={2.2} fontFamily="'Inter', sans-serif"
                  fontWeight={isExp ? 600 : 400}
                  fill={hsl(H, 18, dimmed ? 38 : 76)}
                  style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                  {root.label}
                </text>
              </motion.g>

              {/* ── L1 children ── */}
              <AnimatePresence>
                {isExp && l1Nodes.map(({ node: l1, pos: l1p, angle: l1a, l2 }, li) => (
                  <g key={l1.id}>
                    <NodeCircle
                      pos={l1p} r={L1_R} hue={H}
                      selected={selectedNodes.includes(l1.id)}
                      hovered={hovered === l1.id}
                      label={l1.label} labelDir={l1a}
                      fontSize={1.9} delay={li * 0.05}
                      onClick={() => toggleL1(l1)}
                      onHover={(v) => setHovered(v ? l1.id : null)}
                    />
                    {/* ── L2 grandchildren ── */}
                    <AnimatePresence>
                      {expandedL1s.has(l1.id) && l2.map(({ node: l2n, pos: l2p, angle: l2a }, l2i) => (
                        <NodeCircle key={l2n.id}
                          pos={l2p} r={L2_R} hue={H}
                          selected={selectedNodes.includes(l2n.id)}
                          hovered={hovered === l2n.id}
                          label={l2n.label} labelDir={l2a}
                          fontSize={1.55} delay={l2i * 0.06}
                          onClick={() => onToggleNode(l2n.id)}
                          onHover={(v) => setHovered(v ? l2n.id : null)}
                        />
                      ))}
                    </AnimatePresence>
                  </g>
                ))}
              </AnimatePresence>
            </g>
          );
        })}
      </svg>

      {!anyExpanded && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <p className="text-xs text-muted-foreground/35 tracking-widest uppercase">
            Click a category to explore
          </p>
        </div>
      )}
    </div>
  );
}
