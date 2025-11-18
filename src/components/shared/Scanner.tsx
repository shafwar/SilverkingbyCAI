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
    const containerId = containerIdRef.current;
    
    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      console.log("Scanner useEffect triggered", {
        scannerRef: !!scannerRef.current,
        html5QrCodeRef: !!html5QrCodeRef.current,
        containerId,
        containerExists: !!document.getElementById(containerId),
      });

      if (!scannerRef.current || html5QrCodeRef.current) {
        console.log("Scanner: Early return", {
          scannerRef: !!scannerRef.current,
          html5QrCodeRef: !!html5QrCodeRef.current,
        });
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) {
        console.error("Scanner: Container not found!", containerId);
        return;
      }

      console.log("Scanner: Initializing Html5Qrcode", containerId);
      const html5QrCode = new Html5Qrcode(containerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
      };

      const handleScanSuccess = (decodedText: string) => {
        onScanSuccessRef.current(decodedText);
        html5QrCode.stop();
        setIsScanning(false);
      };

      html5QrCode
        .start(
          { facingMode: "environment" },
          config,
          handleScanSuccess,
          () => {
            // Ignore scan errors during continuous scanning
          }
        )
        .then(() => {
          setIsScanning(true);
          setError(null);
        })
        .catch((err) => {
          console.error("Scanner error:", err);
          setError("Failed to start camera. Please ensure camera permissions are granted.");
          setIsScanning(false);
        });
    }, 100);

    return () => {
      clearTimeout(initTimer);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
          })
          .catch(() => {});
      }
    };
  }, []);

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

