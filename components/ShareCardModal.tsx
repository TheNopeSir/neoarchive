
import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { Exhibit, UserProfile } from '../types';
import { getArtifactTier } from '../constants';

interface ShareCardModalProps {
    exhibit: Exhibit;
    currentUser: string;
    onClose: () => void;
}

const ShareCardModal: React.FC<ShareCardModalProps> = ({ exhibit, currentUser, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration
        const W = 600;
        const H = 800;
        canvas.width = W;
        canvas.height = H;

        // Fonts
        const fontPixel = '24px "Orbitron", monospace';
        const fontMono = '16px "Courier New", monospace';
        const fontBig = '40px "Orbitron", monospace';

        // Background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);

        // Matrix Grid
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 1;
        for (let i = 0; i < W; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
        }
        for (let i = 0; i < H; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
        }

        // Header Box
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(20, 20, W - 40, 60);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 30px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("NEO_ARCHIVE // CLASSIFIED", W / 2, 60);

        // Image Frame
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = exhibit.imageUrls[0];
        
        img.onload = () => {
            // Draw Image
            const imgSize = 400;
            const x = (W - imgSize) / 2;
            const y = 120;
            
            // Draw border rect around image
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 5, y - 5, imgSize + 10, imgSize + 10);

            // Clip and draw image
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, imgSize, imgSize);
            ctx.clip();
            
            // Aspect Ratio fit
            const scale = Math.max(imgSize / img.width, imgSize / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, x + (imgSize - w)/2, y + (imgSize - h)/2, w, h);
            ctx.restore();

            // Scanlines over image
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            for(let i=y; i<y+imgSize; i+=4) {
                ctx.fillRect(x, i, imgSize, 2);
            }

            drawTextDetails(ctx);
        };

        const drawTextDetails = (ctx: CanvasRenderingContext2D) => {
            const tier = getArtifactTier(exhibit);
            const startY = 560;

            ctx.fillStyle = '#00FF00';
            ctx.textAlign = 'left';
            
            // Title
            ctx.font = 'bold 28px "Courier New", monospace';
            let title = exhibit.title.toUpperCase();
            if (title.length > 25) title = title.substring(0, 25) + '...';
            ctx.fillText(`ITEM: ${title}`, 40, startY);

            // Details
            ctx.font = '20px "Courier New", monospace';
            ctx.fillStyle = '#CCCCCC';
            ctx.fillText(`OWNER: @${exhibit.owner.toUpperCase()}`, 40, startY + 40);
            ctx.fillText(`CLASS: ${tier}`, 40, startY + 70);
            ctx.fillText(`CAT:   ${exhibit.category}`, 40, startY + 100);
            ctx.fillText(`DATE:  ${exhibit.timestamp.split(',')[0]}`, 40, startY + 130);

            // Stats Box
            const statX = 350;
            ctx.strokeStyle = '#00FF00';
            ctx.strokeRect(statX, startY, 200, 140);
            
            ctx.fillStyle = '#00FF00';
            ctx.font = '16px "Courier New", monospace';
            ctx.fillText("STATS_MODULE", statX + 10, startY + 25);
            
            ctx.fillStyle = '#FFF';
            ctx.fillText(`VIEWS: ${exhibit.views}`, statX + 10, startY + 60);
            ctx.fillText(`LIKES: ${exhibit.likes}`, statX + 10, startY + 90);
            
            // Barcode (Fake)
            ctx.fillStyle = '#FFFFFF';
            const bcY = 740;
            const bcX = 40;
            for(let i=0; i<300; i+= Math.random() * 5 + 2) {
                ctx.fillRect(bcX + i, bcY, Math.random() * 3 + 1, 30);
            }
            ctx.font = '12px "Courier New", monospace';
            ctx.fillText(`ID: ${exhibit.id.toUpperCase()}`, 40, 785);

            // Finalize
            setImageUrl(canvas.toDataURL('image/png'));
        };

    }, [exhibit]);

    const handleDownload = () => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.download = `neo_dossier_${exhibit.id}.png`;
        link.href = imageUrl;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
            <div className="bg-[#101010] border border-green-500 rounded-lg p-4 max-w-lg w-full flex flex-col items-center">
                <div className="flex justify-between w-full mb-4">
                    <h2 className="text-green-500 font-pixel text-xs tracking-widest uppercase">GENERATING_DOSSIER...</h2>
                    <button onClick={onClose}><X className="text-green-500 hover:text-white" /></button>
                </div>
                
                <canvas ref={canvasRef} className="hidden" /> {/* Hidden source canvas */}
                
                {imageUrl ? (
                    <img src={imageUrl} alt="Dossier" className="w-full h-auto border border-green-500/30 shadow-[0_0_20px_rgba(0,255,0,0.2)] mb-4" />
                ) : (
                    <div className="w-full aspect-[3/4] flex items-center justify-center text-green-500 font-mono animate-pulse">COMPILING DATA...</div>
                )}

                <button 
                    onClick={handleDownload}
                    className="w-full py-3 bg-green-500 text-black font-pixel font-bold uppercase hover:bg-green-400 flex items-center justify-center gap-2"
                >
                    <Download size={18} /> СКАЧАТЬ (SAVE)
                </button>
            </div>
        </div>
    );
};

export default ShareCardModal;
