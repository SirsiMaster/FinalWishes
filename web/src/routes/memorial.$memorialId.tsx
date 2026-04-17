/* eslint-disable react-refresh/only-export-components */
/**
 * Public Memorial Page — Shareable Without Account
 *
 * Public-facing memorial page viewable by anyone without a FinalWishes account.
 * Data comes from `public_memorials/{memorialId}` in Firestore (denormalized snapshot).
 *
 * @version 1.0.0
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import DOMPurify from 'dompurify'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Heart, MapPin, Calendar, Clock, ExternalLink } from 'lucide-react'

export const Route = createFileRoute('/memorial/$memorialId')({
  component: PublicMemorialPage,
})

interface PublicMemorial {
  estateName: string
  personName: string
  profilePhotoUrl?: string
  birthDate?: string
  deathDate?: string
  obituaryContent?: string
  serviceDetails?: {
    type?: string
    date?: string
    time?: string
    location?: string
    address?: string
    notes?: string
  }
  createdAt?: unknown
  estateId?: string
}

function PublicMemorialPage() {
  const { memorialId } = Route.useParams()
  const [memorial, setMemorial] = useState<PublicMemorial | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'public_memorials', memorialId))
        if (snap.exists()) {
          setMemorial(snap.data() as PublicMemorial)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      }
      setLoading(false)
    }
    load()
  }, [memorialId])

  const sanitizedObituary = useMemo(
    () => (memorial?.obituaryContent ? DOMPurify.sanitize(memorial.obituaryContent) : ''),
    [memorial?.obituaryContent],
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F0] via-[#FEFCF9] to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#C8A951]/30 border-t-[#C8A951] rounded-full animate-spin" />
          <p className="text-sm text-[#8B7A5E]/60 font-medium">Loading memorial...</p>
        </div>
      </div>
    )
  }

  if (notFound || !memorial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F0] via-[#FEFCF9] to-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#C8A951]/10 flex items-center justify-center mb-6">
            <Heart className="w-7 h-7 text-[#C8A951]/40" />
          </div>
          <h1 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#2C1810] mb-3">
            Memorial Not Found
          </h1>
          <p className="text-[#8B7A5E]/60 leading-relaxed">
            This memorial page may have been removed or the link is no longer valid.
          </p>
        </div>
      </div>
    )
  }

  const initials = memorial.personName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const dateSpan = [memorial.birthDate, memorial.deathDate].filter(Boolean).join(' \u2014 ')

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] via-[#FEFCF9] to-white">
      <div className="max-w-2xl mx-auto px-5 py-12 md:py-20">

        {/* Portrait */}
        <section className="text-center mb-16">
          <div className="mb-8">
            {memorial.profilePhotoUrl ? (
              <div className="w-36 h-36 mx-auto rounded-full overflow-hidden border-4 border-white shadow-[0_8px_40px_rgba(200,169,81,0.15)]">
                <img
                  src={memorial.profilePhotoUrl}
                  alt={memorial.personName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-[#C8A951]/20 to-[#C8A951]/5 border-4 border-white shadow-[0_8px_40px_rgba(200,169,81,0.12)] flex items-center justify-center">
                <span className="text-4xl font-[family-name:var(--font-cinzel)] font-bold text-[#C8A951]/70">
                  {initials}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-cinzel)] font-bold text-[#2C1810] tracking-tight mb-3">
            {memorial.personName}
          </h1>

          {dateSpan && (
            <p className="text-lg text-[#8B7A5E]/70 font-light tracking-wide">
              {dateSpan}
            </p>
          )}

          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-12 h-px bg-[#C8A951]/20" />
            <Heart className="w-4 h-4 text-[#C8A951]/30" />
            <div className="w-12 h-px bg-[#C8A951]/20" />
          </div>
        </section>

        {/* Obituary */}
        {sanitizedObituary && (
          <section className="mb-16">
            <Card className="rounded-3xl border-0 shadow-[0_4px_24px_rgba(200,169,81,0.08)] bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 md:p-12">
                <div
                  className="text-[#5C4A3A] text-[16px] leading-[1.85] font-light prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizedObituary }}
                />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Service Details */}
        {memorial.serviceDetails && (memorial.serviceDetails.date || memorial.serviceDetails.location) && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-4 h-4 text-[#C8A951]/50" />
              <h2 className="text-sm font-bold text-[#8B7A5E]/50 uppercase tracking-[0.15em]">
                Service Information
              </h2>
            </div>

            <Card className="rounded-3xl border-0 shadow-[0_4px_24px_rgba(200,169,81,0.08)] bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 md:p-10 space-y-4">
                {memorial.serviceDetails.type && (
                  <p className="text-sm font-semibold text-[#2C1810] uppercase tracking-wide">
                    {memorial.serviceDetails.type}
                  </p>
                )}
                {memorial.serviceDetails.date && (
                  <div className="flex items-center gap-3 text-[#5C4A3A]">
                    <Calendar className="w-4 h-4 text-[#C8A951]/60 flex-shrink-0" />
                    <span className="text-[15px]">{memorial.serviceDetails.date}</span>
                  </div>
                )}
                {memorial.serviceDetails.time && (
                  <div className="flex items-center gap-3 text-[#5C4A3A]">
                    <Clock className="w-4 h-4 text-[#C8A951]/60 flex-shrink-0" />
                    <span className="text-[15px]">{memorial.serviceDetails.time}</span>
                  </div>
                )}
                {memorial.serviceDetails.location && (
                  <div className="flex items-center gap-3 text-[#5C4A3A]">
                    <MapPin className="w-4 h-4 text-[#C8A951]/60 flex-shrink-0" />
                    <div>
                      <span className="text-[15px]">{memorial.serviceDetails.location}</span>
                      {memorial.serviceDetails.address && (
                        <p className="text-sm text-[#8B7A5E]/60 mt-0.5">{memorial.serviceDetails.address}</p>
                      )}
                    </div>
                  </div>
                )}
                {memorial.serviceDetails.notes && (
                  <>
                    <Separator className="bg-[#C8A951]/10" />
                    <p className="text-sm text-[#5C4A3A]/70 leading-relaxed italic">
                      {memorial.serviceDetails.notes}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Footer */}
        <section className="text-center pt-8 pb-16">
          <Separator className="bg-[#C8A951]/10 mb-10" />
          <p className="text-xs text-[#8B7A5E]/40 mb-4">
            This memorial was created with love using FinalWishes.
          </p>
          <Button
            asChild
            variant="ghost"
            className="text-xs text-[#C8A951]/60 hover:text-[#C8A951] hover:bg-[#C8A951]/5 rounded-xl"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              Learn about FinalWishes
            </a>
          </Button>
        </section>
      </div>
    </div>
  )
}
