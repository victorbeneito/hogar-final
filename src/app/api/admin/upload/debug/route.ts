import { NextResponse } from "next/server";
import { access, mkdir, writeFile, constants } from "fs/promises";
import path from "path";

export async function GET() {
  const cwd = process.cwd();
  const uploadDir = path.join(cwd, "public", "img", "productos");
  const publicDir = path.join(cwd, "public");
  const imgDir = path.join(cwd, "public", "img");

  const checks: Record<string, string> = { cwd };

  for (const [key, dir] of [["publicDir", publicDir], ["imgDir", imgDir], ["uploadDir", uploadDir]]) {
    try {
      await access(dir as string, constants.F_OK);
      try {
        await access(dir as string, constants.W_OK);
        checks[key as string] = "exists+writable";
      } catch {
        checks[key as string] = "exists+NOT_WRITABLE";
      }
    } catch {
      checks[key as string] = "NOT_FOUND";
    }
  }

  // Intentar crear la carpeta si no existe
  try {
    await mkdir(uploadDir, { recursive: true });
    checks["mkdirResult"] = "OK";
  } catch (e: any) {
    checks["mkdirResult"] = `FAIL: ${e.message}`;
  }

  // Intentar escribir un archivo de prueba
  try {
    const testFile = path.join(uploadDir, "test-write.txt");
    await writeFile(testFile, "ok");
    checks["writeTest"] = "OK";
  } catch (e: any) {
    checks["writeTest"] = `FAIL: ${e.message}`;
  }

  return NextResponse.json(checks);
}
