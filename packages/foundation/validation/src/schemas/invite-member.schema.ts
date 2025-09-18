import { z } from 'zod/v3';

export const inviteMemberSchema = z.object({
  identifier: z.string().superRefine((val, ctx) => {
    if (z.string().uuid().safeParse(val).success) {
      return;
    }
    if (z.string().email().safeParse(val).success) {
      return;
    }
    ctx.addIssue({
      code: "custom",
      message: 'Identifier must be a valid email or user ID',
    });
  }),
  role: z.enum(['owner', 'editor']).default('editor'),
});

export type InviteMemberFormInput = z.input<typeof inviteMemberSchema>;
export type InviteMemberFormOutput = z.output<typeof inviteMemberSchema>;
