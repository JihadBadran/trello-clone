import zod from "zod/v3";

export const validateEmail = zod.string().email();

export const validateUuid = zod.string().uuid();