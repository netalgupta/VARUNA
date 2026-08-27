"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, RefreshCw, ChevronRight, Binary } from 'lucide-react';
import { StepCard, type PipelineStep } from './StepCard';

interface TraceData {
  trace_id: string;
  query: string;
  total_ms: number;
  steps: PipelineStep[];
}

export const PipelineDebugger: React.FC<{ 
  traceId: string | null; 
  onClose: () => void;
}> = ({ traceId, onClose }) => {
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;

    const fetchTrace = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/debug/${traceId}`);
        if (!res.ok) throw new Error("Trace not found");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrace();
  }, [traceId]);

  if (!traceId) return null;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/10 bg-black/80 backdrop-blur-2xl shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-1.5 rounded-lg text-cyan-400">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white/90">Pipeline Trace</h3>
            <p className="text-[10px] font-mono text-white/40">{traceId.slice(0, 13)}...</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-65px)] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-3 text-sm text-white/40">
            <RefreshCw size={18} className="animate-spin" />
            Fetching pipeline steps...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <p className="font-bold">Error loading trace</p>
            <p className="mt-1 opacity-80">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Query Context</span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                  {data.total_ms}ms total
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-white/80 line-clamp-2">
                &quot;{data.query}&quot;
              </p>
            </div>

            {/* List of Steps */}
            <div className="relative mt-8">
              <AnimatePresence mode="popLayout">
                {data.steps.map((step, idx) => (
                  <StepCard key={idx} step={step} index={idx} />
                ))}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center justify-center pt-4 opacity-20 filter grayscale">
              <Binary size={40} />
            </div>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-white/20">
            Waiting for trace data...
          </div>
        )}
      </div>
    </motion.div>
  );
};
