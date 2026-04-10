import { Loader2 } from 'lucide-react';

export default function GeneratingOverlay() {
  return (
    <div className="glass-panel p-8 flex flex-col items-center justify-center gap-4 animate-scale-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center">
          <Loader2 size={28} className="text-primary animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full animate-ping bg-primary/10" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Forging your groove...</p>
        <p className="text-xs text-muted-foreground">Analyzing blueprints and generating track</p>
      </div>
    </div>
  );
}
