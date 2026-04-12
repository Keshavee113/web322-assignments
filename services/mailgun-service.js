const Mailgun = require("mailgun.js");
const formData = require("form-data");

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY
});

async function sendEmail(to, subject, html) {
  return mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: process.env.MAILGUN_FROM,
    to: [to],
    subject,
    html
  });
}

module.exports = { sendEmail };