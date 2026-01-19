'use client';

import { useRef, useEffect, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { X, Check, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
    onSave: (signatureData: string) => void;
    onCancel: () => void;
    label?: string;
}

export default function SignaturePad({ onSave, onCancel, label = 'Assinatura' }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signaturePadRef = useRef<SignaturePadLib | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);

        // Ajustar canvas para alta resolução
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d')?.scale(ratio, ratio);

        signaturePadRef.current = new SignaturePadLib(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
        });

        signaturePadRef.current.addEventListener('beginStroke', () => {
            setIsEmpty(false);
        });

        // Resize handler
        const resizeCanvas = () => {
            const data = signaturePadRef.current?.toData();
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d')?.scale(ratio, ratio);
            signaturePadRef.current?.clear();
            if (data) signaturePadRef.current?.fromData(data);
        };

        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            signaturePadRef.current?.off();
        };
    }, []);

    const handleClear = () => {
        signaturePadRef.current?.clear();
        setIsEmpty(true);
    };

    const handleSave = () => {
        if (signaturePadRef.current?.isEmpty()) {
            alert('Por favor, assine antes de salvar.');
            return;
        }
        const dataUrl = signaturePadRef.current?.toDataURL('image/png');
        if (dataUrl) onSave(dataUrl);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-6 py-4">
                    <h3 className="text-lg font-semibold">{label}</h3>
                    <p className="text-primary-200 text-sm">Assine no campo abaixo</p>
                </div>

                {/* Canvas */}
                <div className="p-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 relative">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-48 touch-none cursor-crosshair rounded-xl"
                            style={{ touchAction: 'none' }}
                        />
                        {isEmpty && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-gray-400">Toque ou clique para assinar</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-4 pb-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                        Cancelar
                    </button>
                    <button
                        onClick={handleClear}
                        className="btn bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    >
                        <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isEmpty}
                        className="flex-1 btn btn-primary disabled:opacity-50"
                    >
                        <Check className="h-5 w-5" />
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
