import { X, Sparkles, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PreviewResponse } from '@/lib/api';

interface ReviewModalProps {
  preview: PreviewResponse;
  isGenerating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function msToTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function StylePills({ items, color }: { items: string[]; color: 'indigo' | 'red' }) {
  if (!items.length) return null;
  const bg = color === 'indigo' ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.1)';
  const border = color === 'indigo' ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.25)';
  const text = color === 'indigo' ? 'rgba(165,168,255,0.85)' : 'rgba(252,165,165,0.85)';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <span key={i} className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: bg, border: `1px solid ${border}`, color: text }}>
          {s}
        </span>
      ))}
    </div>
  );
}

export default function ReviewModal({ preview, isGenerating, onConfirm, onCancel }: ReviewModalProps) {
  const plan = preview.composition_plan;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={onCancel}
      >
        <motion.div
          className="relative w-full max-w-lg max-h-[82vh] flex flex-col rounded-3xl overflow-hidden"
          initial={{ scale: 0.94, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            background: 'linear-gradient(180deg,rgba(18,18,34,0.98),rgba(10,12,24,0.98))',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <p className="text-[9px] uppercase tracking-[0.26em]" style={{ color: 'rgba(165,168,255,0.6)' }}>
                Review {preview.generation_mode === 'advanced' ? 'Composition Plan' : 'Prompt'}
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-white">
                {preview.generation_mode === 'advanced' ? 'Structured composition plan' : 'Text prompt for ElevenLabs'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">

            {/* Simple mode — single prompt */}
            {preview.generation_mode === 'simple' && (
              <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-[9px] uppercase tracking-[0.22em] mb-3" style={{ color: 'rgba(165,168,255,0.55)' }}>Prompt</p>
                <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.85)' }}>{preview.prompt_used}</p>
              </div>
            )}

            {/* Advanced mode — composition plan */}
            {preview.generation_mode === 'advanced' && plan && (
              <>
                {/* Global styles */}
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.22em] mb-2" style={{ color: 'rgba(165,168,255,0.55)' }}>Global Style</p>
                    <StylePills items={plan.positive_global_styles} color="indigo" />
                  </div>
                  {plan.negative_global_styles.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.22em] mb-2" style={{ color: 'rgba(252,165,165,0.5)' }}>Suppress</p>
                      <StylePills items={plan.negative_global_styles} color="red" />
                    </div>
                  )}
                </div>

                {/* Sections */}
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Sections · {plan.sections.length}
                  </p>
                  <div className="flex flex-col gap-3">
                    {plan.sections.map((section, i) => (
                      <div
                        key={i}
                        className="rounded-2xl p-4 flex flex-col gap-2.5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        {/* Section header */}
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-[0.18em] capitalize px-2.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: 'rgba(253,186,116,0.9)' }}
                          >
                            {section.section_name}
                          </span>
                          <span className="flex items-center gap-1 text-[9px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.35)' }}>
                            <Clock size={9} />
                            {msToTime(section.duration_ms)}
                          </span>
                        </div>

                        {/* Local styles */}
                        {section.positive_local_styles.length > 0 && (
                          <StylePills items={section.positive_local_styles} color="indigo" />
                        )}
                        {section.negative_local_styles.length > 0 && (
                          <StylePills items={section.negative_local_styles} color="red" />
                        )}

                        {/* Lyrics lines */}
                        {section.lines.length > 0 && (
                          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-[8px] uppercase tracking-[0.18em] mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>Lyrics</p>
                            {section.lines.map((line, j) => (
                              <p key={j} className="text-[11px] leading-5" style={{ color: 'rgba(255,255,255,0.6)' }}>{line}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={onConfirm}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <Sparkles size={15} />
              {isGenerating ? 'Generating…' : 'Looks good — Generate'}
            </button>
            <button
              onClick={onCancel}
              disabled={isGenerating}
              className="text-[10px] uppercase tracking-[0.2em] text-center transition-opacity hover:opacity-80 disabled:opacity-30"
              style={{ color: 'rgba(255,255,255,0.32)' }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
