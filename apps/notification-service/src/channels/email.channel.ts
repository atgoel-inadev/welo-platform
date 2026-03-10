import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@app/common';
import { INotificationChannel } from './channel.interface';

/**
 * Email channel — sends transactional email via SES or SendGrid.
 *
 * Dev mode (EMAIL_PROVIDER=console): logs the email to stdout instead of sending.
 * Production: set EMAIL_PROVIDER=ses or EMAIL_PROVIDER=sendgrid and install the
 * corresponding SDK (@aws-sdk/client-ses or @sendgrid/mail).
 */
@Injectable()
export class EmailChannel implements INotificationChannel {
  readonly name = 'email';
  private readonly logger = new Logger(EmailChannel.name);
  private readonly provider = process.env.EMAIL_PROVIDER ?? 'console';
  private readonly fromEmail = process.env.FROM_EMAIL ?? 'noreply@welo.ai';

  async send(notification: Notification, recipientId: string): Promise<void> {
    const subject = notification.title;
    const body = notification.message;

    if (this.provider === 'console') {
      this.logger.log(
        `[email/console] To: user:${recipientId} | From: ${this.fromEmail} | Subject: ${subject} | Body: ${body}`,
      );
      return;
    }

    // Production: integrate SES or SendGrid here.
    // Example for SES (requires @aws-sdk/client-ses):
    //   const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
    //   const ses = new SESClient({ region: process.env.SES_REGION });
    //   await ses.send(new SendEmailCommand({ ... }));
    //
    // Example for SendGrid (requires @sendgrid/mail):
    //   const sgMail = await import('@sendgrid/mail');
    //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    //   await sgMail.send({ to: userEmail, from: this.fromEmail, subject, text: body });

    this.logger.warn(
      `EmailChannel: provider "${this.provider}" not implemented. ` +
        'Install the SDK and uncomment the send logic above.',
    );
  }
}
