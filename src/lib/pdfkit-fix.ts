import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

/**
 * PDFKit expects .afm font files in a `data/` directory relative to the bundle.
 * Raycast's bundler doesn't copy those files, but it DOES copy the `assets/` directory.
 * This fix patches PDFKit's internal font resolution to read from `assets/` instead.
 *
 * Must be called before creating any PDFDocument.
 */
export function patchPDFKitFonts(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfkit = require("pdfkit");
  const proto = pdfkit.default?.prototype ?? pdfkit.prototype;

  // Access the STANDARD_FONTS object from the bundled pdfkit module
  // We override the font method on the prototype to intercept font loading
  const origFont = proto.font;

  // Create the data directory as a symlink to assets if it doesn't exist
  const extPath = environment.assetsPath.replace(/\/assets$/, "");
  const dataDir = path.join(extPath, "data");

  if (!fs.existsSync(dataDir)) {
    try {
      fs.symlinkSync(path.join(extPath, "assets"), dataDir);
    } catch {
      // If symlink fails, try copying the files
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        const assetsDir = environment.assetsPath;
        for (const file of fs.readdirSync(assetsDir)) {
          if (file.endsWith(".afm")) {
            fs.copyFileSync(path.join(assetsDir, file), path.join(dataDir, file));
          }
        }
      } catch {
        // Last resort: ignore, will fail on PDF generation with a clear error
      }
    }
  }
}
