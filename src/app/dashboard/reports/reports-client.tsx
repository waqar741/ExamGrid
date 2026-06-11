'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Loader2, ArrowUpDown } from 'lucide-react';
import { getReportData, logReportExport } from '@/app/actions/reports';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface ReportsClientProps {
  branches: any[];
  currentStartDate?: string;
  currentEndDate?: string;
  currentBranchId?: string;
}

const reportTypes = [
  { value: 'employee-report', label: 'Employee Report' },
  { value: 'branch-report', label: 'Branch Report' },
  { value: 'payment-report', label: 'Payroll Report' },
  { value: 'expense-report', label: 'Expense Report' },
  { value: 'approval-report', label: 'Approval Report' },
];

const reportConfig: Record<string, { headers: string[]; keys: string[]; title: string }> = {
  'employee-report': {
    title: 'Employee Report',
    headers: ['Employee Name', 'Morning Shifts', 'Afternoon Shifts', 'Full Day Shifts', 'Total Earnings', 'Pending Earnings'],
    keys: ['employee', 'morningShifts', 'afternoonShifts', 'fullDayShifts', 'totalEarnings', 'pendingEarnings'],
  },
  'branch-report': {
    title: 'Branch Report',
    headers: ['Branch Name', 'Total Shifts', 'Total Assignments', 'Attendance Rate', 'Paid Amount', 'Pending Amount'],
    keys: ['branch', 'totalShifts', 'totalAssignments', 'attendanceRate', 'paidAmount', 'pendingAmount'],
  },
  'payment-report': {
    title: 'Payroll Report',
    headers: ['Employee', 'Branch', 'Shift', 'Amount', 'Status', 'Date'],
    keys: ['employee', 'branch', 'shift', 'amount', 'status', 'date'],
  },
  'expense-report': {
    title: 'Expense Report',
    headers: ['Date', 'Category', 'Amount', 'Status', 'Approved By'],
    keys: ['date', 'category', 'amount', 'status', 'approvedBy'],
  },
  'approval-report': {
    title: 'Approval Report',
    headers: ['Date', 'Request Type', 'Employee', 'Status', 'Processed By'],
    keys: ['date', 'type', 'employee', 'status', 'processedBy'],
  },
};

