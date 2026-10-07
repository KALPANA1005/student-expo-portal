const nodemailer = require("nodemailer");

// Creates a reusable "transporter" — this is the object that actually
// connects to Gmail's servers and sends the mail.
// EMAIL_USER and EMAIL_PASS come from backend/.env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email to a student.
 * @param {string} to      - student's email address
 * @param {string} subject - email subject line
 * @param {string} text    - plain text message body
 *
 * NOTE: If EMAIL_USER / EMAIL_PASS are not set correctly in .env,
 * this will throw an error. The calling code (adminController.js)
 * catches that error so an email failure never blocks the
 * Approve/Reject action itself — the project status still gets
 * updated in MongoDB even if the email fails to send.
 */
const sendEmail = async (to, subject, text) => {
  await transporter.sendMail({
    from: `"Project Expo Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

module.exports = sendEmail;
