import { DebtType, PaymentMethod, TransactionType } from "@prisma/client";
import { z } from "zod";

const optionalDate = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") {
    return undefined;
  }
  const d = new Date(val as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d;
}, z.date().optional());

const optionalNullableDate = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") {
    return null;
  }
  const d = new Date(val as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}, z.date().nullable());

export const transactionPostSchema = z
  .object({
    description: z.preprocess(
      (v) => (typeof v === "string" ? v.trim().slice(0, 500) : ""),
      z.string().max(500)
    ),
    amount: z.coerce.number().finite(),
    type: z.nativeEnum(TransactionType).optional().default(TransactionType.EXPENSE),
    category: z.preprocess((v) => {
      const s = (typeof v === "string" ? v.trim() : "").slice(0, 100);
      return s.length > 0 ? s : "Otros";
    }, z.string().max(100)),
    paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.OTHER),
    installmentCount: z.preprocess((v) => {
      if (v === undefined || v === null || v === "") {
        return null;
      }
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n) || n <= 0) {
        return null;
      }
      return Math.floor(n);
    }, z.number().int().positive().nullable()),
    transactionAt: optionalDate,
    creditCardDebtId: z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, 64) : ""), z.string().max(64)),
    creditCardCycleSelection: z.enum(["CURRENT_STATEMENT", "NEXT_STATEMENT"]).optional()
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === PaymentMethod.CREDIT_CARD && !data.creditCardDebtId) {
      ctx.addIssue({
        code: "custom",
        message: "creditCardDebtId is required for credit card purchases",
        path: ["creditCardDebtId"]
      });
    }
  });

export const debtPostSchema = z.object({
  name: z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, 200) : ""), z.string().max(200).min(1)),
  type: z.nativeEnum(DebtType).optional().default(DebtType.FIXED_INSTALLMENT),
  initialAmount: z.coerce.number().finite(),
  currentAmount: z.coerce.number().finite().optional(),
  installmentCount: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return Math.floor(n);
  }, z.number().int().positive().nullable()),
  startedAt: optionalNullableDate,
  annualEffectiveRate: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().finite().nullable()),
  monthlyPayment: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().finite().nullable()),
  creditLimit: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().finite().nullable()),
  minimumPaymentAmount: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().finite().nullable()),
  dueDayOfMonth: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.floor(n) : null;
  }, z.number().int().min(1).max(31).nullable()),
  statementDayOfMonth: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.floor(n) : null;
  }, z.number().int().min(1).max(31).nullable()),
  statementDayPurchasesToNextCycle: z.boolean().optional()
});

export const reminderPostSchema = z.object({
  title: z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, 500) : ""), z.string().max(500).min(1)),
  type: z.enum(["PAYMENT", "ALARM"]).optional().default("PAYMENT"),
  amount: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().finite().nullable()),
  dueDate: z.coerce.date(),
  notificationAt: optionalNullableDate,
  notifyDaysBefore: z.coerce.number().int().min(0).max(365).optional().default(5),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  notifyWhatsApp: z.boolean().optional()
});

export const debtPaymentPostSchema = z.object({
  amount: z.coerce.number().finite().positive(),
  paidAt: z.coerce.date()
});

export const pushSubscriptionPostSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(200)
  })
});

export async function parseApiJson<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  return parsed.data;
}
