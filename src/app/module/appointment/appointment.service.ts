import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";

const bookAppointment = async () => {
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
				payerReference: "01723888888",
				callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
				amount: "1200",
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: "Inv4",
			}),
		},
	);

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

    return bkashCreatePaymentResult
};

const bookAppointmentCallback = async (query:Record<string, any>) => {
	const paymentId = query.paymentID;

	if(!paymentId){
		throw new Error("PaymentId is Missing")
	}

	const status = query.status;

	if(!status){
		throw new Error("Status is Missing")
	}

	const bkashIdToken = await getBkashIdToken();

	if (!bkashIdToken) {
		throw new Error("No bkash Access token found");
	}

	const executedPaymentResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`,{
		method: "POST",
		headers: {
			"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: bkashIdToken,
				"X-App-Key": config.bkash_app_key,
		},
		body: JSON.stringify({
			paymentID: paymentId
		})
	})

	const executedPaymentResult = await executedPaymentResponse.json();

	if(status === "success"){
		return{
			executedPaymentResult,
			redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=success`
		}
	}

	
	if(status === "failure"){
		return{
			executedPaymentResult,
			redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=failure`
		}
	}

	if(status === "cancel"){
		return{
			executedPaymentResult,
			redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=cancel`
		}
	}
	return {
		executedPaymentResult,
		redirectUrl: `${config.frontend_url}/dashboard/my-appointments`
	}

}

export const AppointmentServices = {
	bookAppointment,
	bookAppointmentCallback
};
