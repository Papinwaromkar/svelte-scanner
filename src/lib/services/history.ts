import type { ScanRecord, BarcodeFormatType } from '../types';

const STORAGE_KEY = 'svelte_barcode_scanner_history_v2';

class HistoryService {
  private getStorage(): ScanRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveStorage(records: ScanRecord[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 2000)));
    } catch {
      // Quota exceeded
    }
  }

  public getAll(): ScanRecord[] {
    return this.getStorage();
  }

  public add(record: Omit<ScanRecord, 'id' | 'timestamp'> & { timestamp?: number }): ScanRecord {
    const list = this.getStorage();
    const newRecord: ScanRecord = {
      ...record,
      id: crypto.randomUUID ? crypto.randomUUID() : `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: record.timestamp || Date.now(),
      count: record.count || 1,
      favorite: false
    };

    const updated = [newRecord, ...list];
    this.saveStorage(updated);
    return newRecord;
  }

  public addOrIncrement(record: Omit<ScanRecord, 'id' | 'timestamp'>): ScanRecord {
    const list = this.getStorage();
    const existingIndex = list.findIndex(r => r.rawText === record.rawText && r.format === record.format);

    if (existingIndex >= 0) {
      list[existingIndex].count = (list[existingIndex].count || 1) + 1;
      list[existingIndex].timestamp = Date.now();
      const item = list.splice(existingIndex, 1)[0];
      list.unshift(item);
      this.saveStorage(list);
      return item;
    } else {
      return this.add(record);
    }
  }

  public updateNotes(id: string, notes: string, tags?: string[]): void {
    const list = this.getStorage();
    const item = list.find(r => r.id === id);
    if (item) {
      item.notes = notes;
      if (tags) item.tags = tags;
      this.saveStorage(list);
    }
  }

  public remove(id: string): void {
    const list = this.getStorage().filter(r => r.id !== id);
    this.saveStorage(list);
  }

  public toggleFavorite(id: string): void {
    const list = this.getStorage();
    const item = list.find(r => r.id === id);
    if (item) {
      item.favorite = !item.favorite;
      this.saveStorage(list);
    }
  }

  public clearAll(): void {
    this.saveStorage([]);
  }

  public importRecords(imported: ScanRecord[]): number {
    if (!Array.isArray(imported)) return 0;
    const current = this.getStorage();
    const merged = [...imported, ...current];
    // Deduplicate by ID
    const uniqueMap = new Map<string, ScanRecord>();
    for (const item of merged) {
      if (item && item.rawText && item.format) {
        uniqueMap.set(item.id || `${item.rawText}_${item.format}`, item);
      }
    }
    const finalRecords = Array.from(uniqueMap.values());
    this.saveStorage(finalRecords);
    return finalRecords.length - current.length;
  }

  public exportToCSV(records?: ScanRecord[]): string {
    const data = records || this.getAll();
    const headers = ['ID', 'ISO_Timestamp', 'Readable_Date', 'Format', 'Category', 'Raw_Content', 'Title', 'Details', 'Quantity', 'Notes', 'Favorite'];
    
    const rows = data.map(r => {
      const dateStr = new Date(r.timestamp).toISOString();
      const readableDate = new Date(r.timestamp).toLocaleString();
      return [
        `"${r.id}"`,
        `"${dateStr}"`,
        `"${readableDate}"`,
        `"${r.format}"`,
        `"${r.parsed.category}"`,
        `"${r.rawText.replace(/"/g, '""')}"`,
        `"${(r.parsed.title || '').replace(/"/g, '""')}"`,
        `"${(r.parsed.description || '').replace(/"/g, '""')}"`,
        r.count || 1,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        r.favorite ? 'YES' : 'NO'
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  public exportToExcelTSV(records?: ScanRecord[]): string {
    const data = records || this.getAll();
    const headers = ['ID', 'Date', 'Format', 'Category', 'Raw Content', 'Title', 'Details', 'Quantity', 'Notes'];
    const rows = data.map(r => {
      return [
        r.id,
        new Date(r.timestamp).toLocaleString(),
        r.format,
        r.parsed.category,
        r.rawText.replace(/\t/g, ' '),
        r.parsed.title.replace(/\t/g, ' '),
        r.parsed.description.replace(/\t/g, ' '),
        r.count || 1,
        (r.notes || '').replace(/\t/g, ' ')
      ].join('\t');
    });
    return [headers.join('\t'), ...rows].join('\r\n');
  }

  public exportToJSON(records?: ScanRecord[]): string {
    const data = records || this.getAll();
    return JSON.stringify(data, null, 2);
  }

  public exportToTXT(records?: ScanRecord[]): string {
    const data = records || this.getAll();
    return data.map((r, i) => {
      return `[${i + 1}] ${new Date(r.timestamp).toLocaleString()} | Format: ${r.format} | Qty: ${r.count || 1}\nTitle: ${r.parsed.title}\nContent: ${r.rawText}\nNotes: ${r.notes || 'None'}\n`;
    }).join('\n----------------------------------------\n\n');
  }

  public printLabelSheet(records: ScanRecord[]): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ScanCraft — Printable Barcode Labels</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: monospace, sans-serif; margin: 0; padding: 10px; color: #000; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
            .label { border: 1px dashed #666; padding: 6mm; border-radius: 4px; text-align: center; page-break-inside: avoid; }
            .title { font-size: 11px; font-weight: bold; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .code { font-size: 14px; font-weight: bold; letter-spacing: 2px; margin: 6px 0; }
            .meta { font-size: 9px; color: #555; }
            @media print {
              .label { border: 1px solid #ccc; }
            }
          </style>
        </head>
        <body>
          <h2 style="font-family: sans-serif; font-size: 14px; margin-bottom: 12px;">ScanCraft Barcode Label Sheet (${records.length} items)</h2>
          <div class="grid">
            ${records.map(r => `
              <div class="label">
                <div class="title">${r.parsed.title || 'Product'}</div>
                <div class="code">${r.rawText}</div>
                <div class="meta">${r.format} • Qty: ${r.count || 1}</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = () => { window.print(); };
          <\/script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  public downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const historyService = new HistoryService();
