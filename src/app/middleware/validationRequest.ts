import type z from "zod";
import { catchAsync } from "../utils/catchAsync";
import type { NextFunction, Request, Response } from "express";
import { userValidation } from "../module/auth/auth.validation";

export const validateRequest = (zodSchema: z.ZodObject) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const payload = req.body ?? {};

		const result =
			userValidation.PatientRegistrationZodSchema.safeParse(payload);

		if (!result.success) {
			console.log(result.error);
			console.log(result.error.issues);
			throw new Error(payload.error.issues[0].message);
		}

		req.body = result.data;

		next();
	});
};
