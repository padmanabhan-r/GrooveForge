import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SEARCH_MESSAGES = [
  'Scanning through millions of musical blueprints…',
  'Mapping your vibe to sonic coordinates…',
  'Detecting rhythmic and harmonic patterns…',
  'Exploring genre neighborhoods…',
  'Measuring energy and mood signatures…',
  'Clustering instrumentation profiles…',
  'Ranking the closest blueprint matches…',
  'Pulling your sonic DNA together…',
];

const GENERATE_MESSAGES = [
  'Synthesizing your composition…',
  'Weaving instrumentation layers…',
  'Sculpting the harmonic space…',
  'Balancing energy and texture…',
  'Aligning rhythm to your blueprint…',
  'Shaping the arrangement…',
  'Rendering your original track…',
  'Creating something great for you…',
];

interface Props {
  phase: 'searching' | 'generating';
}

export default function GeneratingOverlay({ phase }: Props) {
  const messages = phase === 'searching' ? SEARCH_MESSAGES : GENERATE_MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const id = setInterval(() => {
      setIndex(i => (i + 1) % messages.length);
    }, 2200);
    return () => clearInterval(id);
  }, [phase, messages.length]);

  return (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(6, 8, 18, 0.82)', backdropFilter: 'blur(14px)' }}
    >
      {/* Pulse rings */}
      <div className="relative mb-10 flex items-center justify-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-indigo-500/30"
            animate={{ scale: [1, 2.6], opacity: [0.55, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
            style={{ width: 64, height: 64 }}
          />
        ))}

        {/* Waveform bars */}
        <div className="flex items-end gap-[5px]" style={{ height: 48 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-[5px] rounded-full bg-indigo-400"
              animate={{ scaleY: [0.2, 1, 0.2] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.09,
                ease: 'easeInOut',
              }}
              style={{ height: 48, originY: 1 }}
            />
          ))}
        </div>
      </div>

      {/* Phase label */}
      <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-400/70">
        {phase === 'searching' ? 'Blueprint Discovery' : 'Music Generation'}
      </p>

      {/* Cycling message */}
      <div className="h-8 flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: 'easeInOut' }}
            className="text-[17px] font-medium text-white/90 text-center px-6"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Sub-label */}
      {phase === 'generating' && (
        <p className="mt-3 text-[13px] text-white/35">ElevenLabs Music API</p>
      )}
    </motion.div>
  );
}
