import smtplib
from email.message import EmailMessage
from config import Config
from helpers.logger import logger

config = Config() # Instantiate the config object

def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email using Gmail SMTP configuration from the Config object.

    Args:
        to_email: The recipient's email address.
        subject: The email subject line.
        body: The email body content (plain text).

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = subject
    msg['From'] = config.EMAIL_SENDER
    msg['To'] = to_email

    try:
        # Connect to the Gmail SMTP server
        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()  # Secure the connection
        # Login to the sender's account
        server.login(config.EMAIL_SENDER, config.EMAIL_PASSWORD)
        # Send the email
        server.send_message(msg)
        server.quit()
        logger.info(f"Successfully sent email to {to_email} with subject: {subject}")
        return True
    except smtplib.SMTPAuthenticationError:
        # pass
        logger.error(f"SMTP Authentication failed for {config.EMAIL_SENDER}. Check credentials or 'less secure app access'.")
    except smtplib.SMTPConnectError:
        logger.error(f"Failed to connect to SMTP server {config.SMTP_SERVER}:{config.SMTP_PORT}.")
    except Exception as e:
        # pass
        logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)

    return False


# Example usage:
# if __name__ == "__main__":
#     send_email("satya@satyendra.in", "Test Subject", "This is a test email body.")