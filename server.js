require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const { ensureSchema, getDatabase } = require("./lib/database");

// ---------- Email (optional) ----------
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  console.warn("[mail] SMTP not configured - email notifications are disabled.");
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function sendNotification({ name, email, subject, message }) {
  if (!transporter) return false;
  const to = process.env.NOTIFY_TO || process.env.SMTP_USER;
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    replyTo: `${name} <${email}>`,
    subject: `[Portfolio] ${subject || "New message"} - from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `<h3>New portfolio message</h3>
      <p><b>Name:</b> ${escapeHtml(name)}<br><b>Email:</b> ${escapeHtml(email)}</p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });
  return true;
}

// ---------- App ----------
const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
      },
    },
  })
);
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many messages. Please try again later." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get("/api/health", async (_req, res) => {
  try {
    await getDatabase().execute("SELECT 1");
    return res.json({ ok: true, database: "connected" });
  } catch (err) {
    const notConfigured = err.code === "DATABASE_NOT_CONFIGURED";
    return res.status(notConfigured ? 503 : 500).json({
      ok: false,
      database: notConfigured ? "not_configured" : "unavailable",
    });
  }
});

app.post("/api/contact", contactLimiter, async (req, res) => {
  const { name, email, subject, message, website } = req.body || {};

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (website) return res.json({ ok: true });

  const clean = {
    name: String(name || "").trim(),
    email: String(email || "").trim(),
    subject: String(subject || "").trim(),
    message: String(message || "").trim(),
  };

  const errors = {};
  if (clean.name.length < 2 || clean.name.length > 100) errors.name = "Please enter your name (2-100 characters).";
  if (!EMAIL_RE.test(clean.email) || clean.email.length > 200) errors.email = "Please enter a valid email address.";
  if (clean.subject.length > 150) errors.subject = "Subject is too long (max 150 characters).";
  if (clean.message.length < 10 || clean.message.length > 3000) errors.message = "Message must be 10-3000 characters.";

  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

  try {
    const db = await ensureSchema();
    await db.execute({
      sql: "INSERT INTO messages (name, email, subject, message, ip) VALUES (?, ?, ?, ?, ?)",
      args: [clean.name, clean.email, clean.subject, clean.message, req.ip || null],
    });
  } catch (err) {
    console.error("[db]", err.message);
    const notConfigured = err.code === "DATABASE_NOT_CONFIGURED";
    return res.status(notConfigured ? 503 : 500).json({
      ok: false,
      error: notConfigured
        ? "The message form is not configured yet. Please contact me by email."
        : "Could not save your message. Please try again.",
    });
  }

  // Email failure should not fail the request; the message is already stored.
  try {
    await sendNotification(clean);
  } catch (err) {
    console.error("[mail]", err.message);
  }

  return res.json({ ok: true });
});

app.use("/api", (_req, res) => res.status(404).json({ ok: false, error: "Not found" }));

module.exports = app;
