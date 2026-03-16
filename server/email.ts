import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || "onboarding@resend.dev";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
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
    subject: "봉사 모집 플랫폼 이메일 인증 코드",
    text: `안녕하세요.\n\n요청하신 이메일 인증 코드는 다음과 같습니다.\n\n${code}\n\n10분 이내에 화면에 입력해주세요.\n\n감사합니다.`,
  });
}

