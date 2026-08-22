export interface WelcomeEmailData {
  name: string;
  loginUrl: string;
}

export function renderWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const subject = `Welcome to the Platform, ${data.name}!`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome, ${data.name}! 👋</h2>
          <p>Thank you for joining. We're excited to have you on board.</p>
          <p style="margin: 30px 0;">
            <a href="${data.loginUrl}" class="button">Log In to Your Account</a>
          </p>
          <p>If you have any questions, feel free to reply to this email.</p>
        </div>
      </body>
    </html>
  `;
  const text = `Welcome, ${data.name}!\n\nThank you for joining. Log in at: ${data.loginUrl}`;

  return { subject, html, text };
}
