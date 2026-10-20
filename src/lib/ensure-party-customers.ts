import mongoose from "mongoose";

import Customer from "@/models/Customer";
import { companyFilter } from "@/lib/company-scope";
import { escapeRegex } from "@/lib/escape-regex";
import { dropLegacyUniqueIndex } from "@/lib/legacy-indexes";

type PartyLike = {
  customerId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string;
  email?: string;
};

type PartiesLike = { consignor?: PartyLike; consignee?: PartyLike };

/**
 * Make sure the consignor and consignee of a bilty exist as saved Customers.
 *
 * - Party already linked to a saved customer (valid customerId of this company): untouched.
 * - Otherwise the party is matched to an existing customer by name (case-insensitive, per
 *   company) and linked to it — nothing is created or overwritten.
 * - Otherwise a new customer is created from the party details and linked.
 *
 * Mutates `parties` to set `customerId`. Never throws: a failure here must not stop the
 * bilty from being saved, the party simply stays unlinked.
 */
export async function ensurePartyCustomers(
  parties: PartiesLike,
  companyId: string,
  userId?: string
): Promise<void> {
  try {
    await dropLegacyUniqueIndex(Customer, "name");
  } catch (error) {
    console.error("ensurePartyCustomers: index check failed", error);
  }

  // Sequential on purpose: if consignor and consignee are the same new party, the second
  // lookup must find the customer the first one just created.
  for (const key of ["consignor", "consignee"] as const) {
    const party = parties[key];
    if (!party) continue;
    try {
      party.customerId = await resolveCustomerId(party, companyId, userId);
    } catch (error) {
      console.error(`ensurePartyCustomers: could not save ${key} as customer`, error);
    }
  }
}

async function resolveCustomerId(party: PartyLike, companyId: string, userId?: string): Promise<string> {
  const current = party.customerId ?? "";

  // 1. Already a saved customer of this company.
  if (current && mongoose.Types.ObjectId.isValid(current)) {
    const found = await Customer.exists({ _id: current, ...companyFilter(companyId) });
    if (found) return current;
  }

  const name = (party.name ?? "").trim();
  if (name.length < 2) return ""; // Customer.name needs at least 2 characters

  // 2. Same name already saved → link to it.
  const byName = () =>
    Customer.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
      ...companyFilter(companyId),
    })
      .select("_id")
      .lean();

  const existing = await byName();
  if (existing) return String(existing._id);

  // 3. New party → save as customer.
  try {
    const created = await Customer.create({
      name,
      address: party.address ?? "",
      city: party.city ?? "",
      state: party.state ?? "",
      pincode: party.pincode ?? "",
      gstin: party.gstin ?? "",
      mobile: party.mobile?.trim() || null,
      email: party.email ?? "",
      companyId,
      ...(userId && mongoose.Types.ObjectId.isValid(userId) ? { createdBy: userId } : {}),
    });
    return String(created._id);
  } catch (error) {
    // Lost a race with another request creating the same name.
    if ((error as { code?: number })?.code === 11000) {
      const raced = await byName();
      if (raced) return String(raced._id);
    }
    throw error;
  }
}
