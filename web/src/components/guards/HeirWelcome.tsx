/* eslint-disable react-refresh/only-export-components */
/**
 * Heir Welcome Screen — The Sacred Moment
 *
 * "The heir's first moment in this app is the most important screen
 * we will ever build."
 *
 * A parent is gone. The grief is fresh. The heir opens the app and sees
 * not a dashboard, not a completion percentage — but their parent's face,
 * their parent's voice, their parent's words written specifically for them.
 *
 * If we get this moment right, nothing else matters.
 * If we get this moment wrong, nothing else we build can save it.
 *
 * @see ETHOS.md §5 — "The Sacred Moment"
 * @version 1.0.0
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { useAuth, type UserProfile } from "@/lib/auth";
import {
  useEstate,
  useTimeCapsules,
  useHeirlooms,
  useCollection,
  type TimeCapsule,
  type Heirloom,
} from "@/lib/firestore";
import { orderBy, where, type Timestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Heart, Play, Pause, Volume2, Gift, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Soul Log Entry Type (matches soul-log route) ────────────────────────────

interface SoulLogEntry {
  id: string;
  title: string;
  type: "video" | "audio" | "text";
  visibility: "private" | "shared" | "sealed";
  mood?: string;
  content?: string;
  mediaUrl?: string;
  taggedPeople: string[];
  // sharedWith (UIDs) is the security field the Firestore soul-log read rule and the
  // non-owner query gate on (array-contains). taggedPeople holds display names for the
  // UI; sharedWith holds the recipient UIDs — see estates.$estateId.soul-log.lazy.tsx.
  sharedWith?: string[];
  sealedDelivery?: {
    trigger: "date" | "on_passing";
    date?: string;
  };
  duration?: number;
  createdAt: Timestamp;
  createdBy: string;
}

// ─── Owner Profile from Firestore ────────────────────────────────────────────

interface OwnerProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profilePhotoUrl?: string;
  birthDate?: string;
  deathDate?: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface HeirWelcomeProps {
  estateId: string;
  onContinue: () => void;
}

// ─── Audio Player ────────────────────────────────────────────────────────────

function AudioMessage({ url, title }: { url: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setProgress(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        aria-label={`Audio message: ${title}`}
      >
        {/* User-recorded memorial audio has no caption file; placeholder track satisfies a11y */}
        <track kind="captions" />
      </audio>
      <button
        onClick={toggle}
        className="w-14 h-14 rounded-full bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 flex items-center justify-center transition-colors flex-shrink-0"
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
      >
        {playing ? (
          <Pause className="w-6 h-6 text-[var(--gold)]" />
        ) : (
          <Volume2 className="w-6 h-6 text-[var(--gold)]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-2 bg-[var(--gold)]/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--gold)]/60 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-[var(--gold)]/60">
            {formatTime(progress)}
          </span>
          <span className="text-xs text-[var(--gold)]/60">
            {duration > 0 ? formatTime(duration) : "--:--"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Video Player ────────────────────────────────────────────────────────────

function VideoMessage({ url, title }: { url: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const toggle = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
      setStarted(true);
    }
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onEnd = () => {
      setPlaying(false);
    };
    el.addEventListener("ended", onEnd);
    return () => el.removeEventListener("ended", onEnd);
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black/5">
      <video
        ref={videoRef}
        src={url}
        preload="metadata"
        className="w-full max-h-[400px] object-contain"
        playsInline
        aria-label={`Video message: ${title}`}
      >
        {/* User-recorded memorial video has no caption file; placeholder track satisfies a11y */}
        <track kind="captions" />
      </video>
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <button
            onClick={toggle}
            className="w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all hover:scale-105"
            aria-label={`Play ${title}`}
          >
            <Play className="w-8 h-8 text-[var(--gold)] ml-1" />
          </button>
        </div>
      )}
      {started && (
        <button
          onClick={toggle}
          className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Sanitize HTML helper ────────────────────────────────────────────────────

/**
 * Basic HTML sanitizer that strips script tags and event handlers.
 * Content originates from the estate owner's own Firestore entries (TipTap editor),
 * which is trusted first-party data — same pattern as obituary and soul-log display.
 */
function sanitizeHtml(html: string): string {
  // DOMPurify — the hand-rolled regex (strip <script> + quoted on*= only) missed
  // unquoted handlers, javascript: URIs, <svg onload>, <img src=x onerror=...>, etc.
  // This content is owner/writer-authored Soul Log / time-capsule text rendered into
  // the HEIR's authenticated session (a cross-user trust boundary), so a weak filter
  // is a stored-XSS → session-hijack vector. Same tool as the memorial path.
  return DOMPurify.sanitize(html);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HeirWelcome({ estateId, onContinue }: HeirWelcomeProps) {
  const { profile } = useAuth();
  const { data: estate } = useEstate(estateId);

  // The estate owner's profile lives in users/<principalId>, which Firestore (correctly)
  // does NOT let a heir read — reading it only logs `permission-denied` and never returns
  // data (so the owner photo/lifespan never actually loaded for heirs in prod; only the name
  // fallback showed). Source the owner's display name from the estate doc (readable by estate
  // members). Denormalizing owner photo + lifespan onto the estate doc to restore the full
  // memorial welcome for heirs is a tracked follow-up.
  const ownerProfile: Partial<OwnerProfile> | null = estate?.ownerName
    ? { displayName: estate.ownerName }
    : null;

  // Fetch time capsules addressed to this user
  const { data: allCapsules, loading: capsulesLoading } =
    useTimeCapsules(estateId);

  // Fetch soul log entries shared specifically with this heir/executor.
  //
  // HeirWelcome renders ONLY for non-owner roles (heir/executor — see
  // shouldShowHeirWelcome). The Firestore soul-log read rule permits a non-owner to
  // read an entry ONLY when visibility=='shared' && request.auth.uid in sharedWith.
  // An UNconstrained list query by a non-owner cannot satisfy that resource-data
  // constraint, so Firestore rejects the ENTIRE query with permission-denied. We
  // therefore mirror the canonical non-owner constraints from
  // estates.$estateId.soul-log.lazy.tsx (ADR-046 #1): visibility=='shared' +
  // sharedWith array-contains this uid. The composite index (visibility ASC,
  // sharedWith CONTAINS, createdAt DESC) already exists in firestore.indexes.json.
  //
  // The query is gated on `profile.uid` (null path until the uid is known) so we never
  // issue the denied unconstrained read while auth is still resolving.
  const soulLogConstraints = useMemo(
    () => [
      where("visibility", "==", "shared"),
      where("sharedWith", "array-contains", profile?.uid ?? "__none__"),
      orderBy("createdAt", "desc"),
    ],
    [profile?.uid],
  );
  const { data: allSoulLogEntries, loading: soulLogLoading } =
    useCollection<SoulLogEntry>(
      profile?.uid ? `estates/${estateId}/soul-log` : null,
      soulLogConstraints,
    );

  // Fetch heirlooms designated for this heir
  const { data: allHeirlooms, loading: heirloomsLoading } =
    useHeirlooms(estateId);

  // ─── Filter capsules for this user ─────────────────────────────────────

  const personalCapsules = useMemo(() => {
    if (!profile || !allCapsules) return [];
    const email = profile.email?.toLowerCase();
    const name = profile.displayName?.toLowerCase();
    const firstName = profile.firstName?.toLowerCase();
    return allCapsules.filter((c: TimeCapsule) => {
      const rEmail = c.recipientEmail?.toLowerCase();
      const rName = c.recipientName?.toLowerCase();
      return (
        (email && rEmail && rEmail === email) ||
        (name && rName && rName === name) ||
        (firstName && rName && rName === firstName)
      );
    });
  }, [profile, allCapsules]);

  // ─── Soul log entries shared with this user ────────────────────────────

  // The Firestore query above already constrains the result set to
  // visibility=='shared' && sharedWith array-contains this uid — the SAME contract the
  // security rule enforces. So every returned entry is, by construction, shared with
  // this heir/executor; no further client-side filtering is needed. (The previous
  // taggedPeople display-name match was both a schema mismatch with the rule's
  // sharedWith UID gate and redundant once the query is correctly constrained.)
  const personalEntries = useMemo(
    () => allSoulLogEntries ?? [],
    [allSoulLogEntries],
  );

  // ─── Filter heirlooms for this heir ────────────────────────────────────

  const designatedHeirlooms = useMemo(() => {
    if (!profile || !allHeirlooms) return [];
    const name = profile.displayName?.toLowerCase();
    const firstName = profile.firstName?.toLowerCase();
    return allHeirlooms.filter((h: Heirloom) => {
      if (!h.designatedHeir) return false;
      const d = h.designatedHeir.toLowerCase();
      return d === name || d === firstName;
    });
  }, [profile, allHeirlooms]);

  // ─── Owner display info ────────────────────────────────────────────────

  const ownerName =
    ownerProfile?.displayName || estate?.name || "Your loved one";
  const ownerInitials = useMemo(() => {
    const parts = ownerName.split(" ").filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || "?";
  }, [ownerName]);

  const dateSpan = useMemo(() => {
    if (!ownerProfile?.birthDate && !ownerProfile?.deathDate) return null;
    const parts = [ownerProfile.birthDate, ownerProfile.deathDate].filter(
      Boolean,
    );
    return parts.join(" \u2014 ");
  }, [ownerProfile]);

  const hasPersonalMessages =
    personalCapsules.length > 0 || personalEntries.length > 0;
  const isLoading = capsulesLoading || soulLogLoading || heirloomsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[var(--gold-dim)] via-[var(--gold-dim)] to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--gold)]/60 font-medium">
            Preparing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--gold-dim)] via-[var(--gold-dim)] to-white">
      <div className="max-w-2xl mx-auto px-5 py-12 md:py-20">
        {/* Section 1: The Owner's Portrait */}
        <section className="text-center mb-16 md:mb-24">
          {/* Portrait */}
          <div className="mb-8">
            {ownerProfile?.profilePhotoUrl ? (
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-[0_8px_40px_rgba(200,169,81,0.15)]">
                <img
                  src={ownerProfile.profilePhotoUrl}
                  alt={ownerName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/5 border-4 border-white shadow-[0_8px_40px_rgba(200,169,81,0.12)] flex items-center justify-center">
                <span className="text-4xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--gold)]/70">
                  {ownerInitials}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--gold)] tracking-tight mb-3 leading-tight">
            {ownerName}
          </h1>

          {/* Date span */}
          {dateSpan && (
            <p className="text-lg text-[var(--gold)]/70 font-light tracking-wide">
              {dateSpan}
            </p>
          )}

          {/* Subtle heart divider */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-12 h-px bg-[var(--gold)]/20" />
            <Heart className="w-4 h-4 text-[var(--gold)]/30" />
            <div className="w-12 h-px bg-[var(--gold)]/20" />
          </div>
        </section>

        {/* Section 2: Personal Messages */}
        <section className="mb-16 md:mb-24">
          {hasPersonalMessages ? (
            <div className="space-y-8">
              {/* Time Capsules */}
              {personalCapsules.map((capsule) => (
                <MessageCard
                  key={`capsule-${capsule.id}`}
                  ownerName={ownerName}
                  title={capsule.title || `A message from ${ownerName}`}
                  type="text"
                  content={capsule.message}
                />
              ))}

              {/* Soul Log Entries */}
              {personalEntries.map((entry) => (
                <MessageCard
                  key={`entry-${entry.id}`}
                  ownerName={ownerName}
                  title={entry.title || `A message from ${ownerName}`}
                  type={entry.type}
                  content={entry.content}
                  mediaUrl={entry.mediaUrl}
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-3xl border-0 shadow-[0_4px_24px_rgba(200,169,81,0.08)] bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 md:p-12 text-center">
                <p className="text-[var(--gold)] text-lg leading-relaxed font-light">
                  No personal messages were left for you, but{" "}
                  <span className="font-medium">{ownerName}</span>&rsquo;s
                  estate is organized and ready for you below.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Section 3: Designated Heirlooms */}
        {designatedHeirlooms.length > 0 && (
          <section className="mb-16 md:mb-24">
            <div className="flex items-center gap-3 mb-8">
              <Gift className="w-5 h-5 text-[var(--gold)]/50" />
              <h2 className="text-sm font-bold text-[var(--gold)]/50 uppercase tracking-[0.15em]">
                Meant for You
              </h2>
            </div>

            <div className="space-y-6">
              {designatedHeirlooms.map((heirloom) => (
                <Card
                  key={heirloom.id}
                  className="rounded-3xl border-0 shadow-[0_4px_24px_rgba(200,169,81,0.08)] bg-white/80 backdrop-blur-sm overflow-hidden"
                >
                  <CardContent className="p-0">
                    {heirloom.photoUrls && heirloom.photoUrls.length > 0 && (
                      <div className="h-48 md:h-56 overflow-hidden">
                        <img
                          src={heirloom.photoUrls[0]}
                          alt={heirloom.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-8 md:p-10">
                      <p className="text-xs font-bold text-[var(--gold)]/60 uppercase tracking-[0.15em] mb-3">
                        This was meant for you
                      </p>
                      <h3 className="text-xl font-bold text-[var(--gold)] mb-3">
                        {heirloom.name}
                      </h3>
                      {heirloom.description && (
                        <p className="text-[var(--gold)]/80 leading-relaxed mb-4">
                          {heirloom.description}
                        </p>
                      )}
                      {heirloom.provenance && (
                        <div className="bg-[var(--gold-dim)] rounded-2xl p-5 mt-4">
                          <p className="text-xs font-bold text-[var(--gold)]/40 uppercase tracking-[0.15em] mb-2">
                            Its Story
                          </p>
                          <p className="text-sm text-[var(--gold)]/70 leading-relaxed italic">
                            {heirloom.provenance}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: The Transition */}
        <section className="text-center pt-8 pb-16">
          <Separator className="bg-[var(--gold)]/10 mb-12" />

          <p className="text-[var(--gold)]/60 text-sm mb-8 leading-relaxed max-w-md mx-auto">
            When you&rsquo;re ready, you can view the full estate &mdash;
            documents, assets, and everything {ownerName} organized for you.
          </p>

          <Button
            onClick={onContinue}
            className={cn(
              "bg-[var(--gold)] hover:bg-[var(--gold)] text-white",
              "px-10 py-5 h-auto rounded-2xl",
              "font-medium text-[15px] tracking-wide",
              "shadow-[0_8px_30px_rgba(44,24,16,0.12)]",
              "transition-all hover:shadow-[0_12px_40px_rgba(44,24,16,0.18)]",
            )}
          >
            <ChevronDown className="w-4 h-4" />
            View Estate Details
          </Button>
        </section>
      </div>
    </div>
  );
}

// ─── Message Card ────────────────────────────────────────────────────────────

function MessageCard({
  ownerName,
  title,
  type,
  content,
  mediaUrl,
}: {
  ownerName: string;
  title: string;
  type: "video" | "audio" | "text";
  content?: string;
  mediaUrl?: string;
}) {
  return (
    <Card className="rounded-3xl border-0 shadow-[0_4px_24px_rgba(200,169,81,0.08)] bg-white/80 backdrop-blur-sm">
      <CardContent className="p-8 md:p-10">
        {/* Header */}
        <p className="text-xs font-bold text-[var(--gold)]/60 uppercase tracking-[0.15em] mb-2">
          A message from {ownerName}
        </p>
        <h3 className="text-xl font-bold text-[var(--gold)] mb-6">{title}</h3>

        {/* Content by type */}
        {type === "text" && content && (
          <div
            className="text-[var(--gold)] text-[16px] leading-[1.85] font-light prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
          />
        )}

        {type === "audio" && mediaUrl && (
          <AudioMessage url={mediaUrl} title={title} />
        )}

        {type === "video" && mediaUrl && (
          <VideoMessage url={mediaUrl} title={title} />
        )}

        {/* Fallback: audio/video without URL */}
        {type === "audio" && !mediaUrl && (
          <p className="text-[var(--gold)]/50 text-sm italic">
            Audio message is being prepared...
          </p>
        )}
        {type === "video" && !mediaUrl && (
          <p className="text-[var(--gold)]/50 text-sm italic">
            Video message is being prepared...
          </p>
        )}

        {/* Show text content alongside audio/video if present */}
        {type !== "text" && content && (
          <div
            className="mt-6 pt-6 border-t border-[var(--gold)]/10 text-[var(--gold)]/70 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Utility: Check if welcome screen should show ────────────────────────────

export function shouldShowHeirWelcome(
  profile: UserProfile | null,
  estateStatus: string | undefined,
  estateId: string,
  estateRole?: string | null,
): boolean {
  if (!profile) return false;

  // Check estate-specific role first (from estate_users junction),
  // then fall back to the global profile role.
  // This handles users who are a principal on their own estate
  // but an heir/executor on someone else's estate.
  const role = estateRole || profile.role;
  if (role !== "heir" && role !== "executor") return false;

  const userId = profile.uid;
  const key = `fw_welcome_seen_${estateId}_${userId}`;

  // Already seen — don't show
  if (typeof window !== "undefined" && localStorage.getItem(key)) {
    return false;
  }

  // Show if estate is in settlement or if first visit (no localStorage flag)
  const isSettlement =
    estateStatus === "in_settlement" ||
    estateStatus === "death_reported" ||
    estateStatus === "executor_confirmed";
  const isFirstVisit =
    typeof window !== "undefined" && !localStorage.getItem(key);

  return isSettlement || isFirstVisit;
}

export function markWelcomeSeen(estateId: string, userId: string): void {
  const key = `fw_welcome_seen_${estateId}_${userId}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(key, new Date().toISOString());
  }
}
