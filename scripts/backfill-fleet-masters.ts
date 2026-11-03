#!/usr/bin/env tsx
// Run with: node --env-file=.env.local --import tsx scripts/backfill-fleet-masters.ts
import mongoose from "mongoose";
import dbConnect from "../src/lib/db";
import DriverModel from "../src/models/Driver";
import LorryHireModel from "../src/models/LorryHire";
import VehicleModel from "../src/models/Vehicle";
import { normalizeVehicleNumber } from "../src/lib/lorry-hire/constants";

const digits = (value: string | undefined) => (value ?? "").replace(/\D/g, "").slice(-10);

async function main() {
  await dbConnect();
  const contracts = await LorryHireModel.find({
    companyId: { $type: "string", $ne: "" },
    status: { $ne: "Cancelled" },
  })
    .select("companyId truck.vehicleNumber truck.truckType truck.capacity truck.capacityUnit truck.chassisNo truck.engineNo truck.permitNo driver.name driver.mobile driver.licenseNumber driver.licenseExpiry insurance.policyNumber insurance.validUpto")
    .sort({ lhcDate: -1, createdAt: -1 })
    .lean();

  const vehicles = new Set<string>();
  const driverKeys = new Set<string>();
  const existingDrivers = await DriverModel.find({ companyId: { $in: [...new Set(contracts.map((contract) => contract.companyId))] } })
    .select("companyId mobile")
    .lean();
  for (const driver of existingDrivers) {
    const mobile = digits(driver.mobile);
    if (mobile.length === 10) driverKeys.add(`${driver.companyId}:${mobile}`);
  }

  for (const contract of contracts) {
    const companyId = contract.companyId;
    const registrationNumber = normalizeVehicleNumber(contract.truck?.vehicleNumber ?? "");
    if (registrationNumber) {
      const key = `${companyId}:${registrationNumber}`;
      if (!vehicles.has(key)) {
        await VehicleModel.updateOne(
          { companyId, registrationNumber },
          {
            $setOnInsert: {
              companyId,
              registrationNumber,
              ownership: "Market",
              truckType: contract.truck?.truckType ?? "",
              capacity: contract.truck?.capacity ?? 0,
              capacityUnit: contract.truck?.capacityUnit ?? "MTS",
              chassisNo: contract.truck?.chassisNo ?? "",
              engineNo: contract.truck?.engineNo ?? "",
              status: "Active",
              documents: {
                insurance: {
                  number: contract.insurance?.policyNumber ?? "",
                  expiresOn: contract.insurance?.validUpto,
                },
                permit: { number: contract.truck?.permitNo ?? "" },
              },
            },
          },
          { upsert: true }
        );
        vehicles.add(key);
      }
    }

    const mobile = digits(contract.driver?.mobile);
    const name = (contract.driver?.name ?? "").trim();
    if (!name || mobile.length !== 10) continue;
    const driverKey = `${companyId}:${mobile}`;
    if (driverKeys.has(driverKey)) continue;
    await DriverModel.updateOne(
      { companyId, mobile: { $in: [mobile, contract.driver?.mobile] } },
      {
        $setOnInsert: {
          companyId,
          name,
          mobile,
          licenseNumber: contract.driver?.licenseNumber ?? "",
          licenseExpiry: contract.driver?.licenseExpiry,
          status: "Active",
        },
      },
      { upsert: true }
    );
    driverKeys.add(driverKey);
  }

  console.log(`Fleet master backfill complete. Processed ${contracts.length} LHCs, ${vehicles.size} vehicle identities, and ${driverKeys.size} driver identities.`);
}

main()
  .catch((error: unknown) => {
    console.error("Fleet master backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
