/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, Video, PenLine } from 'lucide-react'

export const Route = createFileRoute('/estates/$estateId/soul-log')({
  component: SoulLogPage,
})

function SoulLogPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-xl w-full border border-[#133378]/10 bg-white/80 backdrop-blur-sm shadow-xl rounded-3xl overflow-hidden">
        <CardContent className="p-10 text-center">
          {/* Icon cluster */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#133378]/5 flex items-center justify-center">
              <Video className="w-6 h-6 text-[#133378]/60" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#133378]/10 flex items-center justify-center ring-2 ring-[#C8A951]/30">
              <Mic className="w-7 h-7 text-[#133378]" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#133378]/5 flex items-center justify-center">
              <PenLine className="w-6 h-6 text-[#133378]/60" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[#133378] tracking-wide font-[family-name:var(--font-cinzel)] uppercase mb-2">
            Soul Log
          </h1>

          <Badge
            variant="outline"
            className="mb-6 bg-amber-50 border-amber-200 text-amber-700 px-3 py-1 text-xs font-semibold"
          >
            Coming Soon
          </Badge>

          {/* Description */}
          <p className="text-[#0F172A]/70 text-sm leading-relaxed mb-6 max-w-md mx-auto">
            Your personal diary — video, audio, or written — capturing thoughts,
            feelings, and experiences in the moment they happen. Not a social media
            post. A private conversation with yourself and the people who matter
            to you.
          </p>

          {/* Feature preview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-slate-50 p-3">
              <Video className="w-5 h-5 text-[#133378]/50 mx-auto mb-1.5" />
              <p className="text-[10px] font-semibold text-slate-500">Video Diary</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Face-to-camera moments</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <Mic className="w-5 h-5 text-[#133378]/50 mx-auto mb-1.5" />
              <p className="text-[10px] font-semibold text-slate-500">Audio Diary</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Voice-only reflections</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <PenLine className="w-5 h-5 text-[#133378]/50 mx-auto mb-1.5" />
              <p className="text-[10px] font-semibold text-slate-500">Written</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Words on a page</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            The Soul Log is what makes FinalWishes a daily companion — not a filing cabinet you open once a year.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
