import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Endpoint para servir PDFs de forma segura
router.post('/api/files/pdf/download', authenticate, (req, res) => {
  try {
    const { pdfData, fileName } = req.body;

    if (!pdfData) {
      return res.status(400).json({ error: 'PDF data is required' });
    }

    // Se for data URL, extrair apenas o base64
    let base64Data = pdfData;
    if (pdfData.startsWith('data:application/pdf;base64,')) {
      base64Data = pdfData.split(',')[1];
    } else if (pdfData.startsWith('data:application/pdf')) {
      base64Data = pdfData.split(',')[1];
    }

    // Converter base64 para buffer
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // Configurar headers para download seguro
    const safeFileName = fileName || 'laudo.pdf';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFileName)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enviar o PDF
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Erro ao servir PDF:', error);
    res.status(500).json({ error: 'Erro ao processar PDF' });
  }
});

export { router as fileRoutes };
