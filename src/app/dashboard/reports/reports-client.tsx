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
  { value: 'branch-summary', label: 'Branch Summary Report' },
  { value: 'branch-shift', label: 'Branch Shift Report' },
  { value: 'branch-payment', label: 'Branch Payment Report' },
  { value: 'employee-summary', label: 'Employee Summary Report' },
  { value: 'employee-attendance', label: 'Employee Attendance Report' },
  { value: 'employee-payment', label: 'Employee Payment Report' },
  { value: 'assignment-summary', label: 'Assignment Summary Report' },
  { value: 'assignment-status', label: 'Assignment Status Report' },
  { value: 'replacement-report', label: 'Replacement Report' },
  { value: 'attendance-summary', label: 'Attendance Summary Report' },
  { value: 'attendance-rate', label: 'Attendance Rate Report' },
  { value: 'branch-attendance', label: 'Branch Attendance Report' },
  { value: 'payment-summary', label: 'Payment Summary Report' },
  { value: 'monthly-payment', label: 'Monthly Payment Report' },
  { value: 'pending-payment', label: 'Pending Payment Report' },
];

const reportConfig: Record<string, { headers: string[]; keys: string[]; title: string }> = {
  'branch-summary': {
    title: 'Branch Summary Report',
    headers: ['Branch Name', 'Total Events', 'Total Assignments', 'Total Employees', 'Total Payments', 'Pending Payments'],
    keys: ['branchName', 'totalEvents', 'totalAssignments', 'totalEmployees', 'totalPayments', 'pendingPayments'],
  },
  'branch-shift': {
    title: 'Branch Shift Report',
    headers: ['Branch Name', 'Shift Date', 'Shift Type', 'Required Staff', 'Assigned Staff', 'Shortage', 'Attendance Rate'],
    keys: ['branch', 'shiftDate', 'shiftType', 'requiredStaff', 'assignedStaff', 'shortage', 'attendanceRate'],
  },
  'branch-payment': {
    title: 'Branch Payment Report',
    headers: ['Branch Name', 'Paid Amount', 'Pending Amount', 'Total Amount'],
    keys: ['branch', 'paidAmount', 'pendingAmount', 'totalAmount'],
  },
  'employee-summary': {
    title: 'Employee Summary Report',
    headers: ['Employee Name', 'Total Assignments', 'Morning Shifts', 'Afternoon Shifts', 'Full Day Shifts', 'Total Earnings'],
    keys: ['employeeName', 'totalAssignments', 'morningShifts', 'afternoonShifts', 'fullDayShifts', 'totalEarnings'],
  },
  'employee-attendance': {
    title: 'Employee Attendance Report',
    headers: ['Employee', 'Present', 'Absent', 'Late', 'Attendance Percentage'],
    keys: ['employee', 'present', 'absent', 'late', 'attendancePercentage'],
  },
  'employee-payment': {
    title: 'Employee Payment Report',
    headers: ['Employee', 'Paid Amount', 'Pending Amount', 'Total Earnings'],
    keys: ['employee', 'paidAmount', 'pendingAmount', 'totalEarnings'],
  },
  'assignment-summary': {
    title: 'Assignment Summary Report',
    headers: ['Branch', 'Shift Date', 'Shift', 'Assigned Employee', 'Status'],
    keys: ['branch', 'shiftDate', 'shift', 'employee', 'status'],
  },
  'assignment-status': {
    title: 'Assignment Status Report',
    headers: ['Assigned', 'Replaced', 'Removed', 'Completed'],
    keys: ['assigned', 'replaced', 'removed', 'completed'],
  },
  'replacement-report': {
    title: 'Replacement Report',
    headers: ['Original Employee', 'Replacement Employee', 'Branch', 'Date', 'Reason'],
    keys: ['originalEmployee', 'replacementEmployee', 'branch', 'date', 'reason'],
  },
  'attendance-summary': {
    title: 'Attendance Summary Report',
    headers: ['Present', 'Absent', 'Late', 'Replaced'],
    keys: ['present', 'absent', 'late', 'replaced'],
  },
  'attendance-rate': {
    title: 'Attendance Rate Report',
    headers: ['Attendance Rate'],
    keys: ['attendanceRate'],
  },
  'branch-attendance': {
    title: 'Branch Attendance Report',
    headers: ['Branch', 'Present', 'Absent', 'Attendance Rate'],
    keys: ['branch', 'present', 'absent', 'attendanceRate'],
  },
  'payment-summary': {
    title: 'Payment Summary Report',
    headers: ['Paid Amount', 'Pending Amount', 'Total Amount'],
    keys: ['paidAmount', 'pendingAmount', 'totalAmount'],
  },
  'monthly-payment': {
    title: 'Monthly Payment Report',
    headers: ['Month', 'Paid Amount', 'Pending Amount', 'Total Amount'],
    keys: ['month', 'paidAmount', 'pendingAmount', 'totalAmount'],
  },
  'pending-payment': {
    title: 'Pending Payment Report',
    headers: ['Employee', 'Branch', 'Amount', 'Shift Date'],
    keys: ['employee', 'branch', 'amount', 'shiftDate'],
  },
};

