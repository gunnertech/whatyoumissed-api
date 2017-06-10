import nodemailer from 'nodemailer';
import Rx      from 'rxjs/Rx';

let mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // secure:true for port 465, secure:false for port 587
  authMethod: 'PLAIN',
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

mailer.verify(function(error, success) {
   if (error) {
        console.log(error);
   } else {
        console.log('Server is ready to take our messages');
   }
});


export default mailer;