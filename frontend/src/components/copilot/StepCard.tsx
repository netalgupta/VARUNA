"use client";

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Search, 
  Edit3, 
  Brain, 
  Zap, 
  Database, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Code,
  Layers,
  Clock
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PipelineStep {
  stage: string;
  message: string;
  elapsed_ms: number;
  [key: string]: any;
}

const STAGE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  QUERY:    { icon: Search,        color: 'text-cyan-400',    label: 'Initial Query' },
  REWRITE:  { icon: Edit3,         color: 'text-blue-400',    label: 'Query Rewrite' },
  INTENT:   { icon: Brain,         color: 'text-purple-400',  label: 'Intent Detection' },
  DECOMPOSE:{ icon: Layers,        color: 'text-indigo-400',  label: 'Decomposition' },
  BM25:     { icon: Search,        color: 'text-yellow-400',  label: 'BM25 Search' },
  VECTOR:   { icon: Zap,           color: 'text-green-400',   label: 'Vector Search' },
  RERANK:   { icon: CheckCircle,   color: 'text-emerald-400', label: 'Reranking' },
  CONTEXT:  { icon: Database,      color: 'text-orange-400',  label: 'Context Building' },
  SQL_GEN:  { icon: Code,          color: 'text-yellow-500',  label: 'SQL Generation' },
  SQL_EXEC: { icon: Database,      color: 'text-cyan-500',    label: 'SQL Execution' },
  NARRATE:  { icon: MessageSquare, color: 'text-blue-500',    label: 'Narration' },
  RESPONSE: { icon: CheckCircle,   color: 'text-white',       label: 'Final Response' },
  ERROR:    { icon: AlertCircle,   color: 'text-red-500',     label: 'Error' },
};

export const StepCard: React.FC<{ step: PipelineStep; index: number }> = ({ step, index }) => {
  const config = STAGE_CONFIG[step.stage] || { icon: Layers, color: 'text-gray-400', label: step.stage };
  const Icon = config.icon;

  return (
    <div className="group relative flex gap-4 pb-8 last:pb-0">
      {/* Timeline Line */}
      <div className="absolute left-[19px] top-8 h-[calc(100%-32px)] w-px bg-white/10 group-last:hidden" />

      {/* Icon Node */}
      <div className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 shadow-xl backdrop-blur-sm transition-transform group-hover:scale-110",
        config.color
      )}>
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 pt-1">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-semibold tracking-tight text-white/90">
            {config.label}
          </h4>
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-white/30">
            <Clock size={10} />
            {step.elapsed_ms}ms
          </span>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {step.message}
        </p>

        {/* Dynamic Data Viewer */}
        {Object.entries(step).map(([key, value]) => {
          if (['stage', 'message', 'elapsed_ms'].includes(key)) return null;
          return (
            <div key={key} className="mt-3 overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-3 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{key}</span>
              </div>
              <pre className="max-h-40 overflow-y-auto p-3 text-[10px] leading-normal text-cyan-200/80 scrollbar-thin scrollbar-thumb-white/10">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const zapSelector = Zap;
