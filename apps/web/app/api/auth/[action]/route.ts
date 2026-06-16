import { type NextRequest, NextResponse } from "next/server";
import { confirmSchema, signInSchema, signUpSchema } from "@/lib/auth-schema";
import { createCognitoService } from "@/lib/cognito-service";
import { clearSession, setSession } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
): Promise<NextResponse> {
  const { action } = await params;

  try {
    if (action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    const svc = createCognitoService();
    const json: unknown = await req.json();

    switch (action) {
      case "signup": {
        const { email, password } = signUpSchema.parse(json);
        await svc.signUp(email, password);
        return NextResponse.json({ ok: true });
      }
      case "confirm": {
        const { email, code } = confirmSchema.parse(json);
        await svc.confirm(email, code);
        return NextResponse.json({ ok: true });
      }
      case "login": {
        const { email, password } = signInSchema.parse(json);
        const tokens = await svc.signIn(email, password);
        await setSession(tokens);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 404 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "リクエストに失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
