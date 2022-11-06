import nodemailer from 'nodemailer'

const sendEmail = async (message) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true, // ssl
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: process.env.EMAILS,
    subject: 'Bin Day Alert',
    html: `<h3>Bin Day Alert</h3><p>${message}</p>`
  }

  await transporter.sendMail(mailOptions)
}

export default sendEmail
