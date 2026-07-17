"use client";

import { useEffect, useState } from "react";
import { Loader2, QrCode, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

type WaStatus = "DISCONNECTED" | "STARTING" | "QR_READY" | "CONNECTED";

interface StatusResponse {
  status: WaStatus;
  qr?: string | null;
}

export function WhatsappQR({ onConnected }: { onConnected: (sessionId?: string) => void }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<WaStatus>("DISCONNECTED");
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let interval: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp/status?userId=${user.id}`);
        if (!res.ok) throw new Error("Failed to fetch WhatsApp status");

        const data: StatusResponse = await res.json();
        setStatus(data.status);

        if (data.status === "QR_READY" && data.qr) {
          setQrCode(data.qr);
        } else if (data.status === "CONNECTED") {
          clearInterval(interval);
          onConnected((data as any).sessionId);
        }
      } catch (err) {
        console.error("Error polling WhatsApp status:", err);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [user?.id, onConnected]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-8 h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full flex flex-col items-center text-center">
        
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-700">
          <Smartphone className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connect WhatsApp</h2>
        
        {(status === "STARTING" || status === "DISCONNECTED") && (
          <div className="flex flex-col items-center mt-6">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Waking up WhatsApp engine...</p>
            <p className="text-sm text-gray-400 mt-1">This may take a few moments.</p>
          </div>
        )}

        {status === "QR_READY" && qrCode && (
          <div className="flex flex-col items-center mt-2">
            <p className="text-gray-600 text-sm mb-6 max-w-xs">
              Open WhatsApp on your phone, tap Menu or Settings and select Linked Devices. Point your phone to this screen to capture the code.
            </p>
            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
            </div>
          </div>
        )}

        {status === "CONNECTED" && (
          <div className="flex flex-col items-center mt-6 text-emerald-600">
            <QrCode className="w-12 h-12 mb-4" />
            <p className="font-semibold">Successfully Connected!</p>
            <p className="text-sm text-emerald-700/70 mt-1">Loading chats...</p>
          </div>
        )}
      </div>
    </div>
  );
}
