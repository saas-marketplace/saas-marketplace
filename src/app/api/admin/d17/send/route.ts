import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getAuthedAdmin } from "@/lib/api-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { COMPANY_NAME } from "@/lib/email-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/d17/send
 *
 * Admin action: after approving ("received") a D17 payment, this sends the
 * delivery file (PDF, image, zip… up to 10 MB) as an email attachment to the
 * customer's email using the project SMTP mailer. The file itself is NOT
 * stored in the database — only a marker (deliverable_sent_at) is recorded so
 * the UI can show "Sent".
 *
 * Body: multipart/form-data { id, file }
 */
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    return NextResponse.json(
      { error: "SMTP is not configured — set SMTP_USER and SMTP_PASS in .env.local." },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const id = typeof form.get("id") === "string" ? (form.get("id") as string) : "";
  const file = form.get("file");

  if (!id) {
    return NextResponse.json({ error: "Missing payment id." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a file to send." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (max 10 MB)." }, { status: 400 });
  }

  // d17_payments RLS (migration 008) only lets a user read their OWN rows, and
  // defines no UPDATE policy at all. An admin acting on someone else's payment
  // must therefore use the service role — the same client /api/admin/d17 uses.
  // getAuthedAdmin() above is the authorisation gate; RLS is not it.
  const db = createServiceSupabaseClient();
  const { data: submission, error: loadError } = await db
    .from("d17_payments")
    .select("id, product_name, amount, currency, customer_email, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[api/admin/d17/send] load error:", loadError);
  }

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (submission.status !== "received") {
    return NextResponse.json(
      { error: "Only approved payments can receive a delivery file." },
      { status: 409 }
    );
  }
  if (!submission.customer_email) {
    return NextResponse.json({ error: "This payment has no customer email." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || "delivery-file";
  const contentType = file.type || "application/octet-stream";

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${smtpUser}>`,
      to: submission.customer_email,
      subject: `Your purchase: ${submission.product_name}`,
      html: `<!DOCTYPE html><html lang="en"><body style="margin:0;font-family:Arial,sans-serif;background:#f3f4f6;"><table width="100%" style="background:#f3f4f6;padding:20px 0;"><tr><td align="center"><table width="100%" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;"><tr><td style="padding:24px;background:#22c55e;text-align:center;"><h1 style="margin:0;font-size:20px;color:#fff;">Your file is here 📎</h1></td></tr><tr><td style="padding:24px;"><p style="margin:0 0 12px;font-size:15px;color:#374151;">Payment confirmed for <strong>${esc(submission.product_name)}</strong> (${submission.amount} ${submission.currency}).</p><p style="margin:0;font-size:15px;color:#374151;">Your delivery file <strong>${esc(filename)}</strong> is attached to this email.</p></td></tr></table></td></tr></table></body></html>`,
      text: `Payment confirmed for ${submission.product_name} (${submission.amount} ${submission.currency}). Your delivery file ${filename} is attached.`,
      attachments: [
        {
          filename,
          content: buffer,
          contentType,
        },
      ],
    });

    // Mark the submission so the admin UI can show "Sent".
    await db
      .from("d17_payments")
      .update({ deliverable_sent_at: new Date().toISOString(), deliverable_file_name: filename })
      .eq("id", id);

    return NextResponse.json({ success: true, sentTo: submission.customer_email, filename });
  } catch (error) {
    console.error("[api/admin/d17/send] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send the file." },
      { status: 500 }
    );
  }
}
