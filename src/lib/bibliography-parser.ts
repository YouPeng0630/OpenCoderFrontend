import Papa from 'papaparse';

export interface BibliographicEntry {
  id?: string;
  title: string;
  authors: string[];
  
  publicationDate?: string;
  year?: string;
  
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  
  doi?: string;
  pmid?: string;
  
  abstract?: string;
  
  keywords?: string[];
  meshTerms?: string[];
  
  publicationType?: string;
  language?: string;
  source?: string;
  
  url?: string;
  affiliations?: string;
  
  [key: string]: any;
}

/**
 * Parse BibTeX format (.bib files)
 */
export function parseBibTeX(content: string): BibliographicEntry[] {
  const entries: BibliographicEntry[] = [];
  
  // Match @ARTICLE{...} or @INPROCEEDINGS{...} etc.
  const entryRegex = /@(\w+)\{([^,]+),\s*([\s\S]*?)\n\}/g;
  let match;
  
  while ((match = entryRegex.exec(content)) !== null) {
    const [, entryType, citationKey, fields] = match;
    const entry: BibliographicEntry = {
      id: citationKey,
      title: '',
      authors: [],
      publicationType: entryType.toLowerCase(),
    };
    
    // Parse individual fields
    const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(fields)) !== null) {
      const [, key, value] = fieldMatch;
      const normalizedKey = key.toLowerCase();
      
      switch (normalizedKey) {
        case 'author':
          // Split authors by 'and'
          entry.authors = value.split(' and ').map(a => a.trim());
          break;
        case 'title':
          entry.title = value;
          break;
        case 'year':
          entry.year = value;
          break;
        case 'date':
          entry.publicationDate = value;
          if (!entry.year) {
            entry.year = value.substring(0, 4);
          }
          break;
        case 'journal':
        case 'journaltitle':
          entry.journal = value;
          break;
        case 'booktitle':
          if (!entry.journal) entry.journal = value;
          break;
        case 'volume':
          entry.volume = value;
          break;
        case 'number':
        case 'issue':
          entry.issue = value;
          break;
        case 'pages':
          entry.pages = value;
          break;
        case 'doi':
          entry.doi = normalizeDOI(value);
          break;
        case 'abstract':
          entry.abstract = value;
          break;
        case 'url':
          entry.url = value;
          break;
        case 'keywords':
        case 'keyword':
          entry.keywords = value.split(/[;,]/).map(k => k.trim()).filter(k => k);
          break;
        case 'language':
          entry.language = value;
          break;
        case 'publisher':
          if (!entry.source) entry.source = value;
          break;
        case 'issn':
          entry[normalizedKey] = value;
          break;
        case 'affiliation':
        case 'affiliations':
          entry.affiliations = value;
          break;
        case 'note':
          // Sometimes note contains PMID
          const pmidMatch = value.match(/PMID[:\s]+(\d+)/i);
          if (pmidMatch) {
            entry.pmid = pmidMatch[1];
          }
          entry[normalizedKey] = value;
          break;
        default:
          entry[normalizedKey] = value;
      }
    }
    
    if (entry.title) {
      entries.push(entry);
    }
  }
  
  return entries;
}

/**
 * Normalize DOI to clean format (remove URL prefix)
 */
function normalizeDOI(doi: string): string {
  if (!doi) return doi;
  
  // Remove common DOI URL prefixes
  return doi
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim();
}

/**
 * Normalize PMID to numeric string only
 */
function normalizePMID(pmid: string): string {
  if (!pmid) return pmid;
  
  // Extract only digits
  const match = pmid.match(/\d+/);
  return match ? match[0] : pmid;
}

/**
 * Parse RIS format (.ris files)
 */
