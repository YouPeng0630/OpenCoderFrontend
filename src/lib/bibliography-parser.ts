import Papa from 'papaparse';

export interface BibliographicEntry {
  id?: string;
  title: string;
  authors: string[];
  year?: string;
  journal?: string;
  doi?: string;
  abstract?: string;
  url?: string;
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
        case 'journal':
          entry.journal = value;
          break;
        case 'doi':
          entry.doi = value;
          break;
        case 'abstract':
          entry.abstract = value;
          break;
        case 'url':
          entry.url = value;
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
      currentEntry = {
        title: '',
        authors: [],
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
          currentEntry.authors.push(value);
          break;
        case 'TI':
          currentEntry.title = value;
          break;
        case 'PY':
          currentEntry.year = value;
          break;
        case 'T2':
        case 'JO':
        case 'JF':
          currentEntry.journal = value;
          break;
        case 'DO':
          currentEntry.doi = value;
          break;
        case 'AB':
          currentEntry.abstract = value;
          break;
        case 'UR':
        case 'L3':
          currentEntry.url = value;
          break;
        case 'ID':
          currentEntry.id = value;
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
          // Support Scopus, Web of Science, and other common formats
          const columnMappings: { [key: string]: string[] } = {
            title: ['Title', 'title', 'Article Title', 'TI'],
            authors: ['Authors', 'Author(s)', 'Author full names', 'AU'],
            year: ['Year', 'Publication Year', 'PY'],
            journal: ['Source title', 'Journal', 'Source Title', 'SO'],
            doi: ['DOI', 'doi'],
            abstract: ['Abstract', 'abstract', 'AB'],
            url: ['Link', 'URL', 'url'],
          };
          
          // Find and map columns
          for (const [field, possibleColumns] of Object.entries(columnMappings)) {
            for (const col of possibleColumns) {
              if (row[col]) {
                if (field === 'authors') {
                  // Parse authors - they might be separated by ; or ,
                  const authorsStr = row[col];
                  entry.authors = authorsStr
                    .split(/[;,](?![^(]*\))/)
                    .map((a: string) => a.trim())
                    .filter((a: string) => a.length > 0);
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
 */
export function bibliographyToTaskPayload(entry: BibliographicEntry): {
  title: string;
  payload: {
    text: string;
    metadata: any;
  };
} {
  // Use abstract as main text if available, otherwise use title
  const text = entry.abstract || entry.title;
  
  return {
    title: entry.title,
    payload: {
      text,
      metadata: {
        bibliographic: {
          title: entry.title,
          authors: entry.authors,
          year: entry.year,
          journal: entry.journal,
          doi: entry.doi,
          url: entry.url,
        },
      },
    },
  };
}
