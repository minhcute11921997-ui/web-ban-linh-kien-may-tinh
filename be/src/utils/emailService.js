const nodemailer = require("nodemailer");

const getTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("Chua cau hinh SMTP_USER/SMTP_PASS");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

exports.sendVerificationEmail = async ({ to, code }) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Ma xac minh email PC Shop",
    text: `Ma xac minh email cua ban la: ${code}. Ma co hieu luc trong 10 phut.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2>Xac minh email PC Shop</h2>
        <p>Ma xac minh cua ban la:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p>Ma co hieu luc trong 10 phut. Neu ban khong yeu cau, vui long bo qua email nay.</p>
      </div>
    `,
  });
};
