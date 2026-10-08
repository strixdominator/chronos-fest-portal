import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAlumniMaster, importAlumniRecords } from '@/lib/alumni';
import { AlumniRecord } from '@/lib/types';

export async function GET() {
  try {
    const list = getAlumniMaster();
    return NextResponse.json({ success: true, count: list.length, alumni: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function normalizeRecord(row: Record<string, any>): AlumniRecord | null {
  const keys = Object.keys(row);
  const findVal = (patterns: string[]) => {
    const key = keys.find(k => patterns.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p)));
    return key ? String(row[key] || '').trim() : '';
  };

  const usn = findVal(['usn', 'roll', 'seat', 'regno', 'id', 'serial']);
  if (!usn) return null;

  const fullName = findVal(['name', 'studentname', 'fullname', 'candidate']) || 'Graduate';
  const officialEmail = findVal(['email', 'mail', 'emailid']);
  const phone = findVal(['phone', 'mobile', 'contact', 'cell']);
  const department = findVal(['dept', 'department', 'branch', 'course']) || 'Engineering';
  const batchYear = findVal(['batch', 'year', 'gradyear', 'passout', 'passing']) || 'Alumni';

  return {
    usn: usn.toUpperCase(),
    fullName,
    officialEmail: officialEmail.toLowerCase(),
    phone,
    department,
    batchYear,
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Case 1: Excel or CSV file upload via FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in form-data' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

      const parsedRecords: AlumniRecord[] = [];
      for (const row of rawRows) {
        const item = normalizeRecord(row);
        if (item) parsedRecords.push(item);
      }

      if (parsedRecords.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Could not detect any USN or Name columns in the provided sheet. Please ensure columns include USN and Name.'
        }, { status: 400 });
      }

      const result = importAlumniRecords(parsedRecords);
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${parsedRecords.length} records from Excel sheet "${file.name}". (${result.added} added, ${result.updated} updated).`,
        ...result,
      });
    }

    // Case 2: JSON payload
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records)) {
      return NextResponse.json({ success: false, error: 'Expected records array' }, { status: 400 });
    }

    const normalizedList: AlumniRecord[] = [];
    for (const r of records) {
      const norm = normalizeRecord(r);
      if (norm) normalizedList.push(norm);
      else if (r.usn) {
        normalizedList.push({
          usn: String(r.usn).trim().toUpperCase(),
          fullName: String(r.fullName || r.name || 'Graduate').trim(),
          officialEmail: String(r.officialEmail || r.email || '').trim().toLowerCase(),
          phone: String(r.phone || r.mobile || '').trim(),
          department: String(r.department || r.branch || 'Engineering').trim(),
          batchYear: String(r.batchYear || r.batch || 'Alumni').trim(),
        });
      }
    }

    const result = importAlumniRecords(normalizedList);
    return NextResponse.json({
      success: true,
      message: `Processed ${normalizedList.length} alumni records (${result.added} added, ${result.updated} updated).`,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
