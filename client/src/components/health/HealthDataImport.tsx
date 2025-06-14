import React, { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download, Archive, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { FileCompressionService } from '@/services/file-compression';
import { formatBytes } from '@/utils/upload-progress';

interface ParseResult {
  success: boolean;
  summary?: {
    totalRecords: number;
    validRecords: number;
    skippedRecords: number;
    categories: Record<string, number>;
  };
  preview?: Array<{
    dataType: string;
    value: string;
    unit?: string;
    timestamp: string;
    source?: string;
    category?: string;
  }>;
  errors?: string[];
}

interface ImportResult {
  success: boolean;
  imported: {
    count: number;
    records: any[];
  };
  duplicates: {
    count: number;
    records: Array<{
      dataPoint: any;
      confidence: number;
      reason: string;
      suggestedAction: string;
    }>;
  };
  summary?: {
    totalRecords: number;
    validRecords: number;
    skippedRecords: number;
    categories: Record<string, number>;
  };
  errors?: string[];
}

export function HealthDataImport() {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'parsing' | 'preview' | 'importing' | 'complete'>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [duplicateSettings, setDuplicateSettings] = useState({
    timeWindowHours: 1,
    exactValueMatch: true,
    checkSource: true
  });
  const [selectedDuplicates, setSelectedDuplicates] = useState<number[]>([]);
  
  // Progress tracking states
  const [importProgress, setImportProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  
  // New optimization states
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [compressionResult, setCompressionResult] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetState = () => {
    setUploadStep('select');
    setSelectedFile(null);
    setParseResult(null);
    setImportResult(null);
    setSelectedDuplicates([]);
    setCompressionResult(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Auto-enable compression for large files
      if (file.size > 10 * 1024 * 1024 && FileCompressionService.shouldCompressFile(file)) {
        setCompressionEnabled(true);
      }
    }
  };

  const handleParseFile = async () => {
    if (!selectedFile) return;

    setUploadStep('parsing');
    
    let fileToUpload = selectedFile;
    
    try {
      // Phase 1: Compression (if enabled and file is large)
      if (compressionEnabled && 
          selectedFile.size > 10 * 1024 * 1024 && 
          FileCompressionService.shouldCompressFile(selectedFile)) {
        
        try {
          const compressionResult = await FileCompressionService.compressFile(selectedFile);
          fileToUpload = compressionResult.compressedFile;
          setCompressionResult(compressionResult);
          
          toast({
            title: "Compression Complete",
            description: `File compressed by ${compressionResult.compressionRatio.toFixed(1)}% (${formatBytes(compressionResult.originalSize - compressionResult.compressedSize)} saved)`,
          });
        } catch (compressionError) {
          console.warn('Compression failed, using original file:', compressionError);
          toast({
            title: "Compression Warning",
            description: "File compression failed, proceeding with original file",
            variant: "default"
          });
        }
      }
      
      // Phase 2: Upload and Parse
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      // Add compression metadata if file was compressed
      if (compressionResult) {
        formData.append('compressed', 'true');
        formData.append('originalFileName', selectedFile.name);
        formData.append('originalSize', selectedFile.size.toString());
      }

      const response = await fetch('/api/health-data/parse', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to parse file');
      }

      setParseResult(result);
      setUploadStep('preview');
      
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : 'Failed to parse health data file',
        variant: "destructive"
      });
      setUploadStep('select');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setUploadStep('importing');
    setImportProgress(0);
    setProcessingMessage('Starting import...');
    
    const startTime = Date.now();
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('timeWindowHours', duplicateSettings.timeWindowHours.toString());
    formData.append('exactValueMatch', duplicateSettings.exactValueMatch.toString());
    formData.append('checkSource', duplicateSettings.checkSource.toString());

    try {
      // Create a progress tracking interval
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) return prev; // Cap at 90% until completion
          const elapsed = Date.now() - startTime;
          const expectedTime = Math.max(10000, parseResult?.summary?.totalRecords ? parseResult.summary.totalRecords * 20 : 10000);
          const calculatedProgress = Math.min(90, (elapsed / expectedTime) * 100);
          
          // Update processing message based on progress
          if (calculatedProgress < 30) {
            setProcessingMessage('Processing health data...');
          } else if (calculatedProgress < 60) {
            setProcessingMessage('Checking for duplicates...');
          } else {
            setProcessingMessage('Saving to database...');
          }
          
          // Calculate estimated time remaining
          if (calculatedProgress > 10) {
            const remainingTime = Math.round((expectedTime - elapsed) / 1000);
            setEstimatedTimeRemaining(Math.max(0, remainingTime));
          }
          
          return calculatedProgress;
        });
      }, 500);

      const response = await fetch('/api/health-data/import', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to import data');
      }

      // Complete the progress bar
      setImportProgress(100);
      setProcessingMessage('Import complete!');
      setEstimatedTimeRemaining(0);

      setImportResult(result);
      setUploadStep('complete');
      
      // Invalidate health data cache to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/health-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data/categories'] });

      toast({
        title: "Import Successful",
        description: `Imported ${result.imported.count} health records successfully`,
      });
    } catch (error) {
      setImportProgress(0);
      setProcessingMessage('');
      setEstimatedTimeRemaining(null);
      
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : 'Failed to import health data',
        variant: "destructive"
      });
      setUploadStep('preview');
    }
  };

  const handleImportDuplicates = async () => {
    if (!importResult || selectedDuplicates.length === 0) return;

    const duplicatesToImport = selectedDuplicates.map(index => 
      importResult.duplicates.records[index]
    );

    try {
      const response = await fetch('/api/health-data/import-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ duplicates: duplicatesToImport })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to import duplicates');
      }

      // Update import result to remove imported duplicates
      const updatedDuplicates = importResult.duplicates.records.filter((_, index) => 
        !selectedDuplicates.includes(index)
      );
      
      setImportResult({
        ...importResult,
        imported: {
          count: importResult.imported.count + result.imported.count,
          records: [...importResult.imported.records, ...result.imported.records]
        },
        duplicates: {
          count: updatedDuplicates.length,
          records: updatedDuplicates
        }
      });

      setSelectedDuplicates([]);
      
      // Invalidate health data cache
      queryClient.invalidateQueries({ queryKey: ['/api/health-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data/categories'] });

      toast({
        title: "Duplicates Imported",
        description: `Imported ${result.imported.count} duplicate records`,
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : 'Failed to import duplicates',
        variant: "destructive"
      });
    }
  };

  const getSupportedFormats = () => (
    <div className="text-sm text-muted-foreground space-y-2">
      <p className="font-medium">Supported file formats:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Apple Health:</strong> Export.xml from Health app</li>
        <li><strong>Google Fit:</strong> JSON export from Google Takeout</li>
        <li><strong>Generic CSV:</strong> date, data_type, value, unit columns</li>
        <li><strong>Fitbit:</strong> CSV exports from Fitbit dashboard</li>
      </ul>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        resetState();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Import Health Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Health Data</DialogTitle>
          <DialogDescription>
            Upload health data files from various devices and apps to automatically sync with your dashboard.
          </DialogDescription>
        </DialogHeader>

        {uploadStep === 'select' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Choose a health data file</p>
                <p className="text-sm text-muted-foreground">
                  Select a file exported from your health app or device
                </p>
              </div>
              <input
                type="file"
                accept=".xml,.json,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="health-file-input"
              />
              <label htmlFor="health-file-input">
                <Button className="mt-4" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>

            {selectedFile && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button onClick={() => setSelectedFile(null)} variant="ghost" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Compression Settings Panel */}
            {selectedFile && selectedFile.size > 10 * 1024 * 1024 && (
              <div className="space-y-4">
                <h4 className="font-medium">Upload Optimization</h4>
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="compression"
                          checked={compressionEnabled}
                          onCheckedChange={(checked) => setCompressionEnabled(!!checked)}
                        />
                        <Label htmlFor="compression" className="text-sm font-medium">
                          Compress file before upload (recommended for large files)
                        </Label>
                      </div>
                      
                      {compressionEnabled && (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Archive className="h-3 w-3" />
                            <span>
                              Estimated compression: {FileCompressionService.estimateCompressionRatio(selectedFile)}% 
                              ({formatBytes(selectedFile.size * (1 - FileCompressionService.estimateCompressionRatio(selectedFile) / 100))} saved)
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Large file detected ({formatBytes(selectedFile.size)}). 
                          Compression will reduce upload time and improve performance.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Duplicate Detection Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time-window">Time Window (hours)</Label>
                  <Input
                    id="time-window"
                    type="number"
                    min="1"
                    max="24"
                    value={duplicateSettings.timeWindowHours}
                    onChange={(e) => setDuplicateSettings(prev => ({
                      ...prev,
                      timeWindowHours: parseInt(e.target.value) || 1
                    }))}
                  />
                </div>
                <div className="space-y-3 pt-8">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exact-value"
                      checked={duplicateSettings.exactValueMatch}
                      onCheckedChange={(checked) => setDuplicateSettings(prev => ({
                        ...prev,
                        exactValueMatch: checked as boolean
                      }))}
                    />
                    <Label htmlFor="exact-value">Exact value match</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="check-source"
                      checked={duplicateSettings.checkSource}
                      onCheckedChange={(checked) => setDuplicateSettings(prev => ({
                        ...prev,
                        checkSource: checked as boolean
                      }))}
                    />
                    <Label htmlFor="check-source">Check source device</Label>
                  </div>
                </div>
              </div>
            </div>

            <Separator />
            {getSupportedFormats()}

            <div className="flex gap-3">
              <Button onClick={handleParseFile} disabled={!selectedFile} className="flex-1">
                Parse & Preview
              </Button>
            </div>
          </div>
        )}

        {uploadStep === 'parsing' && (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Parsing health data file...</p>
              <p className="text-sm text-muted-foreground">
                This may take a moment for large files
              </p>
            </div>
          </div>
        )}

        {uploadStep === 'preview' && parseResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {parseResult.summary?.validRecords || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Valid Records</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {parseResult.summary?.skippedRecords || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Skipped Records</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {parseResult.summary?.categories && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parseResult.summary.categories).map(([category, count]) => (
                      <Badge key={category} variant="secondary">
                        {category}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {parseResult.preview && parseResult.preview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Preview</CardTitle>
                  <CardDescription>First 10 records from your file</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {parseResult.preview.map((record, index) => (
                      <div key={index} className="p-3 border rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{record.dataType}</p>
                            <p className="text-muted-foreground">
                              {record.value} {record.unit}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>{new Date(record.timestamp).toLocaleDateString()}</p>
                            <p>{record.source}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {parseResult.errors && parseResult.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {parseResult.errors.length} parsing warnings/errors
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {parseResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setUploadStep('select')}>
                Back
              </Button>
              <Button onClick={handleImport} className="flex-1">
                Import Data
              </Button>
            </div>
          </div>
        )}

        {uploadStep === 'importing' && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="space-y-3">
                <p className="text-lg font-medium">Importing health data...</p>
                <p className="text-sm text-muted-foreground">
                  {processingMessage || 'Processing your health data...'}
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(importProgress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Estimated time remaining: {estimatedTimeRemaining}s
                </p>
              )}
            </div>
            
            {/* Processing Steps Indicator */}
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm ${importProgress > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${importProgress > 0 ? 'bg-green-600' : 'bg-muted'}`} />
                Processing health data file
              </div>
              <div className={`flex items-center gap-2 text-sm ${importProgress > 30 ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${importProgress > 30 ? 'bg-green-600' : 'bg-muted'}`} />
                Checking for duplicate records
              </div>
              <div className={`flex items-center gap-2 text-sm ${importProgress > 60 ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${importProgress > 60 ? 'bg-green-600' : 'bg-muted'}`} />
                Saving to database
              </div>
            </div>
          </div>
        )}

        {uploadStep === 'complete' && importResult && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Import Complete!</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {importResult.imported.count}
                    </p>
                    <p className="text-sm text-muted-foreground">Records Imported</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {importResult.duplicates.count}
                    </p>
                    <p className="text-sm text-muted-foreground">Duplicates Found</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {importResult.duplicates.count > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Duplicate Records</CardTitle>
                  <CardDescription>
                    These records appear to be duplicates. Review and import if needed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importResult.duplicates.records.map((duplicate, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedDuplicates.includes(index)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDuplicates(prev => [...prev, index]);
                              } else {
                                setSelectedDuplicates(prev => prev.filter(i => i !== index));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{duplicate.dataPoint.dataType}</p>
                                <p className="text-sm text-muted-foreground">
                                  {duplicate.dataPoint.value} {duplicate.dataPoint.unit}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Confidence: {(duplicate.confidence * 100).toFixed(0)}% - {duplicate.reason}
                                </p>
                              </div>
                              <Badge 
                                variant={duplicate.suggestedAction === 'auto_skip' ? 'destructive' : 
                                        duplicate.suggestedAction === 'user_review' ? 'secondary' : 'default'}
                              >
                                {duplicate.suggestedAction.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedDuplicates.length > 0 && (
                    <Button 
                      onClick={handleImportDuplicates} 
                      className="w-full mt-4"
                      variant="outline"
                    >
                      Import Selected Duplicates ({selectedDuplicates.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                Close
              </Button>
              <Button 
                onClick={resetState}
                variant="outline"
              >
                Import Another File
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HealthDataImport;