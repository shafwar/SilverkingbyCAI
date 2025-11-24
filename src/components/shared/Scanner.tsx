"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X } from "lucide-react";

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
}

export function Scanner({ onScanSuccess, onClose }: ScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerIdRef = useRef(`qr-scanner-container-${Math.random().toString(36).substr(2, 9)}`);

  // Update ref when callback changes
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    // Only initialize if component is mounted and container exists
    if (typeof window === "undefined") return;
    
    const containerId = containerIdRef.current;
    let initTimer: NodeJS.Timeout | null = null;
    let isMounted = true;
    
    // Small delay to ensure DOM is ready
    initTimer = setTimeout(() => {
      if (!isMounted) return;
      
      try {
        console.log("[Scanner] Initializing QR scanner", {
          containerId,
          hasRef: !!scannerRef.current,
          alreadyInitialized: !!html5QrCodeRef.current,
        });

        // Prevent multiple initializations
        if (html5QrCodeRef.current) {
          console.log("[Scanner] Already initialized, skipping");
          return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
          console.error("[Scanner] Container not found:", containerId);
          return;
        }

        // Initialize Html5Qrcode
        const html5QrCode = new Html5Qrcode(containerId);
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        };

        const handleScanSuccess = (decodedText: string, decodedResult: any) => {
          if (!isMounted) return;
          
          try {
            if (!decodedText || !decodedText.trim()) {
              console.warn("[Scanner] Empty QR code detected");
              return;
            }
            
            console.log("[Scanner] QR code scanned successfully:", decodedText);
            
            // Stop scanner first
            html5QrCode.stop().catch((err) => {
              console.error("[Scanner] Error stopping scanner:", err);
            });
            
            setIsScanning(false);
            
            // Call success handler
            onScanSuccessRef.current(decodedText);
          } catch (error) {
            console.error("[Scanner] Error in handleScanSuccess:", error);
            html5QrCode.stop().catch(() => {});
            setIsScanning(false);
          }
        };

        // Start scanner
        html5QrCode
          .start(
            { facingMode: "environment" },
            config,
            handleScanSuccess,
            (errorMessage: string) => {
              // Ignore scan errors during continuous scanning (these are normal)
              if (errorMessage && !errorMessage.includes("NotFoundException") && !errorMessage.includes("No QR code")) {
                console.debug("[Scanner] Scan error (ignored):", errorMessage);
              }
            }
          )
          .then(() => {
            if (isMounted) {
              setIsScanning(true);
              setError(null);
              console.log("[Scanner] Scanner started successfully");
            }
          })
          .catch((err: any) => {
            if (!isMounted) return;
            
            console.error("[Scanner] Scanner initialization error:", err);
            const errorMessage = err?.message || String(err);
            
            if (errorMessage.includes("Permission") || errorMessage.includes("permission")) {
              setError("Camera permission denied. Please allow camera access in your browser settings.");
            } else if (errorMessage.includes("NotFound") || errorMessage.includes("not found")) {
              setError("No camera found. Please ensure your device has a camera.");
            } else if (errorMessage.includes("NotAllowed") || errorMessage.includes("not allowed")) {
              setError("Camera access not allowed. Please check your browser permissions.");
            } else {
              setError("Failed to start camera. Please ensure camera permissions are granted and try again.");
            }
            setIsScanning(false);
          });
      } catch (error) {
        console.error("[Scanner] Error in useEffect:", error);
        setError("Failed to initialize scanner. Please refresh the page and try again.");
      }
    }, 200); // Slightly longer delay for better reliability

    // Cleanup function
    return () => {
      isMounted = false;
      
      if (initTimer) {
        clearTimeout(initTimer);
      }
      
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current
            .stop()
            .then(() => {
              html5QrCodeRef.current?.clear();
              html5QrCodeRef.current = null;
            })
            .catch((err) => {
              console.error("[Scanner] Error during cleanup:", err);
              html5QrCodeRef.current = null;
            });
        } catch (error) {
          console.error("[Scanner] Error in cleanup:", error);
          html5QrCodeRef.current = null;
        }
      }
    };
  }, []); // Empty deps - only run once on mount

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-3xl overflow-hidden border border-luxury-gold/30 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)]">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="relative">
          <div
            id={containerIdRef.current}
            ref={scannerRef}
            className="relative w-full aspect-square rounded-xl overflow-hidden bg-black"
          />

          {isScanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute inset-0 border-4 border-luxury-gold rounded-xl">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(212, 175, 55, 0.7)",
                      "0 0 0 20px rgba(212, 175, 55, 0)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 rounded-xl"
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <QrCode className="h-12 w-12 text-luxury-gold opacity-50" />
                </motion.div>
              </div>
            </motion.div>
          )}

          {error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-lg bg-red-500/20 border border-red-500/50 p-4 text-sm text-red-200"
              >
                {error}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-white/60">
          Position QR code within the frame
        </p>
      </div>
    </div>
  );
}

