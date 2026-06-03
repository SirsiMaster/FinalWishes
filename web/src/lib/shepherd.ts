/**
 * Shepherd — the voice and heart of FinalWishes.
 *
 * Client for the live AI guidance engine (`/api/v1/guidance/*`). Shepherd speaks
 * with the user about their estate; the backend enriches every reply with estate
 * context and (for legal topics) the approved legal corpus.
 */
import { auth } from './firebase';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = isLocal ? 'http://localhost:8080' : (import.meta.env.VITE_API_URL || '');

export interface ShepherdMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Citation {
  id: string;
  title: string;
  jurisdiction: string;
  reference: string;
}

export interface ShepherdReply {
  reply: string;
  suggestedActions: string[];
  citations?: Citation[];
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Send a message to Shepherd. `history` is the prior turns (oldest first).
 * Returns Shepherd's reply, suggested next actions, and any legal citations.
 */
export async function askShepherd(
  estateId: string,
  message: string,
  history: ShepherdMessage[] = [],
): Promise<ShepherdReply> {
  const res = await fetch(`${API_BASE}/api/v1/guidance/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ estateId, message, conversationHistory: history }),
  });
  if (!res.ok) {
    if (res.status === 503) throw new Error('Shepherd is resting right now — please try again in a moment.');
    let msg = 'Shepherd could not respond right now.';
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) msg = err.error;
    } catch {
      /* non-JSON */
    }
    throw new Error(msg);
  }
  return (await res.json()) as ShepherdReply;
}

/**
 * A warm, time-aware greeting line. Personal, never clinical (ETHOS §"The
 * Shepherd AI should speak like a trusted friend").
 */
export function shepherdGreeting(firstName?: string): string {
  const hour = new Date().getHours();
  const part = hour < 5 ? 'late night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const name = firstName?.trim() ? `, ${firstName.trim()}` : '';
  if (part === 'late night') return `It's late${name}. I'm here if you can't sleep.`;
  return `Good ${part}${name}. I'm glad you're here.`;
}

/** A few gentle, ETHOS-voiced openers offered as quick prompts. */
export const SHEPHERD_OPENERS: { label: string; prompt: string }[] = [
  { label: 'Where should I begin?', prompt: 'Where should I begin today?' },
  { label: 'I have a memory to keep', prompt: 'I have a thought or memory I want to preserve. Help me start.' },
  { label: 'Write a letter to someone', prompt: 'I want to write a letter to someone I love. Where do I start?' },
  { label: 'What matters most right now?', prompt: 'Of everything left to do, what matters most for my family right now?' },
];
