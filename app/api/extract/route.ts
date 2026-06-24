import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

export const runtime = "nodejs";

function getVisionClient() {
  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credsJson) {
    throw new Error("Server is missing GOOGLE_SERVICE_ACCOUNT_JSON.");
  }
  const credentials = JSON.parse(credsJson);
  return new ImageAnnotatorClient({ credentials });
}

function pickNumbersNearLabel(text: string, label: RegExp): string | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (label.test(lines[i])) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 1); j++) {
        const match = lines[j].match(/\d{2,3}/);
        if (match) return match[0];
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No photo provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const client = getVisionClient();

    const [result] = await client.textDetection({ image: { content: buffer } });
    const text = result.fullTextAnnotation?.text ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Couldn't find any numbers in that photo. Try again with better lighting." },
        { status: 422 }
      );
    }

    const sys = pickNumbersNearLabel(text, /sys/i);
    const dia = pickNumbersNearLabel(text, /dia/i);
    const pulse = pickNumbersNearLabel(text, /pul/i);

    if (!sys && !dia && !pulse) {
      const allNumbers = text.match(/\d{2,3}/g) ?? [];
      return NextResponse.json({
        sys: allNumbers[0] ?? "",
        dia: allNumbers[1] ?? "",
        pulse: allNumbers[2] ?? "",
      });
    }

    return NextResponse.json({ sys: sys ?? "", dia: dia ?? "", pulse: pulse ?? "" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong reading that photo." },
      { status: 500 }
    );
  }
}
