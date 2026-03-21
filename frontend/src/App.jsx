import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { useEffect, useMemo, useRef, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "").trim() || (import.meta.env.DEV ? "http://localhost:5000" : "https://isl-bridge-backend-ol16.onrender.com");
const MAX_SEQUENCE_FRAMES = 12;
const MIN_SEQUENCE_FRAMES = 6;
const STABLE_PREDICTION_WINDOW = 4;
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const MODES = {
  signToText: "signToText",
  signToSpeech: "signToSpeech",
  speechToText: "speechToText",
};

const COPY = {
  en: {
    badge: "Real-Time Sign Language Translator",
    title: "ISL Bridge",
    subtitle:
      "One browser app for sign-to-text, sign-to-speech, and speech-to-text communication.",
    chooseMode: "Choose a mode",
    signToText: "Mute -> Deaf",
    signToSpeech: "Mute -> Hearing",
    speechToText: "Hearing -> Deaf",
    startCamera: "Start Signing",
    stopCamera: "Stop Camera",
    startListening: "Speak Now",
    stopListening: "Stop Listening",
    clear: "Clear",
    translation: "Translation",
    confidence: "Confidence",
    backend: "Backend Status",
    online: "Online",
    offline: "Offline",
    setupNeeded: "Setup Needed",
    heuristic: "Heuristic demo model",
    trained: "TensorFlow model",
    output: "Live Output",
    history: "Recent Conversations",
    noHistory: "No conversations yet.",
    noHand: "Show one hand clearly inside the camera frame.",
    listening: "Listening...",
    ready: "Ready",
    cameraHint: "MediaPipe hand tracking runs directly in the browser.",
    micHint: "Chrome or Edge gives the best speech recognition support.",
    backendConfigHint: "Set VITE_API_URL in the frontend deployment to connect the backend.",
    backendOfflineHint: "The frontend could not reach the backend health endpoint.",
  },
  hi: {
    badge: "ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â¯ÃƒÂ Ã‚Â¤Ã‚Â²-ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Â® ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Â¨ ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã¢â‚¬â€ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã…â€œ ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¤Ã‚Â°",
    title: "ÃƒÂ Ã‚Â¤Ã¢â‚¬Â ÃƒÂ Ã‚Â¤Ã‹â€ ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â² ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã…â€œ",
    subtitle:
      "ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â°ÃƒÂ Ã‚Â¤Ã…â€œÃƒÂ Ã‚Â¤Ã‚Â¼ÃƒÂ Ã‚Â¤Ã‚Â° ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Âª ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ sign-to-text, sign-to-speech ÃƒÂ Ã‚Â¤Ã¢â‚¬ÂÃƒÂ Ã‚Â¤Ã‚Â° speech-to-text communication.",
    chooseMode: "ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¹ÃƒÂ Ã‚Â¤Ã‚Â¡ ÃƒÂ Ã‚Â¤Ã…Â¡ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡",
    signToText: "ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ -> ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¤Ã‚Â§ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â°",
    signToSpeech: "ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ -> ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¾",
    speechToText: "ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¾ -> ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¤Ã‚Â§ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â°",
    startCamera: "ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Â¨ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡",
    stopCamera: "ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¾ ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¦ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡",
    startListening: "ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¹ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡",
    stopListening: "ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¤Ã‚Â¾ ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¦ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡",
    clear: "ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â«ÃƒÂ Ã‚Â¤Ã‚Â¼ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡",
    translation: "ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¦ÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â¦",
    confidence: "ÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â¶ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â¸",
    backend: "ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¡ ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¤Ã‚Â¸",
    online: "ÃƒÂ Ã‚Â¤Ã¢â‚¬ËœÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Â¨",
    offline: "ÃƒÂ Ã‚Â¤Ã¢â‚¬ËœÃƒÂ Ã‚Â¤Ã‚Â«ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Â¨",
    setupNeeded: "ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¦ÃƒÂ Ã‚Â¤Ã‚Âª ÃƒÂ Ã‚Â¤Ã…Â¡ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â",
    heuristic: "ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¯ÃƒÂ Ã‚Â¥Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ ÃƒÂ Ã‚Â¤Ã‚Â¡ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¹ ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â°ÃƒÂ Ã‚Â¤Ã‚Â¡ÃƒÂ Ã‚Â¤Ã‚Â²",
    trained: "ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â«ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¹ ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â°ÃƒÂ Ã‚Â¤Ã‚Â¡ÃƒÂ Ã‚Â¤Ã‚Â²",
    output: "ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Âµ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â ÃƒÂ Ã‚Â¤Ã¢â‚¬Â°ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¤Ã‚ÂªÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã…Â¸",
    history: "ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â² ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â¤ÃƒÂ Ã‚Â¤Ã…Â¡ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ÃƒÂ Ã‚Â¤Ã‚Â¤",
    noHistory: "ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¦ÃƒÂ Ã‚Â¤Ã‚Â­ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ ÃƒÂ Ã‚Â¤Ã‚Â¤ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¹ÃƒÂ Ã‚Â¤Ã‹â€  ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â¤ÃƒÂ Ã‚Â¤Ã…Â¡ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ÃƒÂ Ã‚Â¤Ã‚Â¤ ÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¥Ã‚Â¤",
    noHand: "ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã‚Â«ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã‚Â® ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â¥ ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â«ÃƒÂ Ã‚Â¤Ã‚Â¼ ÃƒÂ Ã‚Â¤Ã‚Â¦ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã¢â‚¬â€œÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¥Ã‚Â¤",
    listening: "ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¨ ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¤Ã‚Â¾ ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã‹â€ ...",
    ready: "ÃƒÂ Ã‚Â¤Ã‚Â¤ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¤Ã‚Â¯ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â°",
    cameraHint: "MediaPipe hand tracking ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ÃƒÂ Ã‚Â¤Ã‚Â§ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â°ÃƒÂ Ã‚Â¤Ã…â€œÃƒÂ Ã‚Â¤Ã‚Â¼ÃƒÂ Ã‚Â¤Ã‚Â° ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ ÃƒÂ Ã‚Â¤Ã…Â¡ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¤ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¥Ã‚Â¤",
    micHint: "ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¦ÃƒÂ Ã‚Â¤Ã…Â¡ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬ÂºÃƒÂ Ã‚Â¤Ã‚Â¾ speech recognition Chrome ÃƒÂ Ã‚Â¤Ã‚Â¯ÃƒÂ Ã‚Â¤Ã‚Â¾ Edge ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬â€ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¥Ã‚Â¤",
    backendConfigHint: "ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¡ ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã…â€œÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¡ÃƒÂ Ã‚Â¤Ã‚Â¼ÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¿ÃƒÂ Ã‚Â¤Ã‚Â frontend deployment ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ VITE_API_URL ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã…Â¸ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¥Ã‚Â¤",
    backendOfflineHint: "ÃƒÂ Ã‚Â¤Ã‚Â«ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã…Â¸ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¡ ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã‹â€ ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã‚Â¡ health endpoint ÃƒÂ Ã‚Â¤Ã‚Â¤ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ ÃƒÂ Ã‚Â¤Ã‚Â¨ÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã¢â€šÂ¬ÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ ÃƒÂ Ã‚Â¤Ã‚ÂªÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã¢â‚¬Å¡ÃƒÂ Ã‚Â¤Ã…Â¡ ÃƒÂ Ã‚Â¤Ã‚Â¸ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¥Ã‚Â¤",
  },
};

