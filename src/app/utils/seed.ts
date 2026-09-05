import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

export const seedSuperAdmin = async () => {
	try {
		const isSuperAdminExits = await prisma.user.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (isSuperAdminExits) {
			console.log("Super Admin already exits.");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			throw new Error("Super Admin Name, Email, Password Missing env file!!!!");
		}

		const hashPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const superAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashPassword,
				role: Role.SUPER_ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Super Admin created: ", superAdmin);
	} catch (error) {
		console.log("Error seeding super admin: ", error);

		await prisma.user.delete({
			where: {
				email: config.super_admin_email,
			},
		});
	}
};
export const seedTesterAdmin = async () => {
	try {
		const isTesterAdminExits = await prisma.user.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (isTesterAdminExits) {
			console.log("Tester Admin already exits.");
			return;
		}

		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new Error(
				"Tester Admin Name, Email, Password Missing env file!!!!",
			);
		}

		const hashPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashPassword,
				role: Role.ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Tester Admin created: ", testerAdmin);
	} catch (error) {
		console.log("Error seeding tester admin: ", error);

		await prisma.user.delete({
			where: {
				email: config.tester_admin_email,
			},
		});
	}
};

export const seedTesterDoctor = async () => {
	try {
		const isTesterDoctorExits = await prisma.user.findUnique({
			where: {
				email: config.tester_doctor_email,
			},
		});

		if (isTesterDoctorExits) {
			console.log("Tester Doctor already exits.");
			return;
		}

		const name = config.tester_doctor_name;
		const email = config.tester_doctor_email;
		const password = config.tester_doctor_password;

		if (!name || !email || !password) {
			throw new Error(
				"Tester Doctor Name, Email, Password Missing env file!!!!",
			);
		}

		const hashPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerDoctor = await prisma.user.create({
			data: {
				name,
				email,
				password: hashPassword,
				role: Role.DOCTOR,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Tester Doctor created: ", testerDoctor);
	} catch (error) {
		console.log("Error seeding tester doctor: ", error);

		await prisma.user.delete({
			where: {
				email: config.tester_doctor_email,
			},
		});
	}
};
