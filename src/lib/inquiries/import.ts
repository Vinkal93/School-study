/** Parse a spreadsheet in the browser. Tenant and status fields are set by the importer. */
export async function parseInquiryImport(file: File) {
  if (file.size > 2 * 1024 * 1024) throw new Error("File must be smaller than 2 MB.");
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The file has no worksheet.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!rows.length || rows.length > 450) throw new Error("Import between 1 and 450 inquiries per file.");
  return rows.map((row, index) => {
    const fields = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value).trim()]));
    const name = fields.name || "";
    const email = fields.email || "";
    const phone = fields.phone || "";
    if (!name || (!email && !phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error(`Row ${index + 2}: name and a valid email or phone are required.`);
    return { name, email, phone, source: fields.source || "Import", organization: fields.organization || fields["school name"] || "", message: fields.message || "" };
  });
}
