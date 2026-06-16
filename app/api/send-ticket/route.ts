import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Agregamos la extracción de "institucion" con un valor de respaldo
    const { email, nombre, eventName, documento, institucion = 'No especificada' } = body;

    if (!email || !nombre || !eventName || !documento) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (!process.env.BREVO_API_KEY) {
      console.error("CRÍTICO: No se encontró la variable de entorno BREVO_API_KEY.");
      return NextResponse.json({ error: 'API Key faltante' }, { status: 500 });
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'registros@acofiapps.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'ACOFI Eventos';
    const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || senderEmail;

    // Generador de QR público con margen limpio
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${documento}&margin=10`;

    // ==========================================
    // 1. PLANTILLA DESLUMBRANTE PARA EL USUARIO
    // ==========================================
    const htmlContentUser = `
      <div style="background-color: #09090b; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
        <div style="max-width: 500px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%); height: 6px; width: 100%;"></div>
          
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 900; background: linear-gradient(to right, #ffffff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">¡Registro Exitoso!</h2>
            <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 30px; line-height: 1.6;">Hola <strong style="color: #ffffff;">${nombre}</strong>, tu acceso oficial para el evento <strong>${eventName}</strong> está confirmado.</p>
            
            <div style="background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 35px; text-align: center; box-shadow: inset 0 0 20px rgba(255,255,255,0.02), 0 0 30px rgba(79, 70, 229, 0.15);">
              
              <p style="color: #4f46e5; font-size: 13px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 25px;">Tu Pase Digital Único</p>
              
              <div style="background: #ffffff; padding: 15px; border-radius: 16px; display: inline-block; box-shadow: 0 10px 25px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.2);">
                <img src="${qrUrl}" alt="QR" style="width: 220px; height: 220px; display: block; border-radius: 4px;" />
              </div>
              
              <p style="margin-top: 25px; font-size: 24px; font-weight: 900; letter-spacing: 5px; color: #ffffff;">${documento}</p>
            </div>
            
            <p style="color: #71717a; font-size: 14px; text-align: center; margin-top: 35px; line-height: 1.6;">
              Por favor, conserva este correo. Al llegar al evento, simplemente presenta este código QR desde la pantalla de tu celular.
            </p>
          </div>
        </div>
        <p style="color: #52525b; font-size: 11px; text-align: center; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">SISTEMA DE REGISTROS ACOFI</p>
      </div>
    `;

    // ==========================================
    // 2. PLANTILLA PARA EL ADMINISTRADOR
    // ==========================================
    const htmlContentAdmin = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eaeaec; border-radius: 12px; max-width: 600px; background: #fafafa;">
        <h2 style="color: #16a34a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Nuevo Registro Recibido</h2>
        <p style="color: #374151; font-size: 15px;">Se ha registrado un nuevo participante en el evento <strong>${eventName}</strong>.</p>
        
        <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #d1d5db; margin-top: 20px;">
          <h3 style="margin-top: 0; color: #1f2937; font-size: 16px;">Datos del Participante:</h3>
          <ul style="list-style-type: none; padding: 0; margin: 0; color: #4b5563; font-size: 15px; line-height: 1.8;">
            <li><strong>Nombre Completo:</strong> ${nombre}</li>
            <li><strong>Identificación:</strong> ${documento}</li>
            <li><strong>Correo:</strong> <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></li>
            <li><strong>Institución:</strong> ${institucion}</li>
          </ul>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">Notificación automática del Sistema de Registros ACOFI</p>
      </div>
    `;

    // ==========================================
    // EJECUCIÓN PARALELA DE CORREOS
    // ==========================================
    
    // Promesa 1: Correo al Usuario
    const reqUser = fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email, name: nombre }],
        subject: `Registro exitoso: ${eventName}`,
        htmlContent: htmlContentUser
      })
    });

    // Promesa 2: Correo al Administrador
    const reqAdmin = fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: "Sistema de Alertas", email: senderEmail },
        to: [{ email: adminNotificationEmail, name: 'Administrador' }],
        subject: `🚨 Nuevo Registro: ${eventName} - ${nombre}`,
        htmlContent: htmlContentAdmin
      })
    });

    // Ejecutamos ambas peticiones al mismo tiempo
    const results = await Promise.allSettled([reqUser, reqAdmin]);
    
    // Verificamos si la petición principal (usuario) falló
    const userResult = results[0];
    if (userResult.status === 'fulfilled' && !userResult.value.ok) {
      const err = await userResult.value.json();
      console.error('Brevo Error Usuario:', err);
      return NextResponse.json({ error: 'Brevo API Error', details: err }, { status: userResult.value.status });
    }

    return NextResponse.json({ success: true, message: 'Correos enviados exitosamente' });
    
  } catch (error: any) {
    console.error('Error general enviando correo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}