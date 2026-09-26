import {
	AppointmentStatus,
	PaymentStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";

const bookAppointment = async (payload: any, user: RequestUser) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
		const appointment = await tx.appointment.create({
			data: {
				status: AppointmentStatus.PENDING,
			},
		});

		const bkashIdToken = await getBkashIdToken();

		if (!bkashIdToken) {
			throw new Error("No bkash Access token found");
		}

		const bkashCreatePaymentResponse = await fetch(
			`${config.bkash_base_url}//tokenized/checkout/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash_app_key,
				},
				body: JSON.stringify({
					mode: "0011",
					payerReference: user.email,
					callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
					amount: "1200",
					currency: "BDT",
					intent: "sale",
					merchantInvoiceNumber: appointment.id,
				}),
			},
		);

		const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

		await tx.payment.create({
			data: {
				merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
				appointmentId: appointment.id,
				amount: "1200",
				gatewayResponse: bkashCreatePaymentResult,
				bkashPaymentId: bkashCreatePaymentResult.paymentID,
				payerReference: user.email,
			},
		});

		return {
			paymentUrl:bkashCreatePaymentResult.bkashURL
		}
	});

	return transactionResult;
};

const payAppointment = async (payload:any, user:RequestUser) => {
	const appointmentId = payload.appointmentId;

	if (!appointmentId) {
        throw new Error("Appointment ID is required.");
    }

	const existingAppointment = await prisma.appointment.findUnique({
		where: {
			id: appointmentId
		}
	})
	 
	if(!existingAppointment){
		throw new Error("Appointment Does not exits.")
	}

	if(existingAppointment.status !== "PENDING"){
		throw new Error("Appointment Does not Pending.")
	}

	const bkashIdToken = await getBkashIdToken();

		if (!bkashIdToken) {
			throw new Error("No bkash Access token found");
		}

		const bkashCreatePaymentResponse = await fetch(
			`${config.bkash_base_url}//tokenized/checkout/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash_app_key,
				},
				body: JSON.stringify({
					mode: "0011",
					payerReference: user.email,
					callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
					amount: "1200",
					currency: "BDT",
					intent: "sale",
					merchantInvoiceNumber: existingAppointment.id,
				}),
			},
		);

		const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

		await prisma.payment.update({
			where:{

				appointmentId: existingAppointment.id
			},
			data:{
				merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
				gatewayResponse: bkashCreatePaymentResult,
				bkashPaymentId: bkashCreatePaymentResult.paymentID,
			}
				
		});

		return {
			paymentUrl:bkashCreatePaymentResult.bkashURL
		}
}

const bookAppointmentCallback = async (query: Record<string, any>) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
		const paymentId = query.paymentID;

		if (!paymentId) {
			throw new Error("PaymentId is Missing");
		}

		const status = query.status;

		if (!status) {
			throw new Error("Status is Missing");
		}

		const bkashIdToken = await getBkashIdToken();

		if (!bkashIdToken) {
			throw new Error("No bkash Access token found");
		}

		const executedPaymentResponse = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/execute`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash_app_key,
				},
				body: JSON.stringify({
					paymentID: paymentId,
				}),
			},
		);

		const executedPaymentResult = await executedPaymentResponse.json();

		if (status === "success") {
			await tx.appointment.update({
				where: {
					id: executedPaymentResult.merchantInvoiceNumber,
				},
				data: {
					status: AppointmentStatus.CONFIRMED,
				},
			});

			await tx.payment.update({
				where: {
					appointmentId: executedPaymentResult.merchantInvoiceNumber,
					bkashPaymentId: paymentId,
				},
				data: {
					status: PaymentStatus.PAID,
					bkashTrxId: executedPaymentResult.trxID,
					paidAt: executedPaymentResult.paymentExecutedTime,
					gatewayResponse: executedPaymentResult,
				},
			});
			
			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=success`,
			};

		} else if (status === "failure") {
			await tx.payment.update({
				where: {
					bkashPaymentId: paymentId,
				},
				data: {
					status: PaymentStatus.FAILED,
					gatewayResponse: executedPaymentResult,
				},
			});

			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=failure`,
			};

		} else if (status === "cancel") {
			await tx.payment.update({
				where: {
					bkashPaymentId: paymentId,
				},
				data: {
					status: PaymentStatus.CANCELLED,
					gatewayResponse: executedPaymentResult,
				},
			});

			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=cancel`,
			};

		} else {
			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-appointments?error=payment-failed.`,
			};
		}
	});

	return transactionResult;
};

const cancelAppointment = async ( payload: any) =>{
	const transactionResult = await prisma.$transaction(async(tx) => {
		const appointmentId = payload.appointmentId;

	if (!appointmentId) {
        throw new Error("Appointment ID is required.");
    }

	const existingAppointment = await prisma.appointment.findUnique({
		where: {
			id: appointmentId
		},
		include:{
			payment: true
		}
	})

	if(existingAppointment?.status === "ONGOING" || existingAppointment?.status === "COMPLETED"){
		throw new Error ("Appointment is Ongoing or Completed")
	}

	if(existingAppointment?.status === "CANCELLED" ){
		throw new Error ("Appointment is Already Canceled")
	}

	const updatedAppointment = await tx.appointment.update({
		where:{
			id: existingAppointment?.id
		},
		data:{
			status: "CANCELLED"
		}
	})

	const bkashIdToken = await getBkashIdToken();

	if(!bkashIdToken){
		throw new Error("No bkash access token found.")
	}

	const bkashRefundCreateResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/payment/refund`, {
		method: "POST",
		headers:{
			"Content-Type": "application/json",
            Accept: "application/json",
            authorization: bkashIdToken,
            "x-app-key": config.bkash_app_key
		},
		body: JSON.stringify({
			paymentID: existingAppointment?.payment?.bkashPaymentId,
            trxID: existingAppointment?.payment?.bkashTrxId,
            amount: existingAppointment?.payment?.amount.toString(),
			sku: "Appointment Cancellation",
            reason: "Patient cancelled the appointment"
		})
	})

	
	const bkashRefundCreateResult = await bkashRefundCreateResponse.json();

	const updatedPayment = await tx.payment.update({
		where:{
			appointmentId: existingAppointment?.id
		},
		data:{
			refundedTrxId: bkashRefundCreateResult.refundTrxID,
			refundedAt: bkashRefundCreateResult.completedTime,
			refundedAmount: bkashRefundCreateResult.amount,
			refundedReason: bkashRefundCreateResult.reason,
			gatewayResponse: "Patient cancelled the appointment",
			status: PaymentStatus.REFUNDED
		}
	})

	return{
		updatedAppointment,
		updatedPayment
	}

	})

	return transactionResult;
}

export const AppointmentServices = {
	bookAppointment,
	payAppointment,
	bookAppointmentCallback,
	cancelAppointment
};
