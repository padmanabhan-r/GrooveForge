// Expanding bubble network — click roots to expand, click leaves to select
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { roots, RootDef, BubbleNodeDef } from '@/data/graphNodes';

interface VibeGraphProps {
  selectedNodes: string[];
  onToggleNode: (id: string) => void;
}

// Layout constants (SVG viewBox 0 0 100 100, center = 50,50)
const CX = 50, CY = 50;
const ROOT_RING = 22;   // center → root distance
const L1_RING = 13;     // root → L1 distance
const L2_RING = 9;      // L1 → L2 distance
const ROOT_R = 5.5;     // root bubble radius
const L1_R = 3.2;       // L1 bubble radius
const L2_R = 2.2;       // L2 bubble radius
const L1_SPREAD = 0.9;  // radians total arc for L1 fan
const L2_SPREAD = 0.7;  // radians total arc for L2 fan

type Pt = { x: number; y: number };

function polar(cx: number, cy: number, r: number, angle: number): Pt {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function fanPts(cx: number, cy: number, dir: number, r: number, n: number, spread: number): Pt[] {
  if (n === 0) return [];
  if (n === 1) return [polar(cx, cy, r, dir)];
  return Array.from({ length: n }, (_, i) =>
    polar(cx, cy, r, dir - spread / 2 + (spread / (n - 1)) * i)
  );
}

function rootAngle(i: number): number {
  return -Math.PI / 2 + (2 * Math.PI / roots.length) * i;
}

function hsl(hue: number, sat: number, lit: number, a = 1): string {
  return `hsla(${hue},${sat}%,${lit}%,${a})`;
}

// Amber color for selected state
const AMBER_H = 38, AMBER_S = 92, AMBER_L = 50;

interface NodeCircleProps {
  pos: Pt;
  r: number;
  hue: number;
  selected: boolean;
  hovered: boolean;
  label: string;
  labelDir: number;   // angle in radians: text placed in this direction from center
  fontSize: number;
  onClick: () => void;
  onHover: (v: boolean) => void;
  delay?: number;
}

function NodeCircle({ pos, r, hue, selected, hovered, label, labelDir, fontSize, onClick, onHover, delay = 0 }: NodeCircleProps) {
  const fillH = selected ? AMBER_H : hue;
  const fillS = selected ? AMBER_S : 62;
  const fillL = selected ? AMBER_L : (hovered ? 55 : 45);
  const strokeL = selected ? 70 : (hovered ? 75 : 60);
  const strokeW = selected ? 0.25 : (hovered ? 0.2 : 0.1);
  const glowColor = selected ? hsl(AMBER_H, 90, 55) : hsl(hue, 70, 60);

  // Label offset outward in labelDir direction
  const labelOffset = r + 2.2;
  const lx = pos.x + labelOffset * Math.cos(labelDir);
  const ly = pos.y + labelOffset * Math.sin(labelDir);
  const anchor = Math.abs(Math.cos(labelDir)) < 0.3 ? 'middle'
    : Math.cos(labelDir) > 0 ? 'start' : 'end';

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay }}
      style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Selection glow halo */}
      {selected && (
        <circle cx={pos.x} cy={pos.y} r={r * 1.9}
          fill="none"
          stroke={hsl(AMBER_H, 90, 60, 0.35)}
          strokeWidth={0.6}
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
      )}
      {/* Hover bloom */}
      {hovered && !selected && (
        <circle cx={pos.x} cy={pos.y} r={r * 1.6}
          fill={hsl(hue, 60, 40, 0.18)}
        />
      )}
      {/* Main bubble */}
      <circle
        cx={pos.x} cy={pos.y} r={r}
        fill={hsl(fillH, fillS, fillL)}
        stroke={hsl(fillH, fillS + 5, strokeL)}
        strokeWidth={strokeW}
        style={{
          filter: selected ? `drop-shadow(0 0 4px ${glowColor})` : undefined,
          transition: 'fill 0.25s, stroke 0.25s',
        }}
      />
      {/* Specular highlight */}
      <ellipse
        cx={pos.x - r * 0.25} cy={pos.y - r * 0.28}
        rx={r * 0.5} ry={r * 0.35}
        fill="rgba(255,255,255,0.22)"
        style={{ pointerEvents: 'none' }}
      />
      {/* Label */}
      <text
        x={lx} y={ly}
        textAnchor={anchor}
        dominantBaseline="central"
        fontSize={fontSize}
        fontFamily="'Inter', sans-serif"
        fontWeight={selected ? 600 : 400}
        fill={selected ? hsl(AMBER_H, 80, 82) : hsl(hue, 20, 72)}
        style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.25s' }}
      >
        {label}
      </text>
    </motion.g>
  );
}

