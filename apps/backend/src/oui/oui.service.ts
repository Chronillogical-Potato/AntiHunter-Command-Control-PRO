import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { extractOui, isLocallyAdministered, isMulticast, normalizeMac } from '../utils/mac';

export interface OuiResolution {
  mac: string;
  oui: string;
  vendor?: string;
  locallyAdministered: boolean;
  multicast: boolean;
}

export interface OuiImportResult {
  imported: number;
  total: number;
  mode: 'replace' | 'merge';
}

export interface OuiStats {
  total: number;
  lastUpdated?: Date | null;
}

type OuiEntry = { oui: string; vendor: string };

@Injectable()
export class OuiService {
  private readonly logger = new Logger(OuiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolve(mac: string): Promise<OuiResolution> {
    let normalized: string;
    try {
      normalized = normalizeMac(mac);
    } catch (error) {
      this.logger.warn(`Failed to normalize MAC ${mac}: ${error}`);
      normalized = mac.toUpperCase();
    }

    const oui = extractOui(normalized);
    const entry = await this.prisma.ouiCache.findUnique({ where: { oui } }).catch(() => null);

    return {
      mac: normalized,
      oui,
      vendor: entry?.vendor,
      locallyAdministered: isLocallyAdministered(normalized),
      multicast: isMulticast(normalized),
    };
  }

  async list(limit?: number, search?: string): Promise<OuiEntry[]> {
    const where: Prisma.OuiCacheWhereInput = {};
    if (search) {
      const term = search.trim();
      if (term) {
        where.OR = [
          { oui: { contains: term.toUpperCase() } },
          { vendor: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    return this.prisma.ouiCache.findMany({
      where,
      orderBy: { oui: 'asc' },
      take: limit,
      select: { oui: true, vendor: true },
    });
  }

  async getStats(): Promise<OuiStats> {
    const [total, aggregate] = await this.prisma.$transaction([
      this.prisma.ouiCache.count(),
      this.prisma.ouiCache.aggregate({ _max: { updatedAt: true } }),
    ]);

    return {
      total,
      lastUpdated: aggregate._max.updatedAt,
    };
  }

  async exportAll(): Promise<OuiEntry[]> {
    return this.prisma.ouiCache.findMany({
      orderBy: { oui: 'asc' },
      select: { oui: true, vendor: true },
    });
  }

  async importFromBuffer(
    buffer: Buffer,
    filename: string,
    mode: 'replace' | 'merge' = 'replace',
  ): Promise<OuiImportResult> {
    const extension = filename.toLowerCase().split('.').pop() ?? '';
    let entries: OuiEntry[] = [];
    if (extension === 'json') {
      entries = this.parseJson(buffer);
    } else {
      entries = this.parseCsv(buffer);
    }

    if (entries.length === 0) {
      throw new BadRequestException('No valid OUI records found in uploaded file.');
    }

    const uniqueEntries = this.deduplicate(entries);

    if (mode === 'replace') {
      await this.prisma.$transaction([
        this.prisma.ouiCache.deleteMany({}),
        this.prisma.ouiCache.createMany({
          data: uniqueEntries,
          skipDuplicates: true,
        }),
      ]);
    } else {
      await this.prisma.$transaction(async (tx) => {
        for (const entry of uniqueEntries) {
          await tx.ouiCache.upsert({
            where: { oui: entry.oui },
            create: entry,
            update: { vendor: entry.vendor },
          });
        }
      });
    }

    const stats = await this.getStats();
    return {
      imported: uniqueEntries.length,
      total: stats.total,
      mode,
    };
  }

  private parseCsv(buffer: Buffer): OuiEntry[] {
    const text = buffer.toString('utf8');
    const rows = this.parseCsvRows(text);

    if (rows.length === 0) {
      return [];
    }

    const [headerRaw] = rows;
    const header = headerRaw.map((cell) => cell.trim().toLowerCase());
    const hasHeader = header.some((cell) => cell.includes('mac') || cell.includes('prefix'));
    const startIndex = hasHeader ? 1 : 0;

    const entries: OuiEntry[] = [];

    for (let rowIndex = startIndex; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      if (!row || row.length === 0) {
        continue;
      }
      const rawOui = row[0]?.trim();
      const vendorRaw = row[1]?.trim();
      if (!rawOui || !vendorRaw) {
        continue;
      }
      try {
        const oui = this.normalizeOui(rawOui);
        entries.push({ oui, vendor: vendorRaw.replace(/^"|"$/g, '') });
      } catch (error) {
        this.logger.warn(`Skipping invalid CSV row ${rowIndex + 1}: ${error}`);
      }
    }

    return entries;
  }

  private parseCsvRows(text: string): string[][] {
    const lines = text.split(/\r?\n/);
    const rows: string[][] = [];
    for (const rawLine of lines) {
      if (!rawLine || !rawLine.trim() || rawLine.trim().startsWith('#')) {
        continue;
      }
      rows.push(this.splitCsvLine(rawLine));
    }
    return rows;
  }

  private splitCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  private parseJson(buffer: Buffer): OuiEntry[] {
    try {
      const json = JSON.parse(buffer.toString('utf8'));
      if (!Array.isArray(json)) {
        throw new Error('JSON must be an array of { oui, vendor } objects.');
      }
      const entries: OuiEntry[] = [];
      for (const item of json) {
        if (!item) continue;
        const rawOui = typeof item.oui === 'string' ? item.oui : '';
        const vendor = typeof item.vendor === 'string' ? item.vendor : '';
        if (!rawOui || !vendor) {
          continue;
        }
        try {
          const oui = this.normalizeOui(rawOui);
          entries.push({ oui, vendor: vendor.trim() });
        } catch (error) {
          this.logger.warn(`Skipping invalid JSON entry ${JSON.stringify(item)}: ${error}`);
        }
      }
      return entries;
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse JSON OUI file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private deduplicate(entries: OuiEntry[]): OuiEntry[] {
    const map = new Map<string, OuiEntry>();
    for (const entry of entries) {
      if (!map.has(entry.oui)) {
        map.set(entry.oui, entry);
      }
    }
    return Array.from(map.values());
  }

  private normalizeOui(raw: string): string {
    const cleaned = raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (cleaned.length !== 6) {
      throw new BadRequestException(`Invalid OUI value "${raw}"`);
    }
    return cleaned;
  }
}
