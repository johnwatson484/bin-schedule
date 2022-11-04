import nodemailer from 'nodemailer'

function sendEmail (message) {
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
    html: '<h3>Bin Day Alert</h3><p>' + message + '</p>'
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}

export default sendEmail
