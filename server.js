const express = require('express');
const axios = require('axios');
require('dotenv').config();
const nodemailer = require('nodemailer');
const app = express();
const port = 3001;

const RECAPTCHA_SECRET_KEY = process.env.GOOGLE_RECAPTCHA_SECRET;

// Create a transporter object using the default SMTP transport (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use another SMTP service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
  });

//set up CORS if in local mode
if(process.env.IS_LOCAL === 'true'){
    const cors = require('cors');

    const corsOptions = {
        origin: 'http://localhost:3000', // Allow only this origin
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Restrict allowed HTTP methods
        allowedHeaders: ['Content-Type', 'Authorization'], // Limit headers that can be sent
        credentials: true, // If you want to allow cookies to be sent
    };
      
    app.use(cors(corsOptions));
}

//send email to personal email whenever a submission is made via the contact form from the front end
async function sendContactEmail(mailOptions) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent: ', info.response);
    } catch (error) {
      console.log('Error sending email: ', error);
    }
}

// Middleware for parsing JSON requests
app.use(express.json());

// Simple GET route
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Example POST route
// app.post('/data', (req, res) => {
//   const data = req.body;
//   res.json({ message: 'Data received', data });
// });

//send email to myself populated with data from contact form
app.post('/contact', async (req, res) => {
    const data = req.body;

    const recaptcha_token = data.recaptcha_token;
    // Step 1: Validate the reCAPTCHA token
    if (!recaptcha_token) {
        return res.status(400).json({ error: 'reCAPTCHA token is required' });
    }

    try{
        // Step 2: Send a request to Google's reCAPTCHA verification API
        const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
            secret: RECAPTCHA_SECRET_KEY,
            response: recaptcha_token,
            },
        });
    
        // Step 3: Check if the reCAPTCHA was valid
        const recaptchaData = response.data;
        console.log('recaptcha verification: ', recaptchaData);
        if (!recaptchaData.success) {
            return res.status(400).json({ error: 'reCAPTCHA verification failed', details: recaptchaData });
        }
    }catch (error) {
        console.error('Error verifying reCAPTCHA:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }

    const mailOptions = {
        from: 'info@prestonjang.com',
        to: process.env.EMAIL_USER,
        subject: 'Contact form Submission',
        text: `Name: ${data.firstName}  ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone}\nSubject: ${data.subject}`,
    };    

    sendContactEmail(mailOptions);
    
    res.json({ message: 'Data received', data });
  });

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
