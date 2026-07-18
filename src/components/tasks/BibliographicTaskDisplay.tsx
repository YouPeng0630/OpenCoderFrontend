import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface BibliographicMetadata {
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
}

interface BibliographicTaskDisplayProps {
  metadata: BibliographicMetadata;
  abstract?: string;
}

export function BibliographicTaskDisplay({ metadata, abstract }: BibliographicTaskDisplayProps) {
  const [showAllAuthors, setShowAllAuthors] = useState(false);
  
  // Format author list
  const formatAuthors = () => {
    if (!metadata.authors || metadata.authors.length === 0) {
      return null;
    }
    
    if (metadata.authors.length <= 3 || showAllAuthors) {
      return metadata.authors.join(', ');
    }
    
    return (
      <span>
        {metadata.authors.slice(0, 3).join(', ')}, et al.
        <Button
          variant="link"
          size="sm"
          className="ml-2 h-auto p-0 text-blue-600"
          onClick={() => setShowAllAuthors(true)}
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          Show all {metadata.authors.length} authors
        </Button>
      </span>
    );
  };
  
  // Format publication info
  const formatPublication = () => {
    const parts = [];
    
    if (metadata.journal) parts.push(metadata.journal);
    if (metadata.year) parts.push(metadata.year);
    
    const volumeIssue = [];
    if (metadata.volume) volumeIssue.push(`${metadata.volume}`);
    if (metadata.issue) volumeIssue.push(`(${metadata.issue})`);
    if (volumeIssue.length > 0) parts.push(volumeIssue.join(''));
    
    if (metadata.pages) parts.push(`pp. ${metadata.pages}`);
    
    return parts.length > 0 ? parts.join(', ') : null;
  };
  
  // Generate DOI URL
  const doiUrl = metadata.doi ? `https://doi.org/${metadata.doi}` : null;
  
  // Generate PMID URL
  const pmidUrl = metadata.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${metadata.pmid}/` : null;
  
  const displayAbstract = abstract || metadata.abstract;
  
  return (
    <div className="space-y-4">
      {/* Title */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="text-2xl leading-relaxed">
            {metadata.title}
          </CardTitle>
        </CardHeader>
      </Card>
      
      {/* Metadata Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Authors */}
          {metadata.authors && metadata.authors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Authors</p>
              <p className="text-sm text-gray-900">
                {formatAuthors()}
              </p>
              {showAllAuthors && metadata.authors.length > 3 && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-blue-600"
                  onClick={() => setShowAllAuthors(false)}
                >
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show fewer
                </Button>
              )}
            </div>
          )}
          
          {/* Publication Info */}
          {formatPublication() && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Publication</p>
              <p className="text-sm text-gray-900">{formatPublication()}</p>
            </div>
          )}
          
          {/* Publication Type & Language */}
          <div className="flex flex-wrap gap-2">
            {metadata.publicationType && (
              <Badge variant="secondary" className="text-xs">
                {metadata.publicationType}
              </Badge>
            )}
            {metadata.language && metadata.language !== 'English' && (
              <Badge variant="outline" className="text-xs">
                {metadata.language}
              </Badge>
            )}
            {metadata.source && (
              <Badge variant="outline" className="text-xs">
                {metadata.source}
              </Badge>
            )}
          </div>
          
          {/* DOI & PMID Links */}
          <div className="flex flex-wrap gap-3 pt-2">
            {doiUrl && (
              <a
                href={doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                DOI: {metadata.doi}
              </a>
            )}
            {pmidUrl && (
              <a
                href={pmidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                PMID: {metadata.pmid}
              </a>
            )}
            {metadata.url && !doiUrl && (
              <a
                href={metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Article
              </a>
            )}
          </div>
          
          {/* Affiliations */}
          {metadata.affiliations && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Affiliations</p>
              <p className="text-sm text-gray-600">{metadata.affiliations}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Keywords & MeSH Terms */}
      {(metadata.keywords || metadata.meshTerms) && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {metadata.keywords && metadata.keywords.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {metadata.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {metadata.meshTerms && metadata.meshTerms.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">MeSH Terms</p>
                <div className="flex flex-wrap gap-2">
                  {metadata.meshTerms.map((term, index) => (
                    <Badge key={index} variant="outline" className="text-xs border-indigo-300 text-indigo-700">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Abstract */}
      {displayAbstract && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Abstract</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {displayAbstract}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
