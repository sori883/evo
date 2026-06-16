import { z } from "zod";

/** サインアップ/サインインの入力。 */
export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** メール確認コードの入力。 */
export const confirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});
export type ConfirmInput = z.infer<typeof confirmSchema>;
