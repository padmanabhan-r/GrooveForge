import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { graphNodes as initialNodes, GraphNode, NodeCategory } from '@/data/graphNodes';

const CATEGORY_COLORS: Record<NodeCategory, { h: number; s: number; l: number }> = {
  genre:      { h: 260, s: 65, l: 55 },
  mood:       { h: 220, s: 75, l: 58 },
  tempo:      { h: 35,  s: 80, l: 52 },
  key:        { h: 165, s: 60, l: 42 },
  instrument: { h: 340, s: 50, l: 62 },
  theme:      { h: 155, s: 40, l: 45 },
};

const hsl = (c: { h: number; s: number; l: number }, a = 1) =>
  `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`;
const hslStr = (c: { h: number; s: number; l: number }) =>
  `hsl(${c.h}, ${c.s}%, ${c.l}%)`;

interface NodeState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  phase: number;      // breathing phase offset
  floatPhase: number;  // float animation phase
  floatAmp: number;    // float amplitude (3-6px equivalent in viewBox units)
  floatPeriod: number; // float period 4-7s
}

interface VibeGraphProps {
  selectedNodes: string[];
  onToggleNode: (id: string) => void;
  highlightedNodes?: string[];
}

export default function VibeGraph({ selectedNodes, onToggleNode, highlightedNodes = [] }: VibeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animated, setAnimated] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const nodeStatesRef = useRef<Map<string, NodeState>>(new Map());
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [selectPulse, setSelectPulse] = useState<Map<string, number>>(new Map());

  // Initialize node states
  useEffect(() => {
    const states = nodeStatesRef.current;
    initialNodes.forEach(n => {
      if (!states.has(n.id)) {
        states.set(n.id, {
          x: n.x, y: n.y,
          vx: 0, vy: 0,
          targetX: n.x, targetY: n.y,
          phase: Math.random() * Math.PI * 2,
          floatPhase: Math.random() * Math.PI * 2,
          floatAmp: 0.3 + Math.random() * 0.3,
          floatPeriod: 4 + Math.random() * 3,
        });
      }
    });
    setAnimated(true);
  }, []);

  // Physics loop
  useEffect(() => {
    const states = nodeStatesRef.current;
    const REPULSION = 8;
    const MIN_DIST = 6;
    const DAMPING = 0.92;
    const SPRING = 0.02;

    const tick = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;

      const ids = Array.from(states.keys());
      // Apply forces
      ids.forEach(id => {
        const s = states.get(id)!;
        if (id === dragNode) return; // skip physics for dragged node

        // Spring to target
        s.vx += (s.targetX - s.x) * SPRING;
        s.vy += (s.targetY - s.y) * SPRING;

        // Repulsion
        ids.forEach(otherId => {
          if (id === otherId) return;
          const o = states.get(otherId)!;
          const dx = s.x - o.x;
          const dy = s.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          if (dist < MIN_DIST) {
            const force = REPULSION / (dist * dist);
            s.vx += (dx / dist) * force * 0.016;
            s.vy += (dy / dist) * force * 0.016;
          }
        });

        s.vx *= DAMPING;
        s.vy *= DAMPING;
        s.x += s.vx;
        s.y += s.vy;

        // Clamp
        s.x = Math.max(3, Math.min(97, s.x));
        s.y = Math.max(3, Math.min(97, s.y));
      });

      // Update positions with float offset
      const newPos = new Map<string, { x: number; y: number }>();
      ids.forEach(id => {
        const s = states.get(id)!;
        const floatY = Math.sin(t / s.floatPeriod * Math.PI * 2 + s.floatPhase) * s.floatAmp;
        newPos.set(id, { x: s.x, y: s.y + floatY });
      });
      setPositions(newPos);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dragNode]);

  // Compute edges
  const edges = useMemo(() => {
    const edgeSet = new Set<string>();
    const result: { fromId: string; toId: string; fromCat: NodeCategory; toCat: NodeCategory }[] = [];
    initialNodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = initialNodes.find(n => n.id === targetId);
        if (target) {
          const key = [node.id, target.id].sort().join('-');
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            result.push({ fromId: node.id, toId: target.id, fromCat: node.category, toCat: target.category });
          }
        }
      });
    });
    return result;
  }, []);

  // SVG coordinate helpers
  const getSVGPoint = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragNode(nodeId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragNode) return;
    const pt = getSVGPoint(e);
    const s = nodeStatesRef.current.get(dragNode);
    if (s) {
      s.x = pt.x;
      s.y = pt.y;
      s.targetX = pt.x;
      s.targetY = pt.y;
      s.vx = 0;
      s.vy = 0;
    }
  }, [dragNode, getSVGPoint]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragNode) {
      // Give a tiny momentum based on recent movement
      setDragNode(null);
    }
  }, [dragNode]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (dragNode) return; // don't toggle on drag
    onToggleNode(nodeId);
    setSelectPulse(prev => new Map(prev).set(nodeId, Date.now()));
  }, [dragNode, onToggleNode]);

  // Track drag distance to distinguish click from drag
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDownWrapped = useCallback((e: React.PointerEvent, nodeId: string) => {
    const pt = getSVGPoint(e);
    dragStartRef.current = pt;
    handlePointerDown(e, nodeId);
  }, [getSVGPoint, handlePointerDown]);

  const handlePointerUpWrapped = useCallback((e: React.PointerEvent, nodeId: string) => {
    if (dragStartRef.current) {
      const pt = getSVGPoint(e);
      const dist = Math.hypot(pt.x - dragStartRef.current.x, pt.y - dragStartRef.current.y);
      if (dist < 1.5) {
        // It was a click, not a drag
        onToggleNode(nodeId);
        setSelectPulse(prev => new Map(prev).set(nodeId, Date.now()));
      }
    }
    dragStartRef.current = null;
    handlePointerUp(e);
  }, [getSVGPoint, onToggleNode, handlePointerUp]);

  const getPos = (id: string) => positions.get(id) || { x: initialNodes.find(n => n.id === id)?.x || 50, y: initialNodes.find(n => n.id === id)?.y || 50 };

  const t = timeRef.current;

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ minHeight: '400px' }}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => { if (dragNode) { dragStartRef.current = null; setDragNode(null); } }}
      >
        <defs>
          {/* Glow filter for edges */}
          <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Node glass filters */}
          {Object.entries(CATEGORY_COLORS).map(([cat, c]) => (
            <radialGradient key={`glass-${cat}`} id={`glass-${cat}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor={hsl(c, 0.9)} />
              <stop offset="40%" stopColor={hsl({ ...c, l: c.l - 5 }, 0.7)} />
              <stop offset="100%" stopColor={hsl({ ...c, l: c.l - 15 }, 0.5)} />
            </radialGradient>
          ))}

          {/* Inner glow gradients */}
          {Object.entries(CATEGORY_COLORS).map(([cat, c]) => (
            <radialGradient key={`innerglow-${cat}`} id={`innerglow-${cat}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={hsl({ ...c, l: c.l + 15 }, 0.3)} />
              <stop offset="60%" stopColor={hsl(c, 0.15)} />
              <stop offset="100%" stopColor={hsl(c, 0.4)} />
            </radialGradient>
          ))}

          {/* Specular highlight */}
          <radialGradient id="specular" cx="30%" cy="25%" r="40%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Drop shadow filter */}
          <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" />
            <feOffset dy="0.4" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Edge gradients */}
          {edges.map((edge, i) => {
            const fromC = CATEGORY_COLORS[edge.fromCat];
            const toC = CATEGORY_COLORS[edge.toCat];
            return (
              <linearGradient key={`eg-${i}`} id={`eg-${i}`} gradientUnits="userSpaceOnUse"
                x1={getPos(edge.fromId).x} y1={getPos(edge.fromId).y}
                x2={getPos(edge.toId).x} y2={getPos(edge.toId).y}
              >
                <stop offset="0%" stopColor={hslStr(fromC)} />
                <stop offset="100%" stopColor={hslStr(toC)} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = getPos(edge.fromId);
          const to = getPos(edge.toId);
          const active = selectedNodes.includes(edge.fromId) || selectedNodes.includes(edge.toId);

          return (
            <g key={`edge-${i}`}>
              {/* Glow line */}
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke={`url(#eg-${i})`}
                strokeWidth={active ? 0.4 : 0.15}
                strokeOpacity={active ? 0.6 : 0.15}
                filter={active ? 'url(#edge-glow)' : undefined}
                style={{ transition: 'stroke-width 0.4s, stroke-opacity 0.4s' }}
              />
              {/* Shimmer particle on active edges */}
              {active && (
                <circle r={0.3}
                  fill="white"
                  opacity={0.5}
                >
                  <animateMotion
                    dur={`${2 + Math.random() * 2}s`}
                    repeatCount="indefinite"
                    path={`M${from.x},${from.y} L${to.x},${to.y}`}
                  />
                  <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {initialNodes.map((node, i) => {
          const pos = getPos(node.id);
          const selected = selectedNodes.includes(node.id);
          const highlighted = highlightedNodes.includes(node.id);
          const hovered = hoveredNode === node.id;
          const dragging = dragNode === node.id;
          const active = selected || highlighted || hovered || dragging;
          const c = CATEGORY_COLORS[node.category];

          const baseR = 2.0;
          const scale = dragging ? 1.08 : hovered ? 1.06 : 1;
          const r = baseR * scale;

          // Breathing: node state phase
          const ns = nodeStatesRef.current.get(node.id);
          const breathPhase = ns ? ns.phase : 0;
          const breathOpacity = 0.5 + 0.2 * Math.sin(timeRef.current * 2 + breathPhase);

          return (
            <g
              key={node.id}
              style={{
                cursor: dragging ? 'grabbing' : 'grab',
                opacity: animated ? 1 : 0,
                transition: `opacity 0.6s ease ${i * 30}ms`,
              }}
              onPointerDown={(e) => handlePointerDownWrapped(e, node.id)}
              onPointerUp={(e) => handlePointerUpWrapped(e, node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Drop shadow bloom on hover/drag */}
              {(hovered || dragging) && (
                <circle cx={pos.x} cy={pos.y + 0.3} r={r * 1.5}
                  fill={hsl(c, 0.15)}
                  style={{ filter: 'blur(1px)' }}
                />
              )}

              {/* Selected glow halo */}
              {selected && (
                <circle cx={pos.x} cy={pos.y} r={r * 2.2}
                  fill="none"
                  stroke={hsl(c, breathOpacity * 0.5)}
                  strokeWidth={0.1}
                  style={{ filter: `drop-shadow(0 0 2px ${hsl(c, 0.5)})` }}
                />
              )}

              {/* Orbiting ring for selected */}
              {selected && (
                <circle cx={pos.x} cy={pos.y} r={r + 0.8}
                  fill="none"
                  stroke={hsl(c, 0.4)}
                  strokeWidth={0.08}
                  strokeDasharray="0.5 1.5"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${pos.x} ${pos.y}`}
                    to={`360 ${pos.x} ${pos.y}`}
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Inner glow layer */}
              <circle cx={pos.x} cy={pos.y} r={r}
                fill={`url(#innerglow-${node.category})`}
                opacity={active || selected ? 0.9 : breathOpacity}
                style={{ transition: 'opacity 0.3s' }}
              />

              {/* Main glass sphere */}
              <circle cx={pos.x} cy={pos.y} r={r}
                fill={`url(#glass-${node.category})`}
                stroke={hsl(c, active ? 0.8 : 0.3)}
                strokeWidth={active ? 0.15 : 0.08}
                filter="url(#node-shadow)"
                style={{
                  transition: 'stroke-width 0.3s, stroke 0.3s',
                  filter: active ? `drop-shadow(0 0 3px ${hsl(c, 0.6)})` : 'url(#node-shadow)',
                }}
              />

              {/* Specular highlight */}
              <ellipse cx={pos.x - r * 0.2} cy={pos.y - r * 0.25} rx={r * 0.55} ry={r * 0.4}
                fill="url(#specular)"
                opacity={hovered || dragging ? 0.7 : 0.35}
                style={{ transition: 'opacity 0.3s', pointerEvents: 'none' }}
              />

              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + r + 1.8}
                textAnchor="middle"
                fill={active ? `hsl(${c.h}, ${c.s - 10}%, 85%)` : 'hsl(220, 10%, 50%)'}
                fontSize={1.4}
                fontFamily="'DM Sans', sans-serif"
                fontWeight={selected ? 600 : 400}
                style={{ transition: 'fill 0.3s ease', pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
