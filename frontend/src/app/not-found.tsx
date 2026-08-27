import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-screen bg-[#020B14] text-white flex flex-col items-center justify-center p-6 text-center font-mono">
      <div className="w-12 h-12 rounded-xl bg-[#2EE6C6]/15 border border-[#2EE6C6]/40 flex items-center justify-center text-[#00FFC6] text-xl font-bold mb-4 shadow-[0_0_20px_rgba(46,230,198,0.3)]">
        404
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Operational Sector Not Found</h2>
      <p className="text-xs text-[#809AAB] max-w-sm mb-6">
        The requested coordinates or interface view does not exist in the VARUNA data backbone.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-full bg-[#2EE6C6] hover:bg-[#00FFC6] text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(46,230,198,0.4)]"
      >
        <ArrowLeft size={14} />
        <span>Return to VARUNA Mission Control</span>
      </Link>
    </div>
  );
}