export function ReportsClient({ branches, currentStartDate, currentEndDate, currentBranchId }: ReportsClientProps) {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState('employee-report');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleFilterChange = (start: string, end: string, branch: string) => {
    const params = new URLSearchParams();
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);
    if (branch && branch !== 'all') params.set('branch', branch);
    
    router.push(`/dashboard/reports?${params.toString()}`);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getReportData(
        activeReport,
        currentStartDate,
        currentEndDate,
        currentBranchId,
        searchText
      );
      setReportData(data);
      setCurrentPage(1); // reset to first page
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeReport, currentStartDate, currentEndDate, currentBranchId, searchText]);

  const config = reportConfig[activeReport] || reportConfig['employee-report'];

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = [...reportData].sort((a, b) => {
    if (!sortKey) return 0;
    
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (typeof valA === 'string' && valA.endsWith('%')) valA = parseFloat(valA);
    if (typeof valB === 'string' && valB.endsWith('%')) valB = parseFloat(valB);

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginated data
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const triggerExportAudit = async (format: string) => {
    await logReportExport(config.title, format);
  };

  const handleExportCSV = async () => {
    await triggerExportAudit('csv');
    const csvRows = [];
    csvRows.push(config.headers.join(','));
    for (const row of sortedData) {
      const values = config.keys.map(k => {
        const val = String(row[k] ?? '').replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeReport}_report.csv`);
    link.click();
  };

  const handleExportXLSX = async () => {
    await triggerExportAudit('xlsx');
    const formatted = sortedData.map(row => {
      const obj: any = {};
      config.headers.forEach((h, idx) => {
        obj[h] = row[config.keys[idx]];
      });
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${activeReport}_report.xlsx`);
  };

  const handleExportPDF = async () => {
    await triggerExportAudit('pdf');
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(config.title, 14, 20);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    if (currentStartDate || currentEndDate || (currentBranchId && currentBranchId !== 'all')) {
      const filtersApplied = [];
      if (currentStartDate) filtersApplied.push(`Start: ${currentStartDate}`);
      if (currentEndDate) filtersApplied.push(`End: ${currentEndDate}`);
      if (currentBranchId && currentBranchId !== 'all') {
        const bName = branches.find(b => b.id === currentBranchId)?.name || 'N/A';
        filtersApplied.push(`Branch: ${bName}`);
      }
      doc.text(`Filters: ${filtersApplied.join(' | ')}`, 14, 34);
    }
    
    let y = 45;
    // Draw header line
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 5, 182, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    
    const colWidth = 182 / config.headers.length;
    config.headers.forEach((h, idx) => {
      doc.text(h, 15 + (idx * colWidth), y);
    });
    
    doc.setFont('Helvetica', 'normal');
    y += 7;
    
    sortedData.forEach((row) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
        // Re-draw headers
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, 182, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        config.headers.forEach((h, idx) => {
          doc.text(h, 15 + (idx * colWidth), y);
        });
        doc.setFont('Helvetica', 'normal');
        y += 7;
      }
      
      config.keys.forEach((k, colIdx) => {
        let val = String(row[k] ?? '');
        if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('payment') || k.toLowerCase().includes('earnings')) {
          if (!isNaN(Number(val)) && val !== '') {
            val = `Rs. ${Number(val).toFixed(2)}`;
          }
        }
        if (val.length > 25) {
          val = val.substring(0, 22) + '...';
        }
        doc.text(val, 15 + (colIdx * colWidth), y);
      });
      
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y + 2, 196, y + 2);
      y += 7;
    });
    
    doc.save(`${activeReport}_report.pdf`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Mobile Report Selector */}
      <div className="md:hidden w-full space-y-2">
        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Report Type</label>
        <Select value={activeReport} onValueChange={(val) => setActiveReport(val || '')}>
            <SelectTrigger className="w-full md:w-[220px] bg-slate-50 border-slate-200 shadow-none">
              <span className="flex-1 text-left truncate">
                {reportTypes.find(r => r.value === activeReport)?.label || 'Select Report Type'}
              </span>
          </SelectTrigger>
          <SelectContent>
            {reportTypes.map(r => (
              <SelectItem key={r.value} value={r.value} label={r.label}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 space-y-1 bg-white border rounded-xl p-3 shadow-sm">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3 pt-2">Report Types</div>
        {reportTypes.map(r => (
          <button 
            key={r.value}
            onClick={() => setActiveReport(r.value)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeReport === r.value 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full space-y-6">
        <div className="border rounded-xl bg-white shadow-sm p-5 md:p-8 space-y-6">
          <div className="flex items-start gap-3 border-b pb-4">
            <div className="p-2 bg-slate-100 rounded-lg">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{config.title}</h2>
              <p className="text-sm text-slate-500 mt-1 leading-snug">
                Detailed view of {config.title.toLowerCase().replace('report', '')} metrics and data summary.
              </p>
            </div>
          </div>

          <div className="space-y-5 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Start Date</label>
                <Input 
                  type="date" 
                  value={currentStartDate || ''} 
                  onChange={(e) => handleFilterChange(e.target.value, currentEndDate || '', currentBranchId || 'all')}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">End Date</label>
                <Input 
                  type="date" 
                  value={currentEndDate || ''} 
                  onChange={(e) => handleFilterChange(currentStartDate || '', e.target.value, currentBranchId || 'all')}
                  className="bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Branch (Optional)</label>
              <Select 
                value={currentBranchId || 'all'} 
                onValueChange={(val) => handleFilterChange(currentStartDate || '', currentEndDate || '', val || 'all')}
              >
                <SelectTrigger className="w-full bg-slate-50">
                  <span className="flex-1 text-left truncate">
                    {currentBranchId === 'all' ? 'All Branches' : branches.find((b: any) => b.id === currentBranchId)?.name || 'All Branches'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="All Branches">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id} label={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Search Filter (Optional)</label>
              <Input
                type="text"
                placeholder="Type to search within results..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-slate-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <Button onClick={loadData} disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={loading || reportData.length === 0} className="border-slate-200">
              <Download className="mr-2 h-4 w-4 text-slate-500" /> Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportXLSX} disabled={loading || reportData.length === 0} className="border-slate-200">
              <Download className="mr-2 h-4 w-4 text-slate-500" /> Export Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={loading || reportData.length === 0} className="border-slate-200">
              <Download className="mr-2 h-4 w-4 text-slate-500" /> Export PDF
            </Button>
          </div>
        </div>

        {/* The Table Results */}
        {!loading && reportData.length > 0 && (
          <div className="space-y-4">
            <div className="hidden md:block rounded-xl border bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    {config.headers.map((h, idx) => (
                      <TableHead key={idx}>
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-slate-900 font-semibold text-slate-600"
                          onClick={() => handleSort(config.keys[idx])}
                        >
                          {h}
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                      {config.keys.map((k, colIdx) => {
                        let val = row[k];
                        if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('payment') || k.toLowerCase().includes('earnings')) {
                          if (!isNaN(Number(val)) && val !== '') {
                            val = `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          }
                        }
                        return (
                          <TableCell key={colIdx} className="text-sm text-slate-700">
                            {val ?? 'N/A'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="flex flex-col md:hidden border rounded-md overflow-hidden bg-white shadow-sm">
              {paginatedData.map((row, rowIdx) => (
                <div key={rowIdx} className="flex flex-col p-3 border-b last:border-b-0 gap-1.5">
                  {config.keys.map((k, colIdx) => {
                    let val = row[k];
                    if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('payment') || k.toLowerCase().includes('earnings')) {
                      if (!isNaN(Number(val)) && val !== '') {
                        val = `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                    }
                    return (
                      <div key={colIdx} className="flex justify-between items-start gap-2">
                        <span className="text-xs text-slate-500 mt-0.5">{config.headers[colIdx]}</span>
                        <span className="font-medium text-slate-900 text-sm text-right">{String(val ?? 'N/A')}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-slate-500">
                  Page <span className="font-medium text-slate-900">{currentPage}</span> of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