function formatTranscript(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^\w)/, (match) => match.toUpperCase());
}

function cloneLandmarks(landmarks) {
  return landmarks.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
  }));
}

function cloneHands(landmarksList = [], handednesses = []) {
  return landmarksList
    .map((landmarks, index) => {
      const category = handednesses[index]?.[0];
      return {
        label: category?.displayName || category?.categoryName || `Hand ${index + 1}`,
        score: category?.score || 0,
        landmarks: cloneLandmarks(landmarks),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getStablePrediction(predictions) {
  if (!predictions.length) {
    return null;
  }

  const counts = predictions.reduce((accumulator, prediction) => {
    accumulator[prediction] = (accumulator[prediction] || 0) + 1;
    return accumulator;
  }, {});

  const [label, count] = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];
  return count >= Math.ceil(predictions.length / 2) ? label : null;
}

function flattenLatestLandmarks(frames = []) {
  const latestFrame = frames[frames.length - 1];
  const landmarks = latestFrame?.hands?.[0]?.landmarks;
  if (!landmarks || landmarks.length !== 21) {
    return [];
  }

  return landmarks.flatMap((point) => [point.x, point.y, point.z]);
}

function distance2D(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function averagePoint(points) {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
      z: accumulator.z + point.z,
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

function isFingerExtended(hand, tipIndex, pipIndex, mcpIndex) {
  const tip = hand.landmarks[tipIndex];
  const pip = hand.landmarks[pipIndex];
  const mcp = hand.landmarks[mcpIndex];
  return tip.y < pip.y && pip.y < mcp.y && mcp.y - tip.y > 0.05;
}

function isFingerCurled(hand, tipIndex, pipIndex) {
  const tip = hand.landmarks[tipIndex];
  const pip = hand.landmarks[pipIndex];
  return tip.y >= pip.y - 0.01;
}

function isThumbRaised(hand) {
  const wrist = hand.landmarks[0];
  const thumbCmc = hand.landmarks[1];
  const thumbMcp = hand.landmarks[2];
  const thumbIp = hand.landmarks[3];
  const thumbTip = hand.landmarks[4];
  const indexMcp = hand.landmarks[5];

  return (
    thumbTip.y < thumbIp.y &&
    thumbIp.y < thumbMcp.y &&
    thumbMcp.y < thumbCmc.y &&
    wrist.y - thumbTip.y > 0.07 &&
    distance2D(thumbTip, indexMcp) > distance2D(thumbMcp, indexMcp) + 0.01
  );
}

function isThumbSideways(hand) {
  const thumbTip = hand.landmarks[4];
  const thumbMcp = hand.landmarks[2];
  const deltaX = Math.abs(thumbTip.x - thumbMcp.x);
  const deltaY = Math.abs(thumbTip.y - thumbMcp.y);

  return deltaX > 0.08 && deltaX > deltaY * 0.9;
}

function isThumbAcrossPalm(hand) {
  const thumbTip = hand.landmarks[4];
  const palmCenter = averagePoint([
    hand.landmarks[0],
    hand.landmarks[5],
    hand.landmarks[9],
    hand.landmarks[13],
    hand.landmarks[17],
  ]);

  return distance2D(thumbTip, palmCenter) < 0.18 && thumbTip.y > hand.landmarks[5].y - 0.03;
}

function isOpenPalm(hand) {
  return (
    isFingerExtended(hand, 8, 6, 5) &&
    isFingerExtended(hand, 12, 10, 9) &&
    isFingerExtended(hand, 16, 14, 13) &&
    isFingerExtended(hand, 20, 18, 17)
  );
}

function detectStaticDemoGesture(hand) {
  const indexExtended = isFingerExtended(hand, 8, 6, 5);
  const middleExtended = isFingerExtended(hand, 12, 10, 9);
  const ringExtended = isFingerExtended(hand, 16, 14, 13);
  const pinkyExtended = isFingerExtended(hand, 20, 18, 17);
  const indexCurled = isFingerCurled(hand, 8, 6);
  const middleCurled = isFingerCurled(hand, 12, 10);
  const ringCurled = isFingerCurled(hand, 16, 14);
  const pinkyCurled = isFingerCurled(hand, 20, 18);

  if (isThumbRaised(hand) && indexCurled && middleCurled && ringCurled && pinkyCurled) {
    return { label: "YES", confidence: 0.99, mode: "demo_thumbs_up" };
  }

  if (indexExtended && middleCurled && ringCurled && pinkyCurled) {
    const indexTip = hand.landmarks[8];
    const indexMcp = hand.landmarks[5];
    if (indexTip.z < indexMcp.z - 0.05) {
      return { label: "YOU", confidence: 0.98, mode: "demo_point" };
    }
  }

  if (indexExtended && middleCurled && ringCurled && pinkyCurled && isThumbSideways(hand)) {
    return { label: "L", confidence: 0.99, mode: "demo_l" };
  }

  if (
    indexExtended &&
    middleExtended &&
    ringExtended &&
    pinkyExtended &&
    isThumbAcrossPalm(hand)
  ) {
    return { label: "B", confidence: 0.99, mode: "demo_b" };
  }

  return null;
}

function detectWaveGesture(frames = []) {
  const recentFrames = frames.slice(-8);
  if (recentFrames.length < 6) {
    return null;
  }

  const currentHand = recentFrames[recentFrames.length - 1]?.hands?.[0];
  if (!currentHand || !isOpenPalm(currentHand)) {
    return null;
  }

  const wristXs = recentFrames
    .map((frame) => frame?.hands?.[0]?.landmarks?.[0]?.x)
    .filter((value) => Number.isFinite(value));

  if (wristXs.length < 6) {
    return null;
  }

  const horizontalRange = Math.max(...wristXs) - Math.min(...wristXs);
  let directionChanges = 0;
  let previousDirection = 0;

  for (let index = 1; index < wristXs.length; index += 1) {
    const delta = wristXs[index] - wristXs[index - 1];
    const direction = Math.abs(delta) < 0.008 ? 0 : Math.sign(delta);
    if (direction && previousDirection && direction !== previousDirection) {
      directionChanges += 1;
    }
    if (direction) {
      previousDirection = direction;
    }
  }

  if (horizontalRange > 0.08 && directionChanges >= 1) {
    return { label: "HELLO", confidence: 0.98, mode: "demo_wave" };
  }

  return null;
}

function detectDemoGesture(frames = []) {
  const latestHand = frames[frames.length - 1]?.hands?.[0];
  if (!latestHand) {
    return null;
  }

  return detectWaveGesture(frames) || detectStaticDemoGesture(latestHand);
}

function useSpeechRecognition(language, onTranscript) {
  const recognitionRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ");
      onTranscript(formatTranscript(transcript));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language, onTranscript]);

  return {
    supported,
    listening,
    start: () => recognitionRef.current?.start(),
    stop: () => recognitionRef.current?.stop(),
  };
}

function App() {
  const [language, setLanguage] = useState(
    () => window.localStorage.getItem("isl-bridge-language") || "en",
  );
  const [mode, setMode] = useState(MODES.signToText);
  const [recognitionTarget, setRecognitionTarget] = useState("alphabet");
  const [translation, setTranslation] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [cameraActive, setCameraActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [backendHealth, setBackendHealth] = useState({
    ok: false,
    checked: false,
    configured: Boolean(API_URL),
    modelType: "heuristic",
    predictionInput: "landmarks",
    supportedInputs: ["landmarks"],
    supportedTargets: ["alphabet"],
  });
  const [error, setError] = useState("");

  const t = COPY[language];
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const cameraRunningRef = useRef(false);
  const trackingSessionRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastPredictionRef = useRef(0);
  const lastPhraseRef = useRef("");
  const lastSpokenRef = useRef("");
  const lastSpeechSavedRef = useRef("");
  const backendConfigRef = useRef({ predictionInput: "landmarks" });
  const sequenceBufferRef = useRef([]);
  const predictionWindowRef = useRef([]);
  const demoPredictionWindowRef = useRef([]);

  const speechRecognition = useSpeechRecognition(language, (text) => {
    setTranslation(text);
    setConfidence(text ? 0.99 : 0);
    if (text) {
      setStatus(t.listening);
      if (text !== lastSpeechSavedRef.current) {
        lastSpeechSavedRef.current = text;
        persistConversation("speech_to_text", text, 0.99);
      }
    }
  });

  const modeCards = useMemo(
    () => [
      { id: MODES.signToText, label: t.signToText, accent: "from-cyan to-emerald-500" },
      { id: MODES.signToSpeech, label: t.signToSpeech, accent: "from-gold to-coral" },
      { id: MODES.speechToText, label: t.speechToText, accent: "from-indigo-500 to-cyan" },
    ],
    [t],
  );

  useEffect(() => {
    window.localStorage.setItem("isl-bridge-language", language);
  }, [language]);

  useEffect(() => {
    backendConfigRef.current = {
      predictionInput: backendHealth.predictionInput || "landmarks",
    };
  }, [backendHealth.predictionInput]);

  useEffect(() => {
    let ignore = false;

    if (!API_URL) {
      setBackendHealth({
        ok: false,
        checked: true,
        configured: false,
        modelType: "heuristic",
        predictionInput: "landmarks",
        supportedInputs: ["landmarks"],
        supportedTargets: ["alphabet"],
      });
      return () => {
        ignore = true;
      };
    }

    fetch(`${API_URL}/health`)
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) {
          const predictionInput = data.prediction_input || "landmarks";
          setBackendHealth({
            ok: true,
            checked: true,
            configured: true,
            modelType: data.model_type || (data.model === "loaded" ? "tensorflow" : "heuristic"),
            predictionInput,
            supportedInputs:
              Array.isArray(data.supported_inputs) && data.supported_inputs.length
                ? data.supported_inputs
                : [predictionInput],
            supportedTargets:
              Array.isArray(data.supported_targets) && data.supported_targets.length
                ? data.supported_targets
                : ["alphabet"],
          });
        }
      })
      .catch(() => {
        if (!ignore) {
          setBackendHealth({
            ok: false,
            checked: true,
            configured: true,
            modelType: "heuristic",
            predictionInput: "landmarks",
            supportedInputs: ["landmarks"],
            supportedTargets: ["alphabet"],
          });
        }
      });

    // Conversation history stays local for this backend integration.

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== MODES.speechToText) {
      speechRecognition.stop();
    }
  }, [mode]);

  useEffect(() => {
    if (
      backendHealth.ok &&
      recognitionTarget !== "general" &&
      !backendHealth.supportedTargets.includes(recognitionTarget)
    ) {
      setRecognitionTarget("general");
    }
  }, [backendHealth, recognitionTarget]);

  useEffect(() => {
    if (mode === MODES.speechToText) {
      stopCamera();
    }
  }, [mode]);

  useEffect(() => {
    if (
      mode === MODES.signToSpeech &&
      translation &&
      translation !== lastSpokenRef.current
    ) {
      const utterance = new SpeechSynthesisUtterance(translation);
      utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      lastSpokenRef.current = translation;
    }
  }, [language, mode, translation]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function loadHandLandmarker() {
    if (handLandmarkerRef.current) {
      return handLandmarkerRef.current;
    }

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
    );

    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.65,
      minHandPresenceConfidence: 0.65,
      minTrackingConfidence: 0.7,
    });

    handLandmarkerRef.current = landmarker;
    return landmarker;
  }

  async function startCamera() {
    try {
      setError("");
      stopCamera();
      const landmarker = await loadHandLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      });
      const sessionId = trackingSessionRef.current + 1;
      trackingSessionRef.current = sessionId;
      cameraRunningRef.current = true;
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      setStatus("Tracking hands");
      clearCanvas();
      runDetectionLoop(landmarker, sessionId);
    } catch (cameraError) {
      cameraRunningRef.current = false;
      setError(cameraError.message || "Camera access failed.");
      setCameraActive(false);
    }
  }

  function stopCamera() {
    trackingSessionRef.current += 1;
    cameraRunningRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    clearCanvas();
    setCameraActive(false);
    setStatus(t.ready);
    inFlightRef.current = false;
    lastPredictionRef.current = 0;
    sequenceBufferRef.current = [];
    predictionWindowRef.current = [];
    demoPredictionWindowRef.current = [];
  }

  function clearAll() {
    setTranslation("");
    setConfidence(0);
    setStatus(t.ready);
    lastPhraseRef.current = "";
    lastSpokenRef.current = "";
    lastSpeechSavedRef.current = "";
    sequenceBufferRef.current = [];
    predictionWindowRef.current = [];
    demoPredictionWindowRef.current = [];
    window.speechSynthesis.cancel();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawLandmarks(hands) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!hands?.length) {
      return;
    }

    const palette = ["#22D3EE", "#F97316"];
    hands.forEach((hand, handIndex) => {
      const color = palette[handIndex % palette.length];
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      HAND_CONNECTIONS.forEach(([startIndex, endIndex]) => {
        const start = hand.landmarks[startIndex];
        const end = hand.landmarks[endIndex];
        if (!start || !end) {
          return;
        }

        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      });

      hand.landmarks.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function getHandCropBox(hand, video) {
    const xs = hand.landmarks.map((point) => point.x * video.videoWidth);
    const ys = hand.landmarks.map((point) => point.y * video.videoHeight);
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(video.videoWidth, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(video.videoHeight, Math.max(...ys));
    const boxSize = Math.max(96, maxX - minX, maxY - minY);
    const paddedSize = Math.min(
      Math.max(video.videoWidth, video.videoHeight),
      boxSize * 1.85,
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const x = Math.max(0, Math.min(video.videoWidth - paddedSize, centerX - paddedSize / 2));
    const y = Math.max(0, Math.min(video.videoHeight - paddedSize, centerY - paddedSize / 2));

    return { x, y, size: paddedSize };
  }

  function captureHandCrop(hand) {
    const video = videoRef.current;
    if (!video || !hand || !video.videoWidth || !video.videoHeight) {
      return "";
    }

    const { x, y, size } = getHandCropBox(hand, video);
    const captureCanvas = captureCanvasRef.current || document.createElement("canvas");
    captureCanvasRef.current = captureCanvas;
    captureCanvas.width = 128;
    captureCanvas.height = 128;

    const ctx = captureCanvas.getContext("2d");
    if (!ctx) {
      return "";
    }

    ctx.fillStyle = "#08121c";
    ctx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
    ctx.drawImage(video, x, y, size, size, 0, 0, captureCanvas.width, captureCanvas.height);
    return captureCanvas.toDataURL("image/jpeg", 0.92);
  }

  function runDetectionLoop(handLandmarker, sessionId) {
    const detect = () => {
      if (!cameraRunningRef.current || trackingSessionRef.current !== sessionId) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      const result = handLandmarker.detectForVideo(video, performance.now());
      const hands = cloneHands(result.landmarks || [], result.handednesses || []);
      drawLandmarks(hands);

      if (hands.length) {
        setStatus(hands.length === 2 ? "Tracking both hands" : "Tracking one hand");
        sequenceBufferRef.current = [
          ...sequenceBufferRef.current.slice(-(MAX_SEQUENCE_FRAMES - 1)),
          { hands },
        ];

        const demoGesture = detectDemoGesture(sequenceBufferRef.current);
        if (demoGesture) {
          const nextWindow = [
            ...demoPredictionWindowRef.current.slice(-(STABLE_PREDICTION_WINDOW - 1)),
            demoGesture.label,
          ];
          demoPredictionWindowRef.current = nextWindow;
          predictionWindowRef.current = [];

          const stableDemoPrediction = getStablePrediction(nextWindow);
          if (stableDemoPrediction) {
            applyPrediction(stableDemoPrediction, demoGesture.confidence, demoGesture.mode);
            setStatus(`Detected ${stableDemoPrediction}`);
          }
        } else {
          demoPredictionWindowRef.current = [];
        }

        const now = Date.now();
        if (
          !demoGesture &&
          !inFlightRef.current &&
          sequenceBufferRef.current.length >= MIN_SEQUENCE_FRAMES &&
          now - lastPredictionRef.current > 650
        ) {
          inFlightRef.current = true;
          lastPredictionRef.current = now;
          void sendPrediction(sequenceBufferRef.current, sessionId).finally(() => {
            if (trackingSessionRef.current === sessionId) {
              inFlightRef.current = false;
            }
          });
        }
      } else {
        setStatus(t.noHand);
        sequenceBufferRef.current = [];
        predictionWindowRef.current = [];
        demoPredictionWindowRef.current = [];
      }

      if (cameraRunningRef.current && trackingSessionRef.current === sessionId) {
        animationRef.current = requestAnimationFrame(detect);
      }
    };

    animationRef.current = requestAnimationFrame(detect);
  }

  async function sendPrediction(frames, sessionId) {
    const predictionInput = backendConfigRef.current.predictionInput || "landmarks";
    const latestHand = frames[frames.length - 1]?.hands?.[0];
    const flattened = flattenLatestLandmarks(frames);
    const requestBody =
      predictionInput === "image"
        ? { image: captureHandCrop(latestHand), target: recognitionTarget }
        : { landmarks: flattened, target: recognitionTarget };

    if (predictionInput === "image" && !requestBody.image) {
      return;
    }

    if (predictionInput !== "image" && requestBody.landmarks.length !== 63) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (trackingSessionRef.current !== sessionId || !cameraRunningRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || "Prediction failed.");
      }

      const predictionLabel = data.sign || data.prediction || "";
      if (!predictionLabel) {
        return;
      }

      const confidenceScore = Math.max(
        0,
        Math.min(1, Number(data.confidence || 0) > 1 ? Number(data.confidence || 0) / 100 : Number(data.confidence || 0)),
      );

      const nextWindow = [
        ...predictionWindowRef.current.slice(-(STABLE_PREDICTION_WINDOW - 1)),
        predictionLabel,
      ];
      predictionWindowRef.current = nextWindow;
      const stablePrediction = getStablePrediction(nextWindow);

      if (
        stablePrediction &&
        stablePrediction !== "Gesture not recognised" &&
        stablePrediction !== lastPhraseRef.current
      ) {
        applyPrediction(stablePrediction, confidenceScore, data.mode || "sign_prediction");
      } else if (stablePrediction) {
        setConfidence(confidenceScore);
      }
    } catch (requestError) {
      if (trackingSessionRef.current === sessionId && cameraRunningRef.current) {
        setError(requestError.message || "Prediction failed.");
      }
    }
  }

  async function persistConversation(entryMode, text, score) {
    if (!text) {
      return;
    }

    const item = {
      mode: entryMode,
      text,
      confidence: score,
      created_at: new Date().toISOString(),
    };

    setHistory((current) => [item, ...current].slice(0, 8));
  }

  function applyPrediction(label, score, entryMode) {
    if (!label || label === "Gesture not recognised") {
      return;
    }

    setTranslation(label);
    setConfidence(score);

    if (label !== lastPhraseRef.current) {
      lastPhraseRef.current = label;
      persistConversation(entryMode, label, score);
    }
  }

  const showCamera = mode !== MODES.speechToText;
  const targetHeading = language === "hi" ? "ÃƒÂ Ã‚Â¤Ã‚ÂªÃƒÂ Ã‚Â¤Ã‚Â¹ÃƒÂ Ã‚Â¤Ã…Â¡ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â¨ ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â·ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¯" : "Recognition target";
  const backendBadgeLabel = !backendHealth.configured
    ? t.setupNeeded
    : backendHealth.ok
      ? t.online
      : t.offline;
  const targetCards = [
    {
      id: "general",
      label: language === "hi" ? "ÃƒÂ Ã‚Â¤Ã‚Â¶ÃƒÂ Ã‚Â¤Ã‚Â¬ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¦ / ÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â¯" : "Words / Phrases",
      disabled:
        backendHealth.checked &&
        backendHealth.ok &&
        !backendHealth.supportedTargets.includes("general"),
    },
    {
      id: "alphabet",
      label: language === "hi" ? "ÃƒÂ Ã‚Â¤Ã‚ÂµÃƒÂ Ã‚Â¤Ã‚Â°ÃƒÂ Ã‚Â¥Ã‚ÂÃƒÂ Ã‚Â¤Ã‚Â£ÃƒÂ Ã‚Â¤Ã‚Â®ÃƒÂ Ã‚Â¤Ã‚Â¾ÃƒÂ Ã‚Â¤Ã‚Â²ÃƒÂ Ã‚Â¤Ã‚Â¾" : "Alphabet",
      disabled:
        backendHealth.checked &&
        backendHealth.ok &&
        !backendHealth.supportedTargets.includes("alphabet"),
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="glass overflow-hidden rounded-[32px] border border-white/60 shadow-glow">
          <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,167,0.18),_transparent_25%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(239,246,248,0.86))] p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-cyan shadow-sm">
                {t.badge}
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                {t.title}
              </h1>
              <p className="max-w-2xl text-base text-slate-600 sm:text-lg">{t.subtitle}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    language === "en" ? "bg-ink text-white" : "bg-white text-slate-600"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    language === "hi" ? "bg-ink text-white" : "bg-white text-slate-600"
                  }`}
                >
                  HI
                </button>
              </div>
            </div>

            <div className="grid gap-3 rounded-[28px] bg-ink p-5 text-white shadow-glow">
              <div className="flex items-center justify-between text-sm">
                <span>{t.backend}</span>
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    backendHealth.ok
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-amber-500/20 text-amber-200"
                  }`}
                >
                  {backendBadgeLabel}
                </span>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">
                  {backendHealth.modelType.includes("tensorflow") ? t.trained : t.heuristic}
                </p>
                <p className="mt-2 text-2xl font-bold">{status}</p>
              </div>
              <p className="text-sm text-slate-300">{showCamera ? t.cameraHint : t.micHint}</p>
              {!backendHealth.ok ? (
                <p className="text-xs text-slate-400">
                  {backendHealth.configured ? t.backendOfflineHint : t.backendConfigHint}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass rounded-[30px] border border-white/60 p-5 shadow-glow sm:p-6">
            <h2 className="mb-5 font-display text-2xl font-bold">{t.chooseMode}</h2>

            <div className="grid gap-3 sm:grid-cols-3">
              {modeCards.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    mode === item.id
                      ? "border-transparent bg-ink text-white shadow-glow"
                      : "border-slate-200 bg-white/80 text-slate-700"
                  }`}
                >
                  <div className={`mb-3 h-2 rounded-full bg-gradient-to-r ${item.accent}`} />
                  <p className="font-semibold">{item.label}</p>
                </button>
              ))}
            </div>

            {showCamera ? (
              <div className="mt-6">
                <h3 className="mb-3 font-display text-xl font-bold">{targetHeading}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {targetCards.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => setRecognitionTarget(item.id)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        recognitionTarget === item.id
                          ? "border-transparent bg-ink text-white shadow-glow"
                          : "border-slate-200 bg-white/80 text-slate-700"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <p className="font-semibold">{item.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {showCamera ? (
                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  className="rounded-full bg-cyan px-5 py-3 font-bold text-white hover:bg-teal-600"
                >
                  {cameraActive ? t.stopCamera : t.startCamera}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={speechRecognition.listening ? speechRecognition.stop : speechRecognition.start}
                  disabled={!speechRecognition.supported}
                  className="rounded-full bg-coral px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {speechRecognition.listening ? t.stopListening : t.startListening}
                </button>
              )}

              <button
                type="button"
                onClick={clearAll}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
              >
                {t.clear}
              </button>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-6 rounded-[28px] bg-slate-950 p-4 text-white">
              {showCamera ? (
                <div className="relative overflow-hidden rounded-[24px]">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="aspect-[4/3] w-full scale-x-[-1] rounded-[24px] bg-slate-900 object-contain"
                  />
                  <canvas
                    ref={canvasRef}
                    className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
                  />
                  {!cameraActive ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 text-center">
                      <div>
                        <div className="mx-auto mb-3 h-4 w-4 rounded-full bg-cyan signal-pulse" />
                        <p className="text-sm text-slate-200">{t.noHand}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(14,165,167,0.22),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.92))] p-6 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto h-16 w-16 rounded-full bg-coral/25 p-5">
                      <div
                        className={`h-full w-full rounded-full ${
                          speechRecognition.listening ? "bg-coral signal-pulse" : "bg-white/70"
                        }`}
                      />
                    </div>
                    <p className="text-lg font-semibold">
                      {speechRecognition.listening ? t.listening : t.startListening}
                    </p>
                    <p className="text-sm text-slate-300">{t.micHint}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <section className="glass rounded-[30px] border border-white/60 p-6 shadow-glow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">{t.output}</h2>
                <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white">
                  {t.confidence}: {(confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="min-h-[220px] rounded-[26px] bg-[linear-gradient(135deg,_rgba(8,18,28,0.96),_rgba(15,23,42,0.92))] p-6 text-white">
                <p className="mb-3 text-sm uppercase tracking-[0.3em] text-slate-400">
                  {t.translation}
                </p>
                <p className="text-3xl font-extrabold leading-tight sm:text-4xl">
                  {translation || "..."}
                </p>
              </div>
            </section>

            <section className="glass rounded-[30px] border border-white/60 p-6 shadow-glow">
              <h2 className="mb-4 font-display text-2xl font-bold">{t.history}</h2>
              <div className="space-y-3">
                {history.length ? (
                  history.map((item, index) => (
                    <div
                      key={`${item.created_at}-${index}`}
                      className="rounded-[22px] border border-slate-200 bg-white/80 p-4"
                    >
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                        <span>{item.mode.replaceAll("_", " ")}</span>
                        <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="font-semibold text-slate-800">{item.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[22px] bg-white/70 p-4 text-slate-500">{t.noHistory}</p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
