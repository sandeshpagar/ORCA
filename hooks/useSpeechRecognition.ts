"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API TypeScript Interfaces
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface UseSpeechRecognitionOptions {
  languageLocale?: string;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({
  languageLocale = "en-IN",
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Keep callback references stable to prevent unnecessary re-creation of listeners
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Detach listeners before aborting to prevent unmounted setState and race conditions
  const cleanupRecognition = (rec: ISpeechRecognition | null) => {
    if (!rec) return;
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch (e) {
      // Ignore abort errors
    }
  };

  // Check browser support on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionClass);
    }
  }, []);

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    setIsListening(false);
  }, []);

  // Clear error message helper
  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Start listening helper
  const startListening = useCallback(
    (locale?: string) => {
      setErrorMessage(null);

      if (typeof window === "undefined") return;

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        const err = "Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.";
        setErrorMessage(err);
        onErrorRef.current?.(err);
        return;
      }

      // Safely cleanup any active instance before re-instantiating
      if (recognitionRef.current) {
        cleanupRecognition(recognitionRef.current);
        recognitionRef.current = null;
      }

      try {
        const recognition: ISpeechRecognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = locale || languageLocale || "en-IN";

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        // Accumulate full transcript across all continuous segments from index 0
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript + " ";
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          const currentText = (finalTranscript + interimTranscript).trim();
          if (currentText) {
            onTranscriptRef.current?.(currentText, Boolean(finalTranscript));
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Ignore harmless aborted (user cancelled) or no-speech events
          if (event.error === "no-speech" || event.error === "aborted") {
            return;
          }

          let errText = "Error during speech recognition.";
          if (event.error === "not-allowed") {
            errText = "Microphone access was denied. Please allow microphone permissions in your browser.";
          } else if (event.error === "network") {
            errText = "Network error during speech recognition.";
          } else if (event.error === "language-not-supported") {
            errText = `Voice recognition in this language (${recognition.lang}) is not supported on this device.`;
          }

          setErrorMessage(errText);
          onErrorRef.current?.(errText);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        const msg = err?.message || "Failed to initialize microphone.";
        setErrorMessage(msg);
        onErrorRef.current?.(msg);
        setIsListening(false);
      }
    },
    [languageLocale]
  );

  const toggleListening = useCallback(
    (locale?: string) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(locale);
      }
    },
    [isListening, startListening, stopListening]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition(recognitionRef.current);
      recognitionRef.current = null;
    };
  }, []);

  return {
    isListening,
    isSupported,
    errorMessage,
    clearError,
    startListening,
    stopListening,
    toggleListening,
  };
}
