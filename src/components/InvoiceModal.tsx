import React from "react";
import { X, Printer, Download, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceHtml: string;
}

export default function InvoiceModal({ isOpen, onClose, invoiceHtml }: InvoiceModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([invoiceHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `YourTube-Invoice-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative border border-gray-200 my-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-lg text-gray-900">Subscription Invoice & Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="text-xs flex items-center gap-1.5 border-gray-300"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadHTML}
              className="text-xs flex items-center gap-1.5 border-gray-300"
            >
              <Download className="w-3.5 h-3.5" /> Save Receipt
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Render HTML Invoice Frame */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-2 max-h-[70vh] overflow-y-auto">
          <iframe
            srcDoc={invoiceHtml}
            className="w-full min-h-[500px] border-0 rounded-xl bg-white"
            title="Invoice Preview"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>YourTube VIP Subscription Receipt &bull; 100% Secure Encrypted</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-600">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
