import { parseString } from 'xml2js';
import { gunzipSync, createGunzip } from 'zlib';
import { Readable } from 'stream';
import { InsertHealthData, HealthDataCategory, HealthMetricType } from '@shared/schema';

export interface ParsedHealthDataPoint {
  dataType: string;
  value: string;
  unit?: string;
  timestamp: Date;
  source?: string;
  category?: HealthDataCategory;
  metadata?: any;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedHealthDataPoint[];
  errors?: string[];
  summary?: {
    totalRecords: number;
    validRecords: number;
    skippedRecords: number;
    categories: Record<string, number>;
  };
}

export class HealthDataParser {
  private static appleHealthTypeMapping: Record<string, { dataType: string; category: HealthDataCategory }> = {
    'HKQuantityTypeIdentifierStepCount': { dataType: 'steps', category: 'lifestyle' },
    'HKQuantityTypeIdentifierBodyMass': { dataType: 'weight', category: 'body_composition' },
    'HKQuantityTypeIdentifierHeartRate': { dataType: 'heart_rate', category: 'cardiovascular' },
    'HKQuantityTypeIdentifierRestingHeartRate': { dataType: 'resting_heart_rate', category: 'cardiovascular' },
    'HKQuantityTypeIdentifierBodyFatPercentage': { dataType: 'body_fat_percentage', category: 'body_composition' },
    'HKQuantityTypeIdentifierLeanBodyMass': { dataType: 'muscle_mass', category: 'body_composition' },
    'HKQuantityTypeIdentifierBodyMassIndex': { dataType: 'bmi', category: 'body_composition' },
    'HKQuantityTypeIdentifierBloodPressureSystolic': { dataType: 'blood_pressure_systolic', category: 'cardiovascular' },
    'HKQuantityTypeIdentifierBloodPressureDiastolic': { dataType: 'blood_pressure_diastolic', category: 'cardiovascular' },
    'HKQuantityTypeIdentifierDistanceWalkingRunning': { dataType: 'daily_activity', category: 'lifestyle' },
    'HKQuantityTypeIdentifierActiveEnergyBurned': { dataType: 'calories_burned', category: 'lifestyle' },
    'HKQuantityTypeIdentifierBasalEnergyBurned': { dataType: 'bmr', category: 'body_composition' },
    'HKCategoryTypeIdentifierSleepAnalysis': { dataType: 'sleep_duration', category: 'lifestyle' },
    'HKCategoryValueSleepAnalysisInBed': { dataType: 'sleep_duration', category: 'lifestyle' },
    'HKCategoryValueSleepAnalysisAsleep': { dataType: 'sleep_duration', category: 'lifestyle' },
    'HKCategoryValueSleepAnalysisAsleepCore': { dataType: 'sleep_duration', category: 'lifestyle' },
    'HKCategoryValueSleepAnalysisAsleepDeep': { dataType: 'sleep_duration', category: 'lifestyle' },
    'HKCategoryValueSleepAnalysisAsleepREM': { dataType: 'sleep_duration', category: 'lifestyle' },
    'HKCategoryValueSleepAnalysisAwake': { dataType: 'sleep_duration', category: 'lifestyle' },
    'HKQuantityTypeIdentifierVO2Max': { dataType: 'vo2_max', category: 'advanced' },
    'HKQuantityTypeIdentifierOxygenSaturation': { dataType: 'oxygen_saturation', category: 'cardiovascular' },
    'HKQuantityTypeIdentifierBloodGlucose': { dataType: 'blood_glucose_random', category: 'medical' },
    'HKQuantityTypeIdentifierBodyTemperature': { dataType: 'body_temperature', category: 'medical' },
  };

  private static googleFitTypeMapping: Record<string, { dataType: string; category: HealthDataCategory }> = {
    'com.google.step_count.delta': { dataType: 'steps', category: 'lifestyle' },
    'com.google.weight': { dataType: 'weight', category: 'body_composition' },
    'com.google.heart_rate.bpm': { dataType: 'heart_rate', category: 'cardiovascular' },
    'com.google.calories.expended': { dataType: 'calories_burned', category: 'lifestyle' },
    'com.google.distance.delta': { dataType: 'daily_activity', category: 'lifestyle' },
    'com.google.body.fat.percentage': { dataType: 'body_fat_percentage', category: 'body_composition' },
    'com.google.sleep.segment': { dataType: 'sleep_duration', category: 'lifestyle' },
    'com.google.blood_pressure': { dataType: 'blood_pressure_systolic', category: 'cardiovascular' },
    'com.google.blood_glucose': { dataType: 'blood_glucose_random', category: 'medical' },
    'com.google.oxygen_saturation': { dataType: 'oxygen_saturation', category: 'cardiovascular' },
  };