export function parseRIS(content: string): BibliographicEntry[] {
  const entries: BibliographicEntry[] = [];
  const lines = content.split('\n');
  
  let currentEntry: BibliographicEntry | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('TY  -')) {
      // Start new entry
      const type = trimmed.substring(6).trim();
      currentEntry = {
        title: '',
        authors: [],
        publicationType: type,
      };
    } else if (trimmed.startsWith('ER  -')) {
      // End current entry
      if (currentEntry && currentEntry.title) {
        entries.push(currentEntry);
      }
      currentEntry = null;
    } else if (currentEntry && trimmed.includes('  - ')) {
      const [tag, ...valueParts] = trimmed.split('  - ');
      const value = valueParts.join('  - ').trim();
      
      switch (tag) {
        case 'AU':
        case 'A1':
          currentEntry.authors.push(value);
          break;
        case 'TI':
        case 'T1':
          currentEntry.title = value;
          break;
        case 'PY':
        case 'Y1':
          currentEntry.year = value;
          break;
        case 'DA':
          currentEntry.publicationDate = value;
          if (!currentEntry.year) {
            currentEntry.year = value.substring(0, 4);
          }
          break;
        case 'T2':
        case 'JO':
        case 'JF':
          currentEntry.journal = value;
          break;
        case 'VL':
          currentEntry.volume = value;
          break;
        case 'IS':
          currentEntry.issue = value;
          break;
        case 'SP':
          currentEntry.pages = value;
          break;
        case 'EP':
          if (currentEntry.pages) {
            currentEntry.pages += '-' + value;
          } else {
            currentEntry.pages = value;
          }
          break;
        case 'DO':
          currentEntry.doi = normalizeDOI(value);
          break;
        case 'AB':
        case 'N2':
          currentEntry.abstract = value;
          break;
        case 'UR':
        case 'L3':
          currentEntry.url = value;
          break;
        case 'KW':
          if (!currentEntry.keywords) currentEntry.keywords = [];
          currentEntry.keywords.push(value);
          break;
        case 'M3':
          currentEntry.publicationType = value;
          break;
        case 'LA':
          currentEntry.language = value;
          break;
        case 'DB':
          currentEntry.source = value;
          break;
        case 'AD':
          currentEntry.affiliations = value;
          break;
        case 'SN':
          currentEntry['issn'] = value;
          break;
        case 'ID':
          currentEntry.id = value;
          break;
        case 'N1':
          // Note field may contain PMID or other info
          const pmidMatch = value.match(/PMID[:\s]+(\d+)/i);
          if (pmidMatch) {
            currentEntry.pmid = pmidMatch[1];
          }
          break;
      }
    }
  }
  
  return entries;
}

/**
 * Parse CSV format - typically from Scopus or Web of Science
 */