export function ReportsClient({ branches, currentStartDate, currentEndDate, currentBranchId }: ReportsClientProps) {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState('branch-summary');
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

  const config = reportConfig[activeReport] || reportConfig['branch-summary'];

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
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4 p-4 border rounded-md bg-muted/10">
        <div className="grid gap-2 w-full lg:w-auto">
          <label className="text-sm font-medium">Select Report Type</label>
          <Select value={activeReport} onValueChange={(val) => setActiveReport(val || '')}>
            <SelectTrigger className="w-full lg:w-[280px] font-semibold text-primary">
              <SelectValue placeholder="Select Report Type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 w-full lg:w-auto">
          <label className="text-sm font-medium">Start Date</label>
          <Input 
            type="date" 
            value={currentStartDate || ''} 
            onChange={(e) => handleFilterChange(e.target.value, currentEndDate || '', currentBranchId || 'all')}
          />
        </div>

        <div className="grid gap-2 w-full lg:w-auto">
          <label className="text-sm font-medium">End Date</label>
          <Input 
            type="date" 
            value={currentEndDate || ''} 
            onChange={(e) => handleFilterChange(currentStartDate || '', e.target.value, currentBranchId || 'all')}
          />
        </div>

        <div className="grid gap-2 w-full lg:w-auto">
          <label className="text-sm font-medium">Branch</label>
          <Select 
            value={currentBranchId || 'all'} 
            onValueChange={(val) => handleFilterChange(currentStartDate || '', currentEndDate || '', val || 'all')}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 w-full lg:w-auto">
          <label className="text-sm font-medium">Search Report</label>
          <Input
            type="text"
            placeholder="Search within report..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full lg:w-[200px]"
          />
        </div>

        <div className="flex gap-2 w-full lg:w-auto lg:ml-auto">
          <Button variant="outline" className="w-full lg:w-auto" onClick={() => {
            setSearchText('');
            handleFilterChange('', '', 'all');
          }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Main Report Section */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-bold text-card-foreground">{config.title}</h3>
            <p className="text-sm text-muted-foreground">
              Showing filtered results based on selected parameters.
            </p>
          </div>
          {reportData.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={loading}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={loading}>
                <Download className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={loading}>
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Fetching report records...</span>
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-medium">
            No records found.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {config.headers.map((h, idx) => (
                      <TableHead key={idx}>
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-foreground font-semibold"
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
                    <TableRow key={rowIdx}>
                      {config.keys.map((k, colIdx) => {
                        let val = row[k];
                        if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('payment') || k.toLowerCase().includes('earnings')) {
                          if (!isNaN(Number(val)) && val !== '') {
                            val = `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          }
                        }
                        return (
                          <TableCell key={colIdx} className="font-medium">
                            {val ?? 'N/A'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({sortedData.length} records total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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