  static async parseFile(fileContent: string | Buffer, fileName: string, progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void, timeFilterMonths?: number): Promise<ParseResult> {
    try {
      // Handle compressed files
      let content: string;
      const isGzipped = fileName.toLowerCase().endsWith('.gz');
      
      if (isGzipped) {
        try {
          if (typeof fileContent === 'string') {
            const buffer = Buffer.from(fileContent, 'binary');
            try {
              content = gunzipSync(buffer).toString('utf8');
            } catch (stringError: any) {
              if (stringError.code === 'ERR_STRING_TOO_LONG') {
                console.log('File too large for standard decompression, using streaming approach...');
                return await this.parseAppleHealthXMLFromBuffer(buffer, fileName.slice(0, -3), progressCallback, timeFilterMonths);
              }
              throw stringError;
            }
          } else {
            try {
              content = gunzipSync(fileContent).toString('utf8');
            } catch (stringError: any) {
              if (stringError.code === 'ERR_STRING_TOO_LONG') {
                console.log('File too large for standard decompression, using streaming approach...');
                return await this.parseAppleHealthXMLFromBuffer(fileContent, fileName.slice(0, -3), progressCallback, timeFilterMonths);
              }
              throw stringError;
            }
          }
          fileName = fileName.slice(0, -3);
          console.log(`Successfully decompressed .gz file: ${fileName}, content length: ${content.length}`);
        } catch (decompressionError) {
          console.error('Failed to decompress .gz file:', decompressionError);
          throw new Error(`Failed to decompress .gz file: ${decompressionError instanceof Error ? decompressionError.message : 'Unknown decompression error'}`);
        }
      } else {
        content = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf8');
      }

      // Extract file extension, but also detect format from content
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      // Detect format from content if extension is not clear
      const detectedFormat = HealthDataParser.detectFileFormat(content, fileExtension);
      
      switch (detectedFormat) {
        case 'xml':
          // Determine if it's Apple Health or CDA format
          if (content.includes('<ClinicalDocument')) {
            console.log('Detected CDA document format');
            return await HealthDataParser.parseCDADocumentOptimized(content, progressCallback);
          } else {
            console.log('Detected Apple Health XML format');
            return await this.parseAppleHealthXML(content, progressCallback, timeFilterMonths);
          }
        case 'json':
          return await this.parseGoogleFitJSON(content);
        case 'csv':
          return await this.parseGenericCSV(content);
        default:
          return {
            success: false,
            errors: [
              `Unsupported file format detected. Expected XML, JSON, or CSV health data file.`,
              `File extension: ${fileExtension || 'unknown'}`,
              `Content analysis: ${detectedFormat || 'unrecognized'}`
            ]
          };
      }
    } catch (error) {
      console.error('Health data parsing error:', error);
      return {
        success: false,
        errors: [`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private static async parseAppleHealthXML(xmlContent: string, progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void): Promise<ParseResult> {
    // For large files, use optimized chunked processing
    if (xmlContent.length > 50 * 1024 * 1024) { // 50MB threshold
      return this.parseAppleHealthXMLOptimized(xmlContent, progressCallback);
    }
    
    return new Promise((resolve) => {
      parseString(xmlContent, (err, result) => {
        if (err) {
          resolve({
            success: false,
            errors: [`XML parsing error: ${err.message}`]
          });
          return;
        }

        try {
          // Check for Apple Health format
          const healthData = result?.HealthData;
          if (healthData?.Record) {
            return HealthDataParser.parseAppleHealthRecords(healthData, resolve);
          }
          
          // Check for CDA format
          const clinicalDocument = result?.ClinicalDocument;
          if (clinicalDocument) {
            return HealthDataParser.parseCDADocument(clinicalDocument, resolve);
          }
          
          resolve({
            success: false,
            errors: ['File does not appear to be a valid health data export. Supported formats: Apple Health XML, CDA XML, Google Fit JSON, Generic CSV.']
          });
        } catch (processingError) {
          resolve({
            success: false,
            errors: [`Error processing parsed XML: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`]
          });
        }
      });
    });
  }

  private static async parseAppleHealthXMLOptimized(xmlContent: string, progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void): Promise<ParseResult> {
    try {
      console.log('Processing large Apple Health file with optimized parsing...');
      console.log(`XML content length: ${xmlContent.length} characters`);
      
      // Check if content looks like Apple Health XML or CDA XML
      const isAppleHealth = xmlContent.includes('<HealthData') || xmlContent.includes('<Record');
      const isCDA = xmlContent.includes('<ClinicalDocument');
      
      if (!isAppleHealth && !isCDA) {
        return {
          success: false,
          errors: ['File does not appear to be a valid health data export. Expected Apple Health XML or CDA XML format.']
        };
      }
      
      // Handle CDA documents with different parsing logic
      if (isCDA) {
        console.log('Detected CDA document, using CDA parsing logic...');
        return await HealthDataParser.parseCDADocumentOptimized(xmlContent, progressCallback);
      }

      // For extremely large files (>300MB), use streaming chunk processing
      if (xmlContent.length > 300 * 1024 * 1024) {
        console.log('File extremely large, switching to streaming processing...');
        const buffer = Buffer.from(xmlContent, 'utf8');
        const chunks = [];
        const chunkSize = 2 * 1024 * 1024; // 2MB chunks
        
        for (let i = 0; i < buffer.length; i += chunkSize) {
          chunks.push(buffer.slice(i, i + chunkSize));
        }
        
        return await this.parseAppleHealthXMLFromChunks(chunks, progressCallback);
      }
      
      // Optimized regex-based parsing for large files
      const parsedData: ParsedHealthDataPoint[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};
      let recordCount = 0;
      let validRecords = 0;
      
      // Use streaming regex to process records efficiently
      const recordRegex = /<Record[^>]*(?:\/>|>.*?<\/Record>)/g;
      let match;
      
      console.log('Starting optimized record extraction...');
      
      while ((match = recordRegex.exec(xmlContent)) !== null) {
        recordCount++;
        
        try {
          const recordXml = match[0];
          
          // Extract attributes using optimized regex
          const typeMatch = recordXml.match(/\btype="([^"]+)"/);
          const valueMatch = recordXml.match(/\bvalue="([^"]+)"/);
          const unitMatch = recordXml.match(/\bunit="([^"]+)"/);
          
          // Try multiple date fields for compatibility
          let dateMatch = recordXml.match(/\bcreationDate="([^"]+)"/);
          if (!dateMatch) dateMatch = recordXml.match(/\bstartDate="([^"]+)"/);
          if (!dateMatch) dateMatch = recordXml.match(/\bendDate="([^"]+)"/);
          
          const sourceMatch = recordXml.match(/\bsourceName="([^"]+)"/);

          if (!typeMatch || !valueMatch || !dateMatch) {
            if (errors.length < 10) {
              errors.push(`Skipping record ${recordCount}: missing required fields`);
            }
            continue;
          }

          const type = typeMatch[1];
          let mapping = this.appleHealthTypeMapping[type];

          // Handle special sleep analysis cases
          if (!mapping && type === 'HKCategoryTypeIdentifierSleepAnalysis') {
            const value = valueMatch[1];
            mapping = this.appleHealthTypeMapping[`HKCategoryValueSleepAnalysis${value}`];
          }

          if (!mapping) {
            continue; // Skip unsupported types
          }

          const timestamp = new Date(dateMatch[1]);
          if (isNaN(timestamp.getTime())) {
            if (errors.length < 10) {
              errors.push(`Invalid timestamp for ${type}: ${dateMatch[1]}`);
            }
            continue;
          }

          const dataPoint: ParsedHealthDataPoint = {
            dataType: mapping.dataType,
            value: valueMatch[1],
            unit: unitMatch ? unitMatch[1] : undefined,
            timestamp,
            source: sourceMatch ? sourceMatch[1] : 'Apple Health',
            category: mapping.category,
            metadata: {
              originalType: type,
              source: 'apple_health_import'
            }
          };

          parsedData.push(dataPoint);
          validRecords++;
          categories[mapping.category] = (categories[mapping.category] || 0) + 1;

          // Progress reporting and memory management
          if (recordCount % 10000 === 0) {
            console.log(`Processed ${recordCount} records, ${validRecords} valid`);
            
            if (progressCallback) {
              // Estimate progress based on regex position in string
              const progress = (recordRegex.lastIndex / xmlContent.length) * 100;
              progressCallback({
                processed: recordCount,
                total: recordCount * 2, // Rough estimate
                percentage: Math.min(progress, 95)
              });
            }
            
            // Force garbage collection for large batches
            if (global.gc && recordCount % 50000 === 0) {
              global.gc();
            }
          }

        } catch (recordError) {
          if (errors.length < 10) {
            errors.push(`Error processing record ${recordCount}: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
          }
        }
      }

      console.log(`Completed processing: ${validRecords} valid records from ${recordCount} total`);

      if (progressCallback) {
        progressCallback({
          processed: recordCount,
          total: recordCount,
          percentage: 100
        });
      }

      return {
        success: validRecords > 0,
        data: parsedData,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalRecords: recordCount,
          validRecords,
          skippedRecords: recordCount - validRecords,
          categories
        }
      };
    } catch (error) {
      console.error('Optimized XML parsing error:', error);
      return {
        success: false,
        errors: [`Failed to parse large XML file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private static async parseGoogleFitJSON(jsonContent: string): Promise<ParseResult> {
    try {
      const data = JSON.parse(jsonContent);
      const parsedData: ParsedHealthDataPoint[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};
      let totalRecords = 0;

      // Handle different Google Fit export formats
      const buckets = data.bucket || data.buckets || [];
      
      for (const bucket of buckets) {
        const datasets = bucket.dataset || [];
        
        for (const dataset of datasets) {
          const dataTypeName = dataset.dataTypeName;
          const mapping = this.googleFitTypeMapping[dataTypeName];
          
          if (!mapping) {
            continue; // Skip unsupported types
          }

          const points = dataset.point || [];
          
          for (const point of points) {
            totalRecords++;
            
            try {
              let value = '';
              let unit = '';
              
              // Extract value based on Google Fit data structure
              if (point.value && point.value.length > 0) {
                const valueObj = point.value[0];
                if (valueObj.intVal !== undefined) {
                  value = valueObj.intVal.toString();
                } else if (valueObj.fpVal !== undefined) {
                  value = valueObj.fpVal.toString();
                } else if (valueObj.stringVal !== undefined) {
                  value = valueObj.stringVal;
                }
              }

              if (!value) {
                errors.push(`No value found for ${dataTypeName} point`);
                continue;
              }

              // Convert nanoseconds to milliseconds for timestamp
              const startTimeNanos = point.startTimeNanos || point.startTime;
              const timestamp = new Date(parseInt(startTimeNanos) / 1000000);

              if (isNaN(timestamp.getTime())) {
                errors.push(`Invalid timestamp for ${dataTypeName}: ${startTimeNanos}`);
                continue;
              }

              const dataPoint: ParsedHealthDataPoint = {
                dataType: mapping.dataType,
                value: value,
                unit: unit || undefined,
                timestamp: timestamp,
                source: 'google_fit',
                category: mapping.category,
                metadata: {
                  originalType: dataTypeName,
                  endTimeNanos: point.endTimeNanos || point.endTime,
                  originDataSourceId: point.originDataSourceId
                }
              };

              parsedData.push(dataPoint);
              categories[mapping.category] = (categories[mapping.category] || 0) + 1;
            } catch (pointError) {
              errors.push(`Error parsing point: ${pointError instanceof Error ? pointError.message : 'Unknown error'}`);
            }
          }
        }
      }

      return {
        success: true,
        data: parsedData,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalRecords,
          validRecords: parsedData.length,
          skippedRecords: totalRecords - parsedData.length,
          categories
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private static async parseGenericCSV(csvContent: string): Promise<ParseResult> {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        return {
          success: false,
          errors: ['CSV file appears to be empty']
        };
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const parsedData: ParsedHealthDataPoint[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};

      // Try to identify common CSV formats
      const timestampIndex = headers.findIndex(h => h.includes('date') || h.includes('time'));
      const valueIndex = headers.findIndex(h => h.includes('value') || h.includes('count') || h.includes('weight'));
      const typeIndex = headers.findIndex(h => h.includes('type') || h.includes('metric'));

      if (timestampIndex === -1 || valueIndex === -1) {
        return {
          success: false,
          errors: ['CSV file must contain date/time and value columns']
        };
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          continue;
        }

        try {
          const timestamp = new Date(values[timestampIndex]);
          const value = values[valueIndex];
          const type = typeIndex >= 0 ? values[typeIndex] : 'unknown';

          if (isNaN(timestamp.getTime()) || !value) {
            continue;
          }

          const category = this.categorizeDataType(type);
          const dataPoint: ParsedHealthDataPoint = {
            dataType: type,
            value: value,
            timestamp: timestamp,
            source: 'csv_import',
            category: category,
            metadata: {
              csvRow: i,
              headers: headers
            }
          };

          parsedData.push(dataPoint);
          categories[category] = (categories[category] || 0) + 1;
        } catch (rowError) {
          errors.push(`Error parsing row ${i}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        data: parsedData,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalRecords: lines.length - 1,
          validRecords: parsedData.length,
          skippedRecords: (lines.length - 1) - parsedData.length,
          categories
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private static parseAppleHealthRecords(healthData: any, resolve: (value: ParseResult) => void): void {
    const records = Array.isArray(healthData.Record) ? healthData.Record : [healthData.Record];
    const parsedData: ParsedHealthDataPoint[] = [];
    const errors: string[] = [];
    const categories: Record<string, number> = {};

    for (const record of records) {
      try {
        const type = record.$.type;
        const mapping = this.appleHealthTypeMapping[type];
        
        if (!mapping) {
          continue; // Skip unsupported types
        }

        const dataPoint: ParsedHealthDataPoint = {
          dataType: mapping.dataType,
          value: record.$.value,
          unit: record.$.unit || undefined,
          timestamp: new Date(record.$.startDate || record.$.creationDate),
          source: record.$.sourceName || 'apple_health',
          category: mapping.category,
          metadata: {
            originalType: type,
            endDate: record.$.endDate,
            device: record.$.device
          }
        };

        // Validate timestamp
        if (isNaN(dataPoint.timestamp.getTime())) {
          errors.push(`Invalid timestamp for ${type}: ${record.$.startDate}`);
          continue;
        }

        parsedData.push(dataPoint);
        categories[mapping.category] = (categories[mapping.category] || 0) + 1;

      } catch (recordError) {
        errors.push(`Error parsing record: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
      }
    }

    resolve({
      success: true,
      data: parsedData,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalRecords: records.length,
        validRecords: parsedData.length,
        skippedRecords: records.length - parsedData.length,
        categories
      }
    });
  }

  private static parseCDADocument(clinicalDocument: any, resolve: (value: ParseResult) => void): void {
    try {
      const parsedData: ParsedHealthDataPoint[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};

      // Extract patient information
      const patientInfo = this.extractCDAPatientInfo(clinicalDocument);
      
      // Extract health observations from CDA sections
      const observations = this.extractCDAObservations(clinicalDocument);
      
      for (const obs of observations) {
        try {
          const dataPoint: ParsedHealthDataPoint = {
            dataType: obs.dataType,
            value: obs.value,
            unit: obs.unit,
            timestamp: obs.timestamp,
            source: 'cda_export',
            category: this.categorizeDataType(obs.dataType),
            metadata: {
              patientInfo,
              originalCode: obs.code,
              codeSystem: obs.codeSystem
            }
          };

          parsedData.push(dataPoint);
          const category = dataPoint.category;
          categories[category] = (categories[category] || 0) + 1;

        } catch (obsError) {
          errors.push(`Error parsing observation: ${obsError instanceof Error ? obsError.message : 'Unknown error'}`);
        }
      }

      resolve({
        success: true,
        data: parsedData,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalRecords: observations.length,
          validRecords: parsedData.length,
          skippedRecords: observations.length - parsedData.length,
          categories
        }
      });

    } catch (cdaError) {
      resolve({
        success: false,
        errors: [`Error parsing CDA document: ${cdaError instanceof Error ? cdaError.message : 'Unknown error'}`]
      });
    }
  }

  private static extractCDAPatientInfo(clinicalDocument: any): any {
    try {
      const recordTarget = clinicalDocument.recordTarget?.[0]?.patientRole?.[0];
      const patient = recordTarget?.patient?.[0];
      
      return {
        gender: patient?.administrativeGenderCode?.[0]?.$.displayName || patient?.administrativeGenderCode?.[0]?.$.code,
        birthDate: patient?.birthTime?.[0]?.$.value
      };
    } catch {
      return {};
    }
  }

  private static extractCDAObservations(clinicalDocument: any): Array<{
    dataType: string;
    value: string;
    unit?: string;
    timestamp: Date;
    code?: string;
    codeSystem?: string;
  }> {
    const observations: Array<{
      dataType: string;
      value: string;
      unit?: string;
      timestamp: Date;
      code?: string;
      codeSystem?: string;
    }> = [];

    try {
      // CDA documents can have complex nested structures
      // For now, extract basic document metadata as health data points
      const effectiveTime = clinicalDocument.effectiveTime?.[0]?.$.value;
      if (effectiveTime) {
        observations.push({
          dataType: 'health_export_date',
          value: effectiveTime,
          timestamp: this.parseCDADateTime(effectiveTime),
          code: 'HEALTH_EXPORT',
          codeSystem: 'CDA'
        });
      }

      // Try to extract any structured data from component sections
      const component = clinicalDocument.component?.[0]?.structuredBody?.[0]?.component;
      if (component && Array.isArray(component)) {
        for (const section of component) {
          const entries = section.section?.[0]?.entry;
          if (entries && Array.isArray(entries)) {
            for (const entry of entries) {
              const obs = this.extractCDAEntryObservation(entry);
              if (obs) {
                observations.push(obs);
              }
            }
          }
        }
      }

    } catch (extractError) {
      console.error('Error extracting CDA observations:', extractError);
    }

    return observations;
  }

  private static extractCDAEntryObservation(entry: any): {
    dataType: string;
    value: string;
    unit?: string;
    timestamp: Date;
    code?: string;
    codeSystem?: string;
  } | null {
    try {
      const observation = entry.observation?.[0];
      if (!observation) return null;

      const code = observation.code?.[0]?.$.code;
      const value = observation.value?.[0]?.$.value;
      const unit = observation.value?.[0]?.$.unit;
      const effectiveTime = observation.effectiveTime?.[0]?.$.value;

      if (!value || !effectiveTime) return null;

      return {
        dataType: this.mapCDACodeToDataType(code),
        value: value,
        unit: unit,
        timestamp: this.parseCDADateTime(effectiveTime),
        code: code,
        codeSystem: observation.code?.[0]?.$.codeSystem
      };
    } catch {
      return null;
    }
  }

  private static mapCDACodeToDataType(code: string): string {
    // Map common CDA/LOINC codes to our data types
    const codeMapping: Record<string, string> = {
      '29463-7': 'weight',
      '8302-2': 'height',
      '39156-5': 'bmi',
      '8867-4': 'heart_rate',
      '55284-4': 'blood_pressure_systolic',
      '8462-4': 'blood_pressure_diastolic',
      '2093-3': 'cholesterol_total',
      '33747-0': 'blood_glucose_random'
    };

    return codeMapping[code] || 'health_observation';
  }

  private static parseCDADateTime(dateTimeStr: string): Date {
    // CDA datetime format: YYYYMMDDHHMMSS+ZZZZ
    try {
      if (dateTimeStr.length >= 8) {
        const year = parseInt(dateTimeStr.substring(0, 4));
        const month = parseInt(dateTimeStr.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateTimeStr.substring(6, 8));
        const hour = dateTimeStr.length > 8 ? parseInt(dateTimeStr.substring(8, 10)) : 0;
        const minute = dateTimeStr.length > 10 ? parseInt(dateTimeStr.substring(10, 12)) : 0;
        const second = dateTimeStr.length > 12 ? parseInt(dateTimeStr.substring(12, 14)) : 0;
        
        return new Date(year, month, day, hour, minute, second);
      }
    } catch {
      // Fallback to current date if parsing fails
    }
    
    return new Date();
  }

  private static async parseCDADocumentOptimized(xmlContent: string, progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void): Promise<ParseResult> {
    try {
      const parsedData: ParsedHealthDataPoint[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};

      // Extract basic document information using regex (more efficient than full XML parsing)
      const effectiveTimeMatch = xmlContent.match(/<effectiveTime[^>]*value="([^"]+)"/);
      const patientGenderMatch = xmlContent.match(/<administrativeGenderCode[^>]*(?:displayName="([^"]+)"|code="([^"]+)")/);
      const patientBirthMatch = xmlContent.match(/<birthTime[^>]*value="([^"]+)"/);

      let recordCount = 0;

      // Extract document metadata as health data point
      if (effectiveTimeMatch) {
        recordCount++;
        try {
          const dataPoint: ParsedHealthDataPoint = {
            dataType: 'health_export_date',
            value: effectiveTimeMatch[1],
            timestamp: HealthDataParser.parseCDADateTime(effectiveTimeMatch[1]),
            source: 'cda_export',
            category: this.categorizeDataType('health_export_date'),
            metadata: {
              documentType: 'CDA_EXPORT',
              patientGender: patientGenderMatch ? (patientGenderMatch[1] || patientGenderMatch[2]) : undefined,
              patientBirthDate: patientBirthMatch ? patientBirthMatch[1] : undefined
            }
          };

          parsedData.push(dataPoint);
          const category = dataPoint.category;
          categories[category] = (categories[category] || 0) + 1;

          if (progressCallback) {
            progressCallback({
              processed: recordCount,
              total: recordCount * 2,
              percentage: 50
            });
          }
        } catch (error) {
          errors.push(`Error parsing document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Look for observation entries using regex patterns
      const observationRegex = /<observation[^>]*>.*?<\/observation>/g;
      let obsMatch;
      let observationCount = 0;

      while ((obsMatch = observationRegex.exec(xmlContent)) !== null) {
        observationCount++;
        recordCount++;

        try {
          const obsXml = obsMatch[0];
          
          // Extract observation data using regex
          const codeMatch = obsXml.match(/<code[^>]*code="([^"]+)"/);
          const valueMatch = obsXml.match(/<value[^>]*value="([^"]+)"/);
          const unitMatch = obsXml.match(/<value[^>]*unit="([^"]+)"/);
          const timeMatch = obsXml.match(/<effectiveTime[^>]*value="([^"]+)"/);

          if (codeMatch && valueMatch && timeMatch) {
            const dataPoint: ParsedHealthDataPoint = {
              dataType: this.mapCDACodeToDataType(codeMatch[1]),
              value: valueMatch[1],
              unit: unitMatch ? unitMatch[1] : undefined,
              timestamp: this.parseCDADateTime(timeMatch[1]),
              source: 'cda_export',
              category: this.categorizeDataType(this.mapCDACodeToDataType(codeMatch[1])),
              metadata: {
                originalCode: codeMatch[1],
                codeSystem: 'CDA'
              }
            };

            parsedData.push(dataPoint);
            const category = dataPoint.category;
            categories[category] = (categories[category] || 0) + 1;
          }

          // Progress reporting for large files
          if (observationCount % 100 === 0 && progressCallback) {
            const progress = Math.min((observationRegex.lastIndex / xmlContent.length) * 90 + 10, 95);
            progressCallback({
              processed: recordCount,
              total: recordCount * 2,
              percentage: progress
            });
          }

        } catch (error) {
          errors.push(`Error parsing observation ${observationCount}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Final progress update
      if (progressCallback) {
        progressCallback({
          processed: recordCount,
          total: recordCount,
          percentage: 100
        });
      }

      console.log(`CDA parsing completed: ${recordCount} total items processed, ${parsedData.length} valid data points`);

      return {
        success: true,
        data: parsedData,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalRecords: recordCount,
          validRecords: parsedData.length,
          skippedRecords: recordCount - parsedData.length,
          categories
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Error parsing CDA document: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private static detectFileFormat(content: string, fileExtension?: string): string | null {
    // First check file extension if available
    if (fileExtension === 'xml' || fileExtension === 'json' || fileExtension === 'csv') {
      return fileExtension;
    }
    
    // Analyze content to detect format
    const trimmedContent = content.trim();
    
    // Check for XML format
    if (trimmedContent.startsWith('<?xml') || 
        trimmedContent.includes('<HealthData') || 
        trimmedContent.includes('<ClinicalDocument') ||
        trimmedContent.includes('<Record') ||
        (trimmedContent.startsWith('<') && trimmedContent.includes('>'))) {
      return 'xml';
    }
    
    // Check for JSON format
    if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) ||
        (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
      try {
        JSON.parse(trimmedContent);
        return 'json';
      } catch {
        // Not valid JSON, continue checking
      }
    }
    
    // Check for CSV format
    const lines = trimmedContent.split('\n');
    if (lines.length > 1) {
      const firstLine = lines[0];
      const secondLine = lines[1];
      
      // Look for comma-separated values with consistent column counts
      const firstLineCols = firstLine.split(',').length;
      const secondLineCols = secondLine.split(',').length;
      
      if (firstLineCols > 1 && firstLineCols === secondLineCols) {
        // Check if first line looks like headers
        const potentialHeaders = firstLine.toLowerCase();
        if (potentialHeaders.includes('date') || 
            potentialHeaders.includes('time') ||
            potentialHeaders.includes('value') ||
            potentialHeaders.includes('type')) {
          return 'csv';
        }
      }
    }
    
    return null;
  }

  private static categorizeDataType(dataType: string): HealthDataCategory {
    const bodyCompositionTypes = ['weight', 'bmi', 'body_fat_percentage', 'muscle_mass', 'bone_mass', 'bmr', 'metabolic_age'];
    const cardiovascularTypes = ['heart_rate', 'resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'cholesterol_ldl', 'cholesterol_hdl', 'oxygen_saturation'];
    const lifestyleTypes = ['steps', 'sleep_duration', 'sleep_quality', 'daily_activity', 'calories_burned', 'calories_intake', 'hydration', 'stress_level', 'mood'];
    const medicalTypes = ['blood_glucose_fasting', 'blood_glucose_postprandial', 'blood_glucose_random', 'hba1c', 'insulin_dosage', 'body_temperature'];
    const advancedTypes = ['vo2_max', 'lactate_threshold', 'ecg_data', 'skin_temperature'];

    if (bodyCompositionTypes.includes(dataType)) return 'body_composition';
    if (cardiovascularTypes.includes(dataType)) return 'cardiovascular';
    if (lifestyleTypes.includes(dataType)) return 'lifestyle';
    if (medicalTypes.includes(dataType)) return 'medical';
    if (advancedTypes.includes(dataType)) return 'advanced';
    
    return 'lifestyle'; // Default category
  }

  // Streaming decompression method for very large compressed files
  private static async parseAppleHealthXMLFromBuffer(
    compressedBuffer: Buffer, 
    fileName: string, 
    progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void,
    timeFilterMonths?: number
  ): Promise<ParseResult> {
    try {
      console.log('Starting streaming decompression for large Apple Health file...');
      
      return new Promise((resolve, reject) => {
        const gunzip = createGunzip();
        const chunks: Buffer[] = [];
        let totalSize = 0;
        
        // Create readable stream from buffer
        const inputStream = new Readable();
        inputStream.push(compressedBuffer);
        inputStream.push(null);
        
        // Handle decompressed chunks
        gunzip.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          totalSize += chunk.length;
          
          // Progress callback for decompression
          if (progressCallback && totalSize > 0) {
            const estimatedProgress = Math.min(20, (totalSize / (1024 * 1024)) * 2); // Estimate based on MB processed
            progressCallback({
              processed: totalSize,
              total: totalSize * 5, // Rough estimate
              percentage: estimatedProgress
            });
          }
        });
        
        gunzip.on('end', async () => {
          try {
            console.log(`Decompression complete. Total size: ${totalSize} bytes`);
            
            // Process chunks without converting to string to avoid memory limits
            const result = await this.parseAppleHealthXMLFromChunks(chunks, progressCallback, timeFilterMonths);
            resolve(result);
          } catch (parseError) {
            console.error('Error parsing decompressed XML:', parseError);
            reject(parseError);
          }
        });
        
        gunzip.on('error', (error) => {
          console.error('Streaming decompression error:', error);
          reject(new Error(`Streaming decompression failed: ${error.message}`));
        });
        
        // Start the decompression
        inputStream.pipe(gunzip);
      });
      
    } catch (error) {
      console.error('Buffer parsing error:', error);
      return {
        success: false,
        errors: [`Streaming processing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Process XML chunks with memory management for massive files
  private static async parseAppleHealthXMLFromChunks(
    chunks: Buffer[], 
    progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void,
    timeFilterMonths?: number
  ): Promise<ParseResult> {
    try {
      console.log('Processing Apple Health XML with chunk-based streaming...');
      
      const errors: string[] = [];
      const categories: Record<string, number> = {};
      let processedBytes = 0;
      const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      
      let xmlBuffer = '';
      let recordCount = 0;
      let validRecords = 0;
      let skippedRecords = 0;
      const parsedData: ParsedHealthDataPoint[] = [];
      
      // Set up time filtering if enabled
      let cutoffDate: Date | null = null;
      if (timeFilterMonths && timeFilterMonths > 0) {
        cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - timeFilterMonths);
        console.log(`Time filter enabled: Only processing records from ${cutoffDate.toISOString()} onwards (last ${timeFilterMonths} months)`);
      }
      
      console.log(`Processing ${chunks.length} chunks (${Math.round(totalBytes / 1024 / 1024)}MB total)`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        processedBytes += chunk.length;
        
        // Convert chunk to string and add to buffer
        const chunkStr = chunk.toString('utf8');
        xmlBuffer += chunkStr;
        
        // Process complete records in current buffer
        const recordRegex = /<Record[^>]*(?:\/>|>.*?<\/Record>)/g;
        let recordMatch;
        
        while ((recordMatch = recordRegex.exec(xmlBuffer)) !== null) {
          try {
            const recordXml = recordMatch[0];
            recordCount++;
            
            // For very large files (>100MB), sample every 50th record to reduce memory usage
            // For massive files (>500MB), sample every 100th record
            let sampleRate = 1;
            if (totalBytes > 500 * 1024 * 1024) {
              sampleRate = 100;
            } else if (totalBytes > 100 * 1024 * 1024) {
              sampleRate = 50;
            } else if (totalBytes > 50 * 1024 * 1024) {
              sampleRate = 10;
            }
            
            if (recordCount % sampleRate === 0) {
              const typeMatch = recordXml.match(/\btype="([^"]+)"/);
              const valueMatch = recordXml.match(/\bvalue="([^"]+)"/);
              const unitMatch = recordXml.match(/\bunit="([^"]+)"/);
              
              let dateMatch = recordXml.match(/\bcreationDate="([^"]+)"/);
              if (!dateMatch) dateMatch = recordXml.match(/\bstartDate="([^"]+)"/);
              if (!dateMatch) dateMatch = recordXml.match(/\bendDate="([^"]+)"/);
              
              const sourceMatch = recordXml.match(/\bsourceName="([^"]+)"/);

              if (typeMatch && valueMatch && dateMatch) {
                const timestamp = new Date(dateMatch[1]);
                
                // Apply early time filtering - skip record if outside time range
                if (cutoffDate && timestamp < cutoffDate) {
                  skippedRecords++;
                  continue; // Skip this record entirely
                }
                
                const type = typeMatch[1];
                let mapping = this.appleHealthTypeMapping[type];

                if (!mapping && type === 'HKCategoryTypeIdentifierSleepAnalysis') {
                  const value = valueMatch[1];
                  mapping = this.appleHealthTypeMapping[`HKCategoryValueSleepAnalysis${value}`];
                }

                if (mapping) {
                  if (!isNaN(timestamp.getTime())) {
                    const dataPoint: ParsedHealthDataPoint = {
                      dataType: mapping.dataType,
                      value: valueMatch[1],
                      unit: unitMatch ? unitMatch[1] : undefined,
                      timestamp,
                      source: sourceMatch ? sourceMatch[1] : 'Apple Health',
                      category: mapping.category,
                      metadata: {
                        originalType: type,
                        source: 'apple_health_chunked'
                      }
                    };

                    parsedData.push(dataPoint);
                    validRecords++;
                    categories[mapping.category] = (categories[mapping.category] || 0) + 1;
                  }
                }
              }
            }

          } catch (recordError) {
            if (errors.length < 5) {
              errors.push(`Error processing record ${recordCount}: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
            }
          }
        }
        
        // Keep only the remainder after processed records
        const lastRecordEnd = recordRegex.lastIndex || 0;
        xmlBuffer = xmlBuffer.substring(lastRecordEnd);
        recordRegex.lastIndex = 0;
        
        // Clear buffer more aggressively for massive files
        const bufferLimit = totalBytes > 500 * 1024 * 1024 ? 100 * 1024 : 1024 * 1024; // 100KB for >500MB files, 1MB otherwise
        if (xmlBuffer.length > bufferLimit) {
          xmlBuffer = xmlBuffer.substring(xmlBuffer.length - Math.min(50000, bufferLimit / 2)); // Keep smaller remainder
        }
        
        // Progress updates
        if (progressCallback && i % 50 === 0) {
          const percentage = Math.round((processedBytes / totalBytes) * 100);
          progressCallback({
            processed: processedBytes,
            total: totalBytes,
            percentage
          });
        }
        
        // Periodic logging and garbage collection with time filtering stats
        if (i > 0 && i % 200 === 0) {
          const filterEffectiveness = cutoffDate && recordCount > 0 ? ((skippedRecords / recordCount) * 100).toFixed(1) : 'N/A';
          console.log(`Processed ${i}/${chunks.length} chunks, ${validRecords} valid records from ${recordCount} total${cutoffDate ? `, ${skippedRecords} skipped by time filter (${filterEffectiveness}% filtered)` : ''}`);
          
          if (global.gc) {
            global.gc();
          }
        }
      }

      const filterSummary = cutoffDate ? `, ${skippedRecords} skipped by time filter (${((skippedRecords / recordCount) * 100).toFixed(1)}% filtered)` : '';
      console.log(`Chunk processing complete: ${validRecords} valid records from ${recordCount} total${filterSummary}`);

      if (progressCallback) {
        progressCallback({
          processed: totalBytes,
          total: totalBytes,
          percentage: 100
        });
      }

      if (validRecords === 0) {
        return {
          success: false,
          errors: [
            'No valid health records were found in the file.',
            'Please ensure this is a valid Apple Health export.',
            ...errors.slice(0, 3)
          ]
        };
      }

      return {
        success: true,
        data: parsedData,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalRecords: recordCount,
          validRecords,
          skippedRecords: recordCount - validRecords,
          categories
        }
      };

    } catch (error) {
      console.error('Chunk processing error:', error);
      return {
        success: false,
        errors: [`Failed to process chunks: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}