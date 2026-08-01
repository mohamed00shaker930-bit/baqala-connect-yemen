import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  phone: z.string().regex(/^(77|78|71|73)\d{7}$/),
  reason: z.string().trim().max(500).optional(),
});

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("request_password_reset", {
      p_phone: data.phone,
      p_reason: data.reason && data.reason.length > 0 ? data.reason : undefined,
    } as never);
    if (error) console.error("[password-reset] request failed", error.message);
    return { ok: true };
  });
