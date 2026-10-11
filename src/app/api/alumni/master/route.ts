import { NextRequest, NextResponse } from 'next/server';
import { 
  getAlumniMaster, 
  importAlumniRecords, 
  parseWorkbookBuffer, 
  syncDataFolderWorkbooks,
  normalizeRecordFromObject 
} from '@/lib/alumni';
import { AlumniRecord } from '@/lib/types';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(request));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin passcode required.' },
        { status: 401 }
      );
    }

    const list = getAlumniMaster();
    
    // Group counts by department
    const departmentCounts: Record<string, number> = {};
    for (const r of list) {
      departmentCounts[r.department] = (departmentCounts[r.department] || 0) + 1;
    }

    return NextResponse.json({ 
      success: true, 
      count: list.length, 
      alumni: list,
      departmentCounts 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(request));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin passcode required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Case 0: Sync all Excel/CSV files in data/ directory
    if (action === 'syncDataDir') {
      const syncResult = syncDataFolderWorkbooks();
      return NextResponse.json({
        success: true,
        message: `Synced ${syncResult.totalFiles} spreadsheet file(s) in "data/" directory (${syncResult.recordsParsed} records parsed).`,
        ...syncResult,
      });
    }

    const contentType = request.headers.get('content-type') || '';

    // Case 1: Multi-file / single-file Excel or CSV upload via FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];
      const singleFile = formData.get('file') as File | null;
      const fileList = files.length > 0 ? files : (singleFile ? [singleFile] : []);

      if (fileList.length === 0) {
        return NextResponse.json({ success: false, error: 'No files provided in form-data' }, { status: 400 });
      }

      let allParsed: AlumniRecord[] = [];
      const fileSummaries: string[] = [];

      for (const file of fileList) {
        const bytes = await file.arrayBuffer();
        const records = parseWorkbookBuffer(Buffer.from(bytes), file.name);
        if (records.length > 0) {
          allParsed = allParsed.concat(records);
          fileSummaries.push(`${file.name} (${records.length} records)`);
        }
      }

      if (allParsed.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Could not detect any USN or Name columns in the provided files. Please ensure the sheets contain USN and Name.'
        }, { status: 400 });
      }

      const deptBreakdown: Record<string, number> = {};
      for (const r of allParsed) {
        deptBreakdown[r.department] = (deptBreakdown[r.department] || 0) + 1;
      }

      const result = importAlumniRecords(allParsed);
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${allParsed.length} records from ${fileList.length} file(s)! (${result.added} added, ${result.updated} updated).`,
        filesProcessed: fileSummaries,
        departmentBreakdown: deptBreakdown,
        ...result,
      });
    }

    // Case 2: JSON payload
    const body = await request.json().catch(() => ({}));

    if (body.action === 'syncDataDir') {
      const syncResult = syncDataFolderWorkbooks();
      return NextResponse.json({
        success: true,
        message: `Synced ${syncResult.totalFiles} spreadsheet file(s) in "data/" directory (${syncResult.recordsParsed} records parsed).`,
        ...syncResult,
      });
    }

    const { records, defaultDept, defaultBatch } = body;

    if (!Array.isArray(records)) {
      return NextResponse.json({ success: false, error: 'Expected records array' }, { status: 400 });
    }

    const normalizedList: AlumniRecord[] = [];
    for (const r of records) {
      const norm = normalizeRecordFromObject(r, defaultDept || 'Engineering', defaultBatch || 'Alumni');
      if (norm) normalizedList.push(norm);
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
