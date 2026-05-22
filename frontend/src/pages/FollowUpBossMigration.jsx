import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload, CheckCircle2, AlertCircle, FileText, Users, ArrowRight,
  Loader2, Download, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner';

// --- FUB CSV field → our schema mapping ---
const FUB_CONTACT_MAP = {
  'First Name':   (r) => r['First Name'] || r['first_name'] || '',
  'Last Name':    (r) => r['Last Name']  || r['last_name']  || '',
  'Email':        (r) => r['Email']      || r['email']       || '',
  'Phone':        (r) => r['Phone']      || r['phone']       || r['Mobile Phone'] || '',
  'Stage':        (r) => mapStatus(r['Stage'] || r['status']),
  'Source':       (r) => r['Source']     || r['source']      || '',
  'Notes':        (r) => r['Notes']      || r['notes']       || '',
  'Tags':         (r) => r['Tags']       || r['tags']        || '',
  'Agent':        (r) => r['Agent']      || r['assigned_to'] || '',
  'Address':      (r) => r['Address']    || r['address']     || '',
  'City':         (r) => r['City']       || r['city']        || '',
  'State':        (r) => r['State']      || r['state']       || '',
  'Zip':          (r) => r['Zip']        || r['zip']         || r['Zip Code'] || '',
};

function mapStatus(stage) {
  if (!stage) return 'prospect';
  const s = stage.toLowerCase();
  if (s.includes('active') || s.includes('hot'))   return 'active';
  if (s.includes('inactive') || s.includes('cold')) return 'inactive';
  return 'prospect';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted commas
    const values = [];
    let cur = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    return headers.reduce((obj, h, i) => { obj[h] = values[i] || ''; return obj; }, {});
  }).filter(r => r['Email'] || r['First Name'] || r['email'] || r['first_name']);
}

function rowToContact(row) {
  const tags = FUB_CONTACT_MAP['Tags'](row)
    ? FUB_CONTACT_MAP['Tags'](row).split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return {
    first_name:           FUB_CONTACT_MAP['First Name'](row),
    last_name:            FUB_CONTACT_MAP['Last Name'](row),
    email:                FUB_CONTACT_MAP['Email'](row),
    phone:                FUB_CONTACT_MAP['Phone'](row),
    status:               FUB_CONTACT_MAP['Stage'](row),
    notes:                FUB_CONTACT_MAP['Notes'](row),
    address:              FUB_CONTACT_MAP['Address'](row),
    city:                 FUB_CONTACT_MAP['City'](row),
    state:                FUB_CONTACT_MAP['State'](row),
    zip_code:             FUB_CONTACT_MAP['Zip'](row),
    assigned_agent_email: FUB_CONTACT_MAP['Agent'](row),
    contact_type:         'buyer',
    tags,
  };
}

const BATCH_SIZE = 20;

export default function FollowUpBossMigration() {
  const fileRef = useRef();
  const [rows, setRows]           = useState([]);
  const [preview, setPreview]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults]     = useState(null);
  const [fileName, setFileName]   = useState('');

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
      if (parsed.length === 0) {
        toast.error('No valid rows found. Check your CSV format.');
      } else {
        toast.success(`Parsed ${parsed.length} records from ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    let imported = 0, failed = 0, dupes = 0;

    // Fetch existing emails to avoid duplicates
    const existing = await base44.entities.Contact.list('-created_date', 1000);
    const existingEmails = new Set(existing.map(c => c.email?.toLowerCase()).filter(Boolean));

    const contacts = rows.map(rowToContact).filter(c => c.first_name || c.email);
    const fresh = contacts.filter(c => !c.email || !existingEmails.has(c.email.toLowerCase()));
    dupes = contacts.length - fresh.length;

    // Batch create
    for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
      const batch = fresh.slice(i, i + BATCH_SIZE);
      try {
        await base44.entities.Contact.bulkCreate(batch);
        imported += batch.length;
      } catch (err) {
        console.error('Batch failed:', err);
        failed += batch.length;
      }
    }

    setResults({ imported, failed, dupes, total: contacts.length });
    setImporting(false);
    toast.success(`Migration complete: ${imported} imported`);
  };

  const reset = () => {
    setRows([]);
    setResults(null);
    setFileName('');
    setPreview(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const mapped = rows.map(rowToContact);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Follow Up Boss Migration</h1>
          <p className="text-slate-500 mt-1 text-sm">Import your contacts and leads from a Follow Up Boss CSV export.</p>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-blue-900 text-sm">How to export from Follow Up Boss</p>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Log into Follow Up Boss → go to <strong>Admin</strong></li>
              <li>Click <strong>Export</strong> (or People → Export All)</li>
              <li>Download the <strong>People CSV</strong> file</li>
              <li>Upload it below</li>
            </ol>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4" /> Upload CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              {fileName ? (
                <p className="font-medium text-slate-800">{fileName}</p>
              ) : (
                <p className="text-slate-500 text-sm">Click to select your FUB export CSV</p>
              )}
              {rows.length > 0 && (
                <p className="text-green-600 text-sm mt-1 font-medium">{rows.length} records ready</p>
              )}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>

            {rows.length > 0 && !results && (
              <div className="flex flex-wrap gap-3">
                <Button onClick={runImport} disabled={importing} className="flex-1 sm:flex-none">
                  {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                  {importing ? 'Importing…' : `Import ${rows.length} Records`}
                </Button>
                <Button variant="outline" onClick={() => setPreview(!preview)}>
                  <Eye className="w-4 h-4 mr-2" />
                  {preview ? 'Hide' : 'Preview'}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Reset
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview table */}
        {preview && mapped.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview (first 10 rows)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left py-1 pr-3">Name</th>
                    <th className="text-left py-1 pr-3">Email</th>
                    <th className="text-left py-1 pr-3">Phone</th>
                    <th className="text-left py-1 pr-3">Status</th>
                    <th className="text-left py-1">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 10).map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 pr-3 font-medium">{c.first_name} {c.last_name}</td>
                      <td className="py-1 pr-3 text-slate-600">{c.email}</td>
                      <td className="py-1 pr-3 text-slate-600">{c.phone}</td>
                      <td className="py-1 pr-3">
                        <Badge variant="outline" className="text-xs">{c.status}</Badge>
                      </td>
                      <td className="py-1 text-slate-500">{c.tags?.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mapped.length > 10 && (
                <p className="text-xs text-slate-400 mt-2">…and {mapped.length - 10} more</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h2 className="font-bold text-green-900 text-lg">Migration Complete</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBlock label="Total Records" value={results.total} />
                <StatBlock label="Imported" value={results.imported} color="text-green-700" />
                <StatBlock label="Skipped (dupes)" value={results.dupes} color="text-yellow-700" />
                <StatBlock label="Failed" value={results.failed} color={results.failed > 0 ? 'text-red-700' : 'text-slate-400'} />
              </div>
              {results.failed > 0 && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{results.failed} records failed — they may have missing required fields. Check console for details.</p>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <Button onClick={reset} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" /> Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatBlock({ label, value, color = 'text-slate-800' }) {
  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}