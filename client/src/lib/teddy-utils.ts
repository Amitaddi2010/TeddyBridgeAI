/**
 * Utility function to open the Teddy AI Assistant floating popup
 * This can be called from anywhere in the application
 */
export function openTeddyAssistant() {
  // Dispatch a custom event that FloatingTeddyAssistant listens to
  window.dispatchEvent(new CustomEvent("open-teddy"));
}

