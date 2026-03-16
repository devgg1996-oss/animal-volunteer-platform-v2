import { Resend } from "resend";
import nodemailer from "nodemailer";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || "onboarding@resend.dev";
const useNodemailerForTest = process.env.TEST_EMAIL_PROVIDER === "nodemailer";

const resend = !useNodemailerForTest && resendApiKey ? new Resend(resendApiKey) : null;

const testSmtpHost = process.env.TEST_SMTP_HOST;
const testSmtpPort = process.env.TEST_SMTP_PORT ? Number(process.env.TEST_SMTP_PORT) : 587;
const testSmtpUser = process.env.TEST_SMTP_USER;
const testSmtpPass = process.env.TEST_SMTP_PASS;
const testFrom = process.env.TEST_SMTP_FROM;

const testTransport =
  useNodemailerForTest && testSmtpHost
    ? nodemailer.createTransport({
        host: testSmtpHost,
        port: testSmtpPort,
        secure: testSmtpPort === 465,
        auth:
          testSmtpUser && testSmtpPass
            ? {
                user: testSmtpUser,
                pass: testSmtpPass,
              }
            : undefined,
      })
    : null;

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const subject = "봉사 모집 플랫폼 이메일 인증 코드";
  const text = `안녕하세요.\n\n요청하신 이메일 인증 코드는 다음과 같습니다.\n\n${code}\n\n10분 이내에 화면에 입력해주세요.\n\n감사합니다.`;

  // 테스트 모드(Nodemailer + SMTP)
  if (useNodemailerForTest) {
    if (!testTransport || !testFrom) {
      console.warn(
        "[email] Nodemailer 테스트 모드이지만 SMTP 설정이 부족합니다. 이메일을 전송하지 않습니다.",
        { to, code }
      );
      return;
    }
    await testTransport.sendMail({
      from: testFrom,
      to,
      subject,
      text,
    });
    return;
  }

  // 기본: Resend 사용
  if (!resend) {
    console.warn("[email] RESEND_API_KEY 가 설정되지 않아 이메일을 전송하지 않습니다.", {
      to,
      code,
    });
    return;
  }

  await resend.emails.send({
    from: resendFrom,
    to,
    subject,
    text,
  });
}

