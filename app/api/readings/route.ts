import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function getSheetsClient() {
  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credsJson) {
    throw new Error("Server is missing GOOGLE_SERVICE_ACCOUNT_JSON.");
  }
  const credentials = JSON.parse(credsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      throw new Error("Server is missing GOOGLE_SHEET_ID.");
    }

    const sheets = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Sheet1!A2:D",
    });

    const rows = result.data.values ?? [];
    const readings = rows
      .filter((row) => row.length >= 4)
      .map((row) => ({
        date: String(row[0]),
        sys: Number(row[1]),
        dia: Number(row[2]),
        pulse: Number(row[3]),
      }))
      .filter((r) => Number.isFinite(r.sys) && Number.isFinite(r.dia) && Number.isFinite(r.pulse));

    return NextResponse.json({ readings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load readings." }, { status: 500 });
  }
}
