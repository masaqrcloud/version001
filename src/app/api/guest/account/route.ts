import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  deleteCustomerAccount,
  getCustomerFromCookie,
} from "@/lib/customer";

export async function DELETE() {
  const customer = await getCustomerFromCookie();
  if (!customer) {
    return NextResponse.json({ error: "Hesap yok" }, { status: 401 });
  }
  await deleteCustomerAccount(customer.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, "", customerCookieOptions(0));
  return response;
}
