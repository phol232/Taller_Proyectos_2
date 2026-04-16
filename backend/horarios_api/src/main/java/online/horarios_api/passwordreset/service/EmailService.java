package online.horarios_api.passwordreset.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.password-reset.from-email}")
    private String fromEmail;

    @Value("${app.password-reset.from-name}")
    private String fromName;

    @Async
    public void sendPasswordResetOtp(String toEmail, String fullName, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Código de verificación — Planner UC");
            helper.setText(buildHtmlEmail(fullName, otp), true);

            mailSender.send(message);
            log.info("Correo de recuperación enviado a {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Error al enviar correo de recuperación a {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildHtmlEmail(String fullName, String otp) {
        String displayName = (fullName != null && !fullName.isBlank()) ? fullName : "Usuario";
        String[] digits = otp.split("");

        StringBuilder digitBoxes = new StringBuilder();
        for (String d : digits) {
            digitBoxes
                .append("<td style=\"padding:0 4px;\">")
                .append("<div style=\"")
                .append("display:inline-block;")
                .append("width:44px;height:52px;")
                .append("line-height:52px;")
                .append("text-align:center;")
                .append("font-size:28px;")
                .append("font-weight:700;")
                .append("color:#6B21A8;")
                .append("background:#F3E8FF;")
                .append("border:2px solid #D8B4FE;")
                .append("border-radius:10px;")
                .append("font-family:'Segoe UI',Arial,sans-serif;")
                .append("\">")
                .append(d)
                .append("</div>")
                .append("</td>");
        }

        String body = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width,initial-scale=1"/>
              <title>Código de verificación</title>
            </head>
            <body style="margin:0;padding:0;background:#F9FAFB;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="540" cellpadding="0" cellspacing="0"
                           style="background:#FFFFFF;border-radius:16px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(107,33,168,.10);">
                      <tr>
                        <td style="background:#6B21A8;padding:32px 40px;text-align:center;">
                          <div style="display:inline-flex;align-items:center;gap:10px;">
                            <div style="width:36px;height:36px;background:rgba(255,255,255,.2);
                                        border-radius:8px;line-height:36px;text-align:center;">
                              📅
                            </div>
                            <span style="font-size:20px;font-weight:700;color:#FFFFFF;
                                         letter-spacing:-0.3px;">Planner UC</span>
                          </div>
                          <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.6);
                                    text-transform:uppercase;letter-spacing:2px;">
                            Sistema de Gestión Académica
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:40px 40px 32px;">
                          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
                            Recuperación de contraseña
                          </h1>
                          <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.6;">
                            Hola <strong style="color:#111827;">%s</strong>,
                            recibimos una solicitud para restablecer la contraseña de tu cuenta
                            en Planner UC. Usa el código de verificación a continuación:
                          </p>
                          <table cellpadding="0" cellspacing="0"
                                 style="margin:0 auto 28px;border-collapse:separate;">
                            <tr>%s</tr>
                          </table>
                          <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;
                                      padding:14px 18px;margin-bottom:28px;">
                            <p style="margin:0;font-size:13px;color:#92400E;">
                              ⏱ Este código expira en <strong>10 minutos</strong>.
                              Si no solicitaste este cambio, ignora este correo.
                            </p>
                          </div>
                          <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                            Por seguridad, nunca compartas este código con nadie.
                            Planner UC jamás te pedirá tu contraseña por correo.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#F9FAFB;padding:20px 40px;
                                   border-top:1px solid #F3F4F6;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#9CA3AF;">
                            © 2025 Universidad Continental · Planner UC
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        return body.formatted(displayName, digitBoxes.toString());
    }
}
