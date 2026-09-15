import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { UserServices } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	console.log(req.file, "req.file");

	if (!req.file) {
		throw new Error("No file uploaded");
	}

	const userId = req.user?.userId;

	const result = await UserServices.uploadProfileImage(
		req.file?.buffer,
		userId!,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Profile Image upload successfully",
		data: result,
	});
});

export const UserController = {
	uploadProfileImage,
};
