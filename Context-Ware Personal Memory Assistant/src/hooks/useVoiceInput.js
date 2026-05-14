/**
 * useVoiceInput Hook
 * Provides speech-to-text recording and intelligent field extraction.
 * Uses the Web Speech API (SpeechRecognition) with a graceful fallback
 * for unsupported browsers.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Browser compatibility ────────────────────────────────────────────────────
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

const isSpeechSupported = Boolean(SpeechRecognition);

// ─── Smart parser ─────────────────────────────────────────────────────────────
/**
 * Parse a spoken sentence into { name, relation, lastConversation }.
 *
 * Handles patterns like:
 *  "This is my friend Ruth, we discussed matrices"
 *  "Riya is my cousin, we talked about exams"
 *  "My brother Arjun and I discussed cricket yesterday"
 *  "This is my Ruth/Mars, she is my friend, we talked about vectors"
 *
 * @param {string} text - Raw transcript text
 * @returns {{ name: string, relation: string, lastConversation: string }}
 */
export function parseVoiceInput(text) {
  if (!text || !text.trim()) return { name: '', relation: '', lastConversation: '' };

  const t = text.trim();

  // ── Relation keywords ────────────────────────────────────────────────────
  const relationKeywords = [
    'friend', 'best friend', 'close friend',
    'brother', 'sister', 'mother', 'father', 'mom', 'dad',
    'cousin', 'uncle', 'aunt', 'nephew', 'niece',
    'colleague', 'coworker', 'co-worker', 'classmate', 'batchmate',
    'roommate', 'neighbour', 'neighbor',
    'boyfriend', 'girlfriend', 'partner', 'husband', 'wife',
    'mentor', 'teacher', 'professor', 'student',
    'manager', 'boss', 'subordinate',
    'acquaintance', 'contact',
  ];

  // ── Conversation trigger phrases ─────────────────────────────────────────
  const convTriggers = [
    'we talked about', 'we discussed', 'we spoke about', 'we chatted about',
    'we were talking about', 'i talked to', 'i discussed', 'we had a conversation about',
    'we mentioned', 'we said', 'we covered', 'we went over',
    'conversation was about', 'talk was about',
  ];

  let name = '';
  let relation = '';
  let lastConversation = '';

  // ── Step 1: Extract conversation ─────────────────────────────────────────
  let remainingText = t;
  for (const trigger of convTriggers) {
    const idx = remainingText.toLowerCase().indexOf(trigger);
    if (idx !== -1) {
      lastConversation = remainingText.slice(idx + trigger.length).trim();
      // Capitalize first letter
      if (lastConversation) {
        lastConversation = lastConversation.charAt(0).toUpperCase() + lastConversation.slice(1);
      }
      remainingText = remainingText.slice(0, idx).trim();
      // Remove trailing comma/connector
      remainingText = remainingText.replace(/[,;]\s*(and\s+i|and\s+me|and)?$/i, '').trim();
      break;
    }
  }

  // ── Step 2: Extract relation ──────────────────────────────────────────────
  // Sort by length desc so "best friend" matches before "friend"
  const sortedRelations = [...relationKeywords].sort((a, b) => b.length - a.length);
  for (const rel of sortedRelations) {
    // Match patterns like "my friend Ruth", "she is my friend", "is my cousin"
    const patterns = [
      new RegExp(`\\bmy\\s+${rel}\\b`, 'i'),
      new RegExp(`\\bis\\s+my\\s+${rel}\\b`, 'i'),
      new RegExp(`\\b${rel}\\b`, 'i'),
    ];
    for (const pat of patterns) {
      if (pat.test(remainingText)) {
        relation = rel.charAt(0).toUpperCase() + rel.slice(1);
        // Remove the matched relation phrase from remaining text for name extraction
        remainingText = remainingText
          .replace(new RegExp(`\\bmy\\s+${rel}\\b`, 'i'), '')
          .replace(new RegExp(`\\bis\\s+my\\s+${rel}\\b`, 'i'), '')
          .replace(new RegExp(`\\b${rel}\\b`, 'i'), '')
          .trim();
        break;
      }
    }
    if (relation) break;
  }

  // ── Step 3: Extract name ──────────────────────────────────────────────────
  // Remove filler phrases
  const fillers = [
    /^this\s+is\s+my\s*/i,
    /^this\s+is\s*/i,
    /^(he|she|they)\s+is\s*/i,
    /^(he|she|they)\s+are\s*/i,
    /^my\s*/i,
    /\s*and\s+(i|me)\s*$/i,
    /,\s*$/,
  ];
  let namePart = remainingText;
  for (const filler of fillers) {
    namePart = namePart.replace(filler, '').trim();
  }

  // Find a proper noun — first capitalized word that isn't a stop word
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'we', 'i', 'he', 'she', 'they',
    'my', 'our', 'your', 'his', 'her', 'its', 'and', 'or', 'but',
    'this', 'that', 'with', 'from', 'about', 'also',
  ]);

  // Try to find a word that starts with a capital letter
  const words = namePart.split(/[\s,;/]+/);
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z'-]/g, '');
    if (clean.length > 1 && /^[A-Z]/.test(clean) && !stopWords.has(clean.toLowerCase())) {
      name = clean;
      break;
    }
  }

  // Fallback: take first non-stop word and capitalize it
  if (!name) {
    for (const word of words) {
      const clean = word.replace(/[^a-zA-Z'-]/g, '');
      if (clean.length > 1 && !stopWords.has(clean.toLowerCase())) {
        name = clean.charAt(0).toUpperCase() + clean.slice(1);
        break;
      }
    }
  }

  return { name, relation, lastConversation };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * @param {Object} options
 * @param {Function} options.onResult  - Called with { name, relation, lastConversation, transcript }
 * @param {Function} [options.onError] - Called with error message string
 */
export function useVoiceInput({ onResult, onError } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!isSpeechSupported) {
      const msg = 'Speech recognition is not supported in your browser. Please use Chrome or Edge.';
      setError(msg);
      onError?.(msg);
      return;
    }

    if (isRecording) return;

    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (mountedRef.current) {
        setIsRecording(true);
        setIsProcessing(false);
      }
    };

    recognition.onresult = (event) => {
      const raw = event.results[0]?.[0]?.transcript || '';
      if (mountedRef.current) {
        setTranscript(raw);
        setIsProcessing(true);
        setIsRecording(false);
      }

      try {
        const parsed = parseVoiceInput(raw);
        if (mountedRef.current) {
          setIsProcessing(false);
          onResult?.({ ...parsed, transcript: raw });
        }
      } catch (err) {
        if (mountedRef.current) {
          setIsProcessing(false);
          const msg = `Failed to parse speech: ${err.message}`;
          setError(msg);
          onError?.(msg);
        }
      }
    };

    recognition.onerror = (event) => {
      if (!mountedRef.current) return;
      setIsRecording(false);
      setIsProcessing(false);

      let msg = 'Speech recognition error';
      if (event.error === 'not-allowed') {
        msg = 'Microphone access denied. Please allow microphone permissions and try again.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech detected. Please try again.';
      } else if (event.error === 'network') {
        msg = 'Network error during speech recognition. Check your connection.';
      } else {
        msg = `Speech error: ${event.error}`;
      }
      setError(msg);
      onError?.(msg);
    };

    recognition.onend = () => {
      if (mountedRef.current) {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setError(`Could not start recording: ${err.message}`);
      setIsRecording(false);
    }
  }, [isRecording, onResult, onError]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsRecording(false);
    }
  }, [isRecording]);

  const clearError = useCallback(() => setError(null), []);
  const clearTranscript = useCallback(() => setTranscript(''), []);

  return {
    isSupported: isSpeechSupported,
    isRecording,
    isProcessing,
    transcript,
    error,
    startRecording,
    stopRecording,
    clearError,
    clearTranscript,
  };
}

export default useVoiceInput;