export default function VibeGraph({ selectedNodes, onToggleNode }: VibeGraphProps) {
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [expandedL1s, setExpandedL1s] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);

  const anyExpanded = expandedRoots.size > 0;
  const selectionCount = selectedNodes.length;

  function toggleRoot(id: string) {
    setExpandedRoots(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // collapse all L1s under this root
        const root = roots.find(r => r.id === id);
        if (root) {
          setExpandedL1s(el => {
            const el2 = new Set(el);
            root.children.forEach(c => el2.delete(c.id));
            return el2;
          });
        }
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleL1(rootId: string, node: BubbleNodeDef) {
    if ((node.children ?? []).length > 0) {
      setExpandedL1s(prev => {
        const next = new Set(prev);
        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
        return next;
      });
    }
    onToggleNode(node.id);
  }

  // Compute positions for all visible nodes
  const layout = useMemo(() => {
    return roots.map((root, ri) => {
      const angle = rootAngle(ri);
      const rp = polar(CX, CY, ROOT_RING, angle);
      const l1Pts = fanPts(rp.x, rp.y, angle, L1_RING, root.children.length, L1_SPREAD);

      const l1Nodes = root.children.map((l1, li) => {
        const l1p = l1Pts[li];
        const l1Angle = Math.atan2(l1p.y - rp.y, l1p.x - rp.x);
        const l2Children = l1.children ?? [];
        const l2Pts = fanPts(l1p.x, l1p.y, l1Angle, L2_RING, l2Children.length, L2_SPREAD);
        return { node: l1, pos: l1p, angle: l1Angle, l2: l2Children.map((l2, l2i) => ({ node: l2, pos: l2Pts[l2i], angle: l1Angle })) };
      });

      return { root, rootPos: rp, rootAngle: angle, l1Nodes };
    });
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      <svg
        viewBox="-5 -5 110 110"
        className="w-full h-full"
        style={{ minHeight: '380px' }}
      >
        <defs>
          <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99,102,241,0.07)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </radialGradient>
        </defs>

        {/* Subtle center glow when nodes are selected */}
        {selectionCount > 0 && (
          <circle cx={CX} cy={CY} r={18} fill="url(#bg-glow)" />
        )}

        {/* Connection lines: root → L1 */}
        {layout.map(({ root, rootPos: rp, l1Nodes }) =>
          expandedRoots.has(root.id) && l1Nodes.map(({ node: l1, pos: l1p }) => (
            <motion.line
              key={`line-${root.id}-${l1.id}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              x1={rp.x} y1={rp.y} x2={l1p.x} y2={l1p.y}
              stroke={hsl(root.hue, 50, 50, selectedNodes.includes(l1.id) ? 0.7 : 0.3)}
              strokeWidth={0.2}
            />
          ))
        )}

        {/* Connection lines: L1 → L2 */}
        {layout.map(({ root, l1Nodes }) =>
          expandedRoots.has(root.id) && l1Nodes.map(({ node: l1, pos: l1p, l2 }) =>
            expandedL1s.has(l1.id) && l2.map(({ node: l2n, pos: l2p }) => (
              <motion.line
                key={`line-${l1.id}-${l2n.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                x1={l1p.x} y1={l1p.y} x2={l2p.x} y2={l2p.y}
                stroke={hsl(root.hue, 45, 50, selectedNodes.includes(l2n.id) ? 0.6 : 0.25)}
                strokeWidth={0.15}
              />
            ))
          )
        )}

        {/* Center fusion indicator */}
        <AnimatePresence>
          {selectionCount >= 2 && (
            <motion.g key="fusion"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            >
              <circle cx={CX} cy={CY} r={6.5}
                fill={hsl(260, 60, 18)}
                stroke={hsl(260, 70, 55, 0.7)}
                strokeWidth={0.25}
                style={{ filter: 'drop-shadow(0 0 5px rgba(99,102,241,0.5))' }}
              />
              <text x={CX} y={CY - 1.5} textAnchor="middle" dominantBaseline="central"
                fontSize={2.2} fontFamily="'JetBrains Mono', monospace"
                fill={hsl(260, 70, 80)} fontWeight={600}>
                {selectionCount}
              </text>
              <text x={CX} y={CY + 2.5} textAnchor="middle" dominantBaseline="central"
                fontSize={1.4} fontFamily="'Inter', sans-serif"
                fill={hsl(260, 40, 65)}>
                traits
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Root nodes */}
        {layout.map(({ root, rootPos: rp, rootAngle: ra, l1Nodes }, ri) => {
          const isExpanded = expandedRoots.has(root.id);
          const dimmed = anyExpanded && !isExpanded;
          const rootHue = root.hue;

          return (
            <g key={root.id}>
              {/* Root → center connector */}
              <line x1={CX} y1={CY} x2={rp.x} y2={rp.y}
                stroke={hsl(rootHue, 40, 40, dimmed ? 0.08 : isExpanded ? 0.4 : 0.15)}
                strokeWidth={isExpanded ? 0.25 : 0.12}
                style={{ transition: 'stroke-opacity 0.3s, stroke-width 0.3s' }}
              />

              {/* Root bubble */}
              <motion.g
                style={{ transformOrigin: `${rp.x}px ${rp.y}px`, cursor: 'pointer' }}
                whileHover={{ scale: 1.08 }}
                onClick={() => toggleRoot(root.id)}
                onMouseEnter={() => setHovered(root.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Expanded ring */}
                {isExpanded && (
                  <circle cx={rp.x} cy={rp.y} r={ROOT_R * 1.7}
                    fill="none"
                    stroke={hsl(rootHue, 60, 55, 0.3)}
                    strokeWidth={0.15}
                    strokeDasharray="1 1.5"
                  >
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${rp.x} ${rp.y}`} to={`360 ${rp.x} ${rp.y}`}
                      dur="12s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={rp.x} cy={rp.y} r={ROOT_R}
                  fill={hsl(rootHue, isExpanded ? 65 : 50, dimmed ? 28 : isExpanded ? 40 : 35)}
                  stroke={hsl(rootHue, 60, dimmed ? 40 : 65)}
                  strokeWidth={isExpanded ? 0.3 : 0.15}
                  style={{
                    filter: isExpanded ? `drop-shadow(0 0 5px ${hsl(rootHue, 70, 55, 0.5)})` : undefined,
                    transition: 'all 0.3s',
                  }}
                />
                {/* Icon */}
                <text x={rp.x} y={rp.y - 1.2} textAnchor="middle" dominantBaseline="central"
                  fontSize={3.5} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {root.icon}
                </text>
                {/* Label */}
                <text x={rp.x} y={rp.y + ROOT_R + 2.2} textAnchor="middle"
                  fontSize={2.0} fontFamily="'Inter', sans-serif"
                  fontWeight={isExpanded ? 600 : 400}
                  fill={hsl(rootHue, 20, dimmed ? 40 : 75)}
                  style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                  {root.label}
                </text>
              </motion.g>

              {/* L1 children */}
              <AnimatePresence>
                {isExpanded && l1Nodes.map(({ node: l1, pos: l1p, angle: l1a, l2 }, li) => (
                  <g key={l1.id}>
                    <NodeCircle
                      pos={l1p} r={L1_R}
                      hue={rootHue}
                      selected={selectedNodes.includes(l1.id)}
                      hovered={hovered === l1.id}
                      label={l1.label}
                      labelDir={l1a}
                      fontSize={1.7}
                      delay={li * 0.04}
                      onClick={() => toggleL1(root.id, l1)}
                      onHover={(v) => setHovered(v ? l1.id : null)}
                    />

                    {/* L2 children */}
                    <AnimatePresence>
                      {expandedL1s.has(l1.id) && l2.map(({ node: l2n, pos: l2p, angle: l2a }, l2i) => (
                        <NodeCircle
                          key={l2n.id}
                          pos={l2p} r={L2_R}
                          hue={rootHue}
                          selected={selectedNodes.includes(l2n.id)}
                          hovered={hovered === l2n.id}
                          label={l2n.label}
                          labelDir={l2a}
                          fontSize={1.4}
                          delay={l2i * 0.05}
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

      {/* Hint text when nothing expanded */}
      {!anyExpanded && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <p className="text-xs text-muted-foreground/50 tracking-widest uppercase">
            Click a category to explore
          </p>
        </div>
      )}
    </div>
  );
}
