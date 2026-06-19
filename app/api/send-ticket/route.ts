import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Extraemos creatorEmail; si viene vacío (evento viejo), será undefined
    // Extraemos emailSubject y emailBody personalizados que vienen del formulario público
    // AÑADIDO: Extraemos 'lang' para saber en qué idioma estaba el usuario al inscribirse
    const { 
      email, 
      nombre, 
      eventName, 
      documento, 
      institucion = 'No especificada', 
      creatorEmail,
      emailSubject,
      emailBody,
      lang = 'es' // Por defecto español si no se envía
    } = body;

    if (!email || !nombre || !eventName || !documento) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (!process.env.BREVO_API_KEY) {
      console.error("CRÍTICO: No se encontró la variable de entorno BREVO_API_KEY.");
      return NextResponse.json({ error: 'API Key faltante' }, { status: 500 });
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'registros@acofiapps.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'ACOFI Eventos';
    
    // RED DE SEGURIDAD PARA EL CORREO DEL ADMIN:
    // 1. Intenta usar el correo del creador del evento (creatorEmail).
    // 2. Si es nulo (evento viejo), usa tu variable de entorno ADMIN_NOTIFICATION_EMAIL (¡Configúrala en Vercel con tu correo personal!).
    // 3. Si nada de eso existe, usa un correo de respaldo estático (cámbialo por el tuyo para evitar bloqueos de Brevo).
    const adminNotificationEmail = creatorEmail || process.env.ADMIN_NOTIFICATION_EMAIL || 'tucorreo@personal.com';

    // Generador de QR Avanzado (QuickChart) - Alto contraste para evitar errores de lectura
    const qrUrl = `https://quickchart.io/qr?text=${documento}&dark=0f172a&light=ffffff&margin=2&size=300&ecLevel=H`;

    // ==========================================
    // TRADUCCIONES AUTOMÁTICAS DINÁMICAS (USUARIO)
    // ==========================================
    const defaultSubjectFallback = lang === 'en' 
      ? `Successful Registration: ${eventName}` 
      : `Registro Exitoso: ${eventName}`;
      
    const defaultTitle = lang === 'en' 
      ? 'Registration Successful!' 
      : '¡Registro Exitoso!';
      
    const defaultBodyFallback = lang === 'en' 
      ? `Hello <strong style="color: #ffffff;">${nombre}</strong>, your official access for the event <strong>${eventName}</strong> is confirmed.`
      : `Hola <strong style="color: #ffffff;">${nombre}</strong>, tu acceso oficial para el evento <strong>${eventName}</strong> está confirmado.`;
      
    const passText = lang === 'en' 
      ? 'Your Unique Digital Pass' 
      : 'Tu Pase Digital Único';
      
    const footerText = lang === 'en'
      ? 'Please keep this email. Upon arrival at the event, simply present this QR code from your mobile screen.'
      : 'Por favor, conserva este correo. Al llegar al evento, simplemente presenta este código QR desde la pantalla de tu celular.';

    const systemFooterText = lang === 'en'
      ? 'ACOFI REGISTRATION SYSTEM'
      : 'SISTEMA DE REGISTROS ACOFI';

    // ==========================================
    // TRADUCCIONES AUTOMÁTICAS DINÁMICAS (ADMINISTRADOR)
    // ==========================================
    const adminSubject = lang === 'en' ? `🚨 NEW REGISTRATION: ${eventName}` : `🚨 NUEVO REGISTRO: ${eventName}`;
    const adminTitle = lang === 'en' ? `🚀 New Registration Received` : `🚀 Nuevo Registro Recibido`;
    const adminDesc = lang === 'en' ? `A participant has just registered for your event <strong>${eventName}</strong>.` : `Un participante acaba de inscribirse en tu evento <strong>${eventName}</strong>.`;
    const adminSubTitle = lang === 'en' ? `Participant Technical Data:` : `Ficha Técnica del Participante:`;
    const adminLabelName = lang === 'en' ? `Name:` : `Nombre:`;
    const adminLabelDoc = lang === 'en' ? `ID/Passport:` : `Cédula/ID:`;
    const adminLabelEmail = lang === 'en' ? `Email:` : `Correo:`;
    const adminLabelInst = lang === 'en' ? `Institution:` : `Institución:`;
    const adminFooter = lang === 'en' ? `You are receiving this email because you are the coordinator/creator of this event.` : `Recibes este correo porque eres el coordinador/creador de este evento.`;
    const adminSenderName = lang === 'en' ? `ACOFI Alert System` : `Sistema de Alertas ACOFI`;
    const adminCoordinator = lang === 'en' ? `Event Coordinator` : `Coordinador del Evento`;

    // ==========================================
    // PROCESAMIENTO DINÁMICO DEL ASUNTO (SUBJECT)
    // ==========================================
    let finalSubject = defaultSubjectFallback;
    if (emailSubject && emailSubject.trim() !== '') {
      finalSubject = emailSubject
        .replace(/{{nombre}}/g, nombre)
        .replace(/{{evento}}/g, eventName)
        .replace(/{{documento}}/g, documento);
    }

    // ==========================================
    // PROCESAMIENTO DINÁMICO DEL CUERPO (BODY)
    // ==========================================
    let finalBodyText = defaultBodyFallback;
    if (emailBody && emailBody.trim() !== '') {
      finalBodyText = emailBody
        .replace(/{{nombre}}/g, nombre)
        .replace(/{{evento}}/g, eventName)
        .replace(/{{documento}}/g, documento)
        .replace(/\n/g, '<br/>'); // Convertimos saltos de línea del textarea a saltos HTML
    }

    // ==========================================
    // 1. PLANTILLA EMAIL A PRUEBA DE GMAIL (Alta legibilidad)
    // ==========================================
    const htmlContentUser = `
      <div style="background-color: #020617; padding: 40px 15px; font-family: 'Segoe UI', Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              
              <h2 style="margin: 0 0 15px 0; font-size: 28px; font-weight: 900; color: #ffffff;">${defaultTitle}</h2>
              
              <p style="color: #94a3b8; font-size: 16px; margin-bottom: 35px; line-height: 1.6; text-align: left;">
                ${finalBodyText}
              </p>
              
              <div style="background-color: #020617; border: 2px dashed #4f46e5; border-radius: 20px; padding: 35px 20px; text-align: center;">
                <p style="color: #818cf8; font-size: 13px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 0; margin-bottom: 25px;">${passText}</p>
                
                <img src="${qrUrl}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto; border-radius: 12px; border: 4px solid #4f46e5;" />
                
                <p style="margin-top: 25px; margin-bottom: 0; font-size: 24px; font-weight: 900; letter-spacing: 6px; color: #ffffff;">${documento}</p>
              </div>
              
              <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 35px; line-height: 1.6;">
                ${footerText}
              </p>
              
            </td>
          </tr>
        </table>
        <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">${systemFooterText}</p>
      </div>
    `;

    // ==========================================
    // 2. PLANTILLA PARA EL CREADOR DEL EVENTO
    // ==========================================
    const htmlContentAdmin = `
      <div style="font-family: Arial, sans-serif; padding: 30px; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">${adminTitle}</h2>
        <p style="color: #475569; font-size: 16px;">${adminDesc}</p>
        
        <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #cbd5e1; margin-top: 20px;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 16px; margin-bottom: 15px;">${adminSubTitle}</h3>
          <table width="100%" cellpadding="8" cellspacing="0" style="color: #334155; font-size: 15px;">
            <tr><td width="30%"><strong>${adminLabelName}</strong></td><td>${nombre}</td></tr>
            <tr><td><strong>${adminLabelDoc}</strong></td><td>${documento}</td></tr>
            <tr><td><strong>${adminLabelEmail}</strong></td><td><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td></tr>
            <tr><td><strong>${adminLabelInst}</strong></td><td>${institucion}</td></tr>
          </table>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">${adminFooter}</p>
      </div>
    `;

    // ==========================================
    // EJECUCIÓN PARALELA DE CORREOS
    // ==========================================
    const reqUser = fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email, name: nombre }],
        subject: finalSubject,
        htmlContent: htmlContentUser
      })
    });

    const reqAdmin = fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: adminSenderName, email: senderEmail },
        to: [{ email: adminNotificationEmail, name: adminCoordinator }],
        subject: adminSubject,
        htmlContent: htmlContentAdmin
      })
    });

    // Ejecutamos y verificamos ambos envíos
    const [userResponse, adminResponse] = await Promise.all([reqUser, reqAdmin]);
    
    if (!userResponse.ok) {
      const err = await userResponse.json();
      console.error('Brevo Error enviando al usuario:', err);
      return NextResponse.json({ error: 'Brevo API Error (Usuario)', details: err }, { status: userResponse.status });
    }

    if (!adminResponse.ok) {
      const errAdmin = await adminResponse.json();
      console.error('Brevo Error enviando al administrador:', errAdmin);
      // Solo lo registramos en consola para no interrumpir el flujo del usuario si su correo sí salió
    }

    return NextResponse.json({ success: true, message: 'Correos procesados correctamente' });
    
  } catch (error: any) {
    console.error('Error general enviando correo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}