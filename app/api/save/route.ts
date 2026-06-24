import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

const HEADER = ["Date", "Time", "SYS (mmHg)", "DIA (mmHg)", "Pulse (bpm)"];

function getSheetsClient() {
  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credsJson) {
    throw new Error("Server is missing GOOGLE_SERVICE_ACCOUNT_JSON.");
  }
  const credentials = JSON.parse(credsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Medical-standard thresholds (American Heart Association categories).
function colorForSys(sys: number): [number, number, number] {
  if (sys >= 180) return [0.85, 0.1, 0.1]; // red - crisis
  if (sys >= 140) return [0.85, 0.3, 0.2]; // red - high
  if (sys >= 120) return [0.95, 0.78, 0.2]; // yellow - elevated
  return [0.4, 0.75, 0.35]; // green - normal
}

function colorForDia(dia: number): [number, number, number] {
  if (dia >= 120) return [0.85, 0.1, 0.1];
  if (dia >= 90) return [0.85, 0.3, 0.2];
  if (dia >= 80) return [0.95, 0.78, 0.2];
  return [0.4, 0.75, 0.35];
}

export async function POST(req: NextRequest) {
  try {
    const { sys, dia, pulse } = await req.json();
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      throw new Error("Server is missing GOOGLE_SHEET_ID.");
    }

    const sysNum = Number(sys);
    const diaNum = Number(dia);
    const pulseNum = Number(pulse);

    if (!Number.isFinite(sysNum) || !Number.isFinite(diaNum) || !Number.isFinite(pulseNum)) {
      return NextResponse.json({ error: "Readings must be numbers." }, { status: 400 });
    }

    const sheets = getSheetsClient();
    const sheetName = "Sheet1";

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:E1`,
    });

    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: "RAW",
        requestBody: { values: [HEADER] },
      });
    }

    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[date, time, sysNum, diaNum, pulseNum]] },
    });

    const updatedRange = appendResult.data.updates?.updatedRange;
    const rowMatch = updatedRange?.match(/(\d+):/);
    const rowIndex = rowMatch ? Number(rowMatch[1]) - 1 : null;

    if (rowIndex !== null) {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
      const gridSheetId = sheet?.properties?.sheetId;

      if (gridSheetId !== undefined && gridSheetId !== null) {
        const [r, g, b] = colorForSys(sysNum);
        const [dr, dg, db] = colorForDia(diaNum);

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: gridSheetId,
                    startRowIndex: rowIndex,
                    endRowIndex: rowIndex + 1,
                    startColumnIndex: 2,
                    endColumnIndex: 3,
                  },
                  cell: {
                    userEnteredFormat: { backgroundColor: { red: r, green: g, blue: b } },
                  },
                  fields: "userEnteredFormat.backgroundColor",
                },
              },
              {
                repeatCell: {
                  range: {
                    sheetId: gridSheetId,
                    startRowIndex: rowIndex,
                    endRowIndex: rowIndex + 1,
                    startColumnIndex: 3,
                    endColumnIndex: 4,
                  },
                  cell: {
                    userEnteredFormat: { backgroundColor: { red: dr, green: dg, blue: db } },
                  },
                  fields: "userEnteredFormat.backgroundColor",
                },
              },
            ],
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save this reading." }, { status: 500 });
  }
}