export function parseCSV(content: string): Promise<BibliographicEntry[]> {
  return new Promise<BibliographicEntry[]>((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const entries: BibliographicEntry[] = [];
        
        for (const row of results.data as any[]) {
          const entry: BibliographicEntry = {
            title: '',
            authors: [],
          };
          
          // Map common CSV column names to our format
          // Support Scopus, Web of Science, PubMed, and other common formats
          const columnMappings: { [key: string]: string[] } = {
            title: ['Title', 'title', 'Article Title', 'TI', 'Article title'],
            authors: ['Authors', 'Author(s)', 'Author full names', 'AU', 'Author', 'Author Full Names'],
            year: ['Year', 'Publication Year', 'PY', 'year'],
            journal: ['Source title', 'Journal', 'Source Title', 'SO', 'journal', 'Publication Name'],
            volume: ['Volume', 'VL', 'volume'],
            issue: ['Issue', 'IS', 'issue'],
            pages: ['Pages', 'pages', 'Page range'],
            doi: ['DOI', 'doi'],
            pmid: ['PubMed ID', 'PMID', 'pmid', 'PubMed Id'],
            abstract: ['Abstract', 'abstract', 'AB'],
            keywords: ['Author Keywords', 'Keywords', 'Keyword', 'KW'],
            meshTerms: ['Index Keywords', 'MeSH Terms', 'Medical Subject Headings'],
            url: ['Link', 'URL', 'url', 'Web Address'],
            language: ['Language of Original Document', 'Language', 'LA'],
            publicationType: ['Document Type', 'Publication Type', 'Type', 'M3'],
            source: ['Source', 'Database', 'DB'],
            affiliations: ['Affiliations', 'Affiliation', 'Author Affiliations'],
          };
          
          // Process Page start/end separately
          const pageStart = row['Page start'] || row['SP'];
          const pageEnd = row['Page end'] || row['EP'];
          if (pageStart || pageEnd) {
            entry.pages = [pageStart, pageEnd].filter(Boolean).join('-');
          }
          
          // Find and map columns
          for (const [field, possibleColumns] of Object.entries(columnMappings)) {
            for (const col of possibleColumns) {
              if (row[col]) {
                if (field === 'authors') {
                  // Parse authors - they might be separated by ; or ,
                  const authorsStr = row[col];
                  entry.authors = authorsStr
                    .split(/[;](?![^(]*\))/)  // Split by ; but not inside parentheses
                    .map((a: string) => a.trim())
                    .filter((a: string) => a.length > 0);
                } else if (field === 'keywords' || field === 'meshTerms') {
                  // Parse keywords/MeSH terms
                  const keywordsStr = row[col];
                  const keywords = keywordsStr
                    .split(/[;,]/)
                    .map((k: string) => k.trim())
                    .filter((k: string) => k.length > 0);
                  
                  if (field === 'keywords') {
                    entry.keywords = keywords;
                  } else {
                    entry.meshTerms = keywords;
                  }
                } else if (field === 'doi') {
                  entry.doi = normalizeDOI(row[col]);
                } else if (field === 'pmid') {
                  entry.pmid = normalizePMID(row[col]);
                } else {
                  entry[field as keyof BibliographicEntry] = row[col];
                }
                break;
              }
            }
          }
          
          // Only add if we have at least a title
          if (entry.title) {
            entries.push(entry);
          }
        }
        
        resolve(entries);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Auto-detect file type and parse accordingly
 */
export async function parseBibliographyFile(file: File): Promise<BibliographicEntry[]> {
  const content = await file.text();
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'bib':
      return parseBibTeX(content);
    case 'ris':
      return parseRIS(content);
    case 'csv':
      return await parseCSV(content);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

/**
 * Convert bibliographic entry to task payload
 * CRITICAL: Uses `meta` not `metadata` to match backend TaskPayload model
 */
export function bibliographyToTaskPayload(entry: BibliographicEntry): {
  title: string;
  task_type: string;
  payload: {
    text: string;
    meta: {
      bibliographic: {
        title: string;
        authors: string[];
        publicationDate?: string;
        year?: string;
        journal?: string;
        volume?: string;
        issue?: string;
        pages?: string;
        doi?: string;
        pmid?: string;
        abstract?: string;
        keywords?: string[];
        meshTerms?: string[];
        publicationType?: string;
        language?: string;
        source?: string;
        url?: string;
        affiliations?: string;
      };
    };
  };
} {
  // Use abstract as main text if available, otherwise use title
  const text = entry.abstract || entry.title;
  
  return {
    title: entry.title,
    task_type: 'bibliographic',  // Explicitly set task type
    payload: {
      text,
      meta: {  // FIXED: Changed from 'metadata' to 'meta'
        bibliographic: {
          title: entry.title,
          authors: entry.authors,
          publicationDate: entry.publicationDate,
          year: entry.year,
          journal: entry.journal,
          volume: entry.volume,
          issue: entry.issue,
          pages: entry.pages,
          doi: entry.doi,
          pmid: entry.pmid,
          abstract: entry.abstract,
          keywords: entry.keywords,
          meshTerms: entry.meshTerms,
          publicationType: entry.publicationType,
          language: entry.language,
          source: entry.source,
          url: entry.url,
          affiliations: entry.affiliations,
        },
      },
    },
  };
}
