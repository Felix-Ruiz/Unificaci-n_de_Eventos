import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, nombre, eventName, documento } = body;

    // Validación básica de datos
    if (!email || !nombre || !eventName || !documento) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Generador de QR público (rápido y no requiere adjuntos pesados)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${documento}&margin=10`;

    // Plantilla HTML del correo (Diseño limpio y profesional)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; text-align: center; margin-bottom: 20px;">¡Inscripción Confirmada!</h2>
        <p style="color: #333333; font-size: 16px;">Hola <strong>${nombre}</strong>,</p>
        <p style="color: #333333; font-size: 16px;">Tu registro para el evento <strong>${eventName}</strong> ha sido procesado exitosamente.</p>
        
        <div style="text-align: center; margin: 40px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <p style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; font-weight: bold;">Tu Código de Acceso (QR)</p>
          <img src="${qrUrl}" alt="Código QR" style="width: 220px; height: 220px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; padding: 5px;" />
          <p style="color: #0f172a; font-size: 20px; font-weight: 900; letter-spacing: 3px; margin-top: 15px;">${documento}</p>
        </div>
        
        <p style="color: #475569; font-size: 15px; text-align: center; line-height: 1.6;">
          Por favor, <strong>guarda este correo</strong> y presenta el código QR en la pantalla de tu celular al llegar al evento para agilizar tu ingreso.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Este es un mensaje automático generado por el sistema de registros de ACOFI. Por favor, no respondas a este correo.</p>
      </div>
    `;

    // Llamada directa a la API REST de Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY as string
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'ACOFI Eventos',
          email: process.env.BREVO_SENDER_EMAIL || 'registros@acofiapps.com'
        },
        to: [{ email: email, name: nombre }],
        subject: `Tu Ticket de Acceso: ${eventName}`,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de Brevo API:', errorData);
      // MEJORA: Devolvemos el error detallado al frontend en lugar de un error genérico
      return NextResponse.json({ error: 'Brevo API Error', details: errorData }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: 'Correo enviado' });
    
  } catch (error: any) {
    console.error('Error general enviando correo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}