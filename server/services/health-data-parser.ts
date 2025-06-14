import { parseString } from 'xml2js';
import { gunzipSync, unzipSync } from 'zlib';
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

  static async parseFile(fileContent: string | Buffer, fileName: string, progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void): Promise<ParseResult> {
    try {
      // Handle compressed files
      let content: string;
      const isGzipped = fileName.toLowerCase().endsWith('.gz');
      const isZipped = fileName.toLowerCase().endsWith('.zip');
      
      if (isGzipped) {
        try {
          if (typeof fileContent === 'string') {
            // Convert string to buffer for decompression
            const buffer = Buffer.from(fileContent, 'binary');
            content = gunzipSync(buffer).toString('utf8');
          } else {
            content = gunzipSync(fileContent).toString('utf8');
          }
          // Remove .gz extension to get the actual file type
          fileName = fileName.slice(0, -3);
          console.log(`Successfully decompressed .gz file: ${fileName}, content length: ${content.length}`);
        } catch (decompressionError) {
          console.error('Failed to decompress .gz file:', decompressionError);
          throw new Error(`Failed to decompress .gz file: ${decompressionError instanceof Error ? decompressionError.message : 'Unknown decompression error'}`);
        }
      } else if (isZipped) {
        return {
          success: false,
          errors: ['ZIP files are not yet supported. Please extract the file and upload the XML/JSON/CSV directly.']
        };
      } else {
        content = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf8');
      }

      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      switch (fileExtension) {
        case 'xml':
          return await this.parseAppleHealthXML(content, progressCallback);
        case 'json':
          return await this.parseGoogleFitJSON(content);
        case 'csv':
          return await this.parseGenericCSV(content);
        default:
          return {
            success: false,
            errors: [`Unsupported file format: ${fileExtension}`]
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
    // For very large files, implement chunked processing to prevent memory issues
    if (xmlContent.length > 50 * 1024 * 1024) { // 50MB threshold
      return this.parseAppleHealthXMLChunked(xmlContent, progressCallback);
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
          const healthData = result?.HealthData;
          if (!healthData?.Record) {
            resolve({
              success: false,
              errors: ['No health records found in XML file']
            });
            return;
          }

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
        } catch (error) {
          resolve({
            success: false,
            errors: [`Error processing XML data: ${error instanceof Error ? error.message : 'Unknown error'}`]
          });
        }
      });
    });
  }

  private static async parseAppleHealthXMLChunked(xmlContent: string, progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void): Promise<ParseResult> {
    try {
      console.log('Processing large Apple Health file with chunked processing...');
      console.log(`XML content length: ${xmlContent.length} characters`);
      
      // Check if content looks like Apple Health XML
      if (!xmlContent.includes('<HealthData') && !xmlContent.includes('<Record')) {
        return {
          success: false,
          errors: ['File does not appear to be a valid Apple Health export. Missing required XML structure.']
        };
      }
      
      // Extract records in smaller chunks to prevent memory issues
      // Apple Health uses self-closing Record tags
      let recordMatches = xmlContent.match(/<Record[^>]*\/>/g);
      console.log(`Found ${recordMatches?.length || 0} self-closing Record tags`);
      
      if (!recordMatches || recordMatches.length === 0) {
        // Try alternative pattern for records with closing tags
        recordMatches = xmlContent.match(/<Record[^>]*>.*?<\/Record>/g);
        console.log(`Found ${recordMatches?.length || 0} Record tags with closing tags`);
        
        if (!recordMatches || recordMatches.length === 0) {
          // Try extracting sample content for debugging
          const sampleContent = xmlContent.substring(0, 1000);
          console.log('Sample XML content:', sampleContent);
          
          return {
            success: false,
            errors: [
              'No health records found in XML file. Please ensure this is a valid Apple Health export.',
              'Expected to find <Record> tags in the XML content.'
            ]
          };
        }
      }
      
      // Ensure recordMatches is not null for TypeScript
      if (!recordMatches) {
        return {
          success: false,
          errors: ['Failed to parse health records from XML file.']
        };
      }

      const parsedData: ParsedHealthDataPoint[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};
      const chunkSize = 1000; // Process 1000 records at a time
      let totalRecords = recordMatches.length;
      let validRecords = 0;

      // Process records in chunks to prevent memory overload
      for (let i = 0; i < recordMatches.length; i += chunkSize) {
        const chunk = recordMatches.slice(i, i + chunkSize);
        
        // Report progress every 10,000 records and call progress callback
        if (i % 10000 === 0) {
          const processed = Math.min(i + chunkSize, recordMatches.length);
          const percentage = (processed / recordMatches.length) * 100;
          console.log(`Processed ${processed} of ${recordMatches.length} records`);
          
          if (progressCallback) {
            progressCallback({
              processed,
              total: recordMatches.length,
              percentage
            });
          }
        }
        
        // Force garbage collection between chunks for large files
        if (global.gc && i > 0 && i % (chunkSize * 5) === 0) {
          global.gc();
        }
        
        // Process each record in the chunk
        for (const recordXml of chunk) {
          try {
            // Extract attributes from XML using regex (faster than full XML parsing)
            const typeMatch = recordXml.match(/type="([^"]+)"/);
            const valueMatch = recordXml.match(/value="([^"]+)"/);
            const unitMatch = recordXml.match(/unit="([^"]+)"/);
            
            // Try both creationDate and startDate for compatibility
            let creationDateMatch = recordXml.match(/creationDate="([^"]+)"/);
            if (!creationDateMatch) {
              creationDateMatch = recordXml.match(/startDate="([^"]+)"/);
            }
            // Also try endDate as fallback
            if (!creationDateMatch) {
              creationDateMatch = recordXml.match(/endDate="([^"]+)"/);
            }
            
            const sourceNameMatch = recordXml.match(/sourceName="([^"]+)"/);

            if (!typeMatch || !valueMatch || !creationDateMatch) {
              // Log detailed error for debugging
              if (errors.length < 10) { // Limit error logging to prevent spam
                errors.push(`Skipping record: missing required fields (type: ${!!typeMatch}, value: ${!!valueMatch}, date: ${!!creationDateMatch})`);
              }
              continue; // Skip invalid records
            }

            const type = typeMatch[1];
            let mapping = this.appleHealthTypeMapping[type];

            // Handle Apple Health sleep analysis with value-based types
            if (!mapping && type === 'HKCategoryTypeIdentifierSleepAnalysis') {
              const value = valueMatch[1];
              const sleepType = `HKCategoryValueSleepAnalysis${value}`;
              mapping = this.appleHealthTypeMapping[sleepType];
            }

            if (!mapping) {
              continue; // Skip unsupported types
            }

            const timestamp = new Date(creationDateMatch[1]);
            if (isNaN(timestamp.getTime())) {
              continue; // Skip invalid timestamps
            }

            const dataPoint: ParsedHealthDataPoint = {
              dataType: mapping.dataType,
              value: valueMatch[1],
              unit: unitMatch ? unitMatch[1] : undefined,
              timestamp,
              source: sourceNameMatch ? sourceNameMatch[1] : 'Apple Health',
              category: mapping.category,
              metadata: {
                originalType: type,
                source: 'apple_health'
              }
            };

            parsedData.push(dataPoint);
            validRecords++;

            // Track categories
            const categoryKey = mapping.category || 'other';
            categories[categoryKey] = (categories[categoryKey] || 0) + 1;

          } catch (recordError) {
            if (errors.length < 5) { // Limit error logging
              errors.push(`Error processing record: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
            }
          }
        }

        // Log progress for very large files
        if (i > 0 && i % (chunkSize * 10) === 0) {
          console.log(`Processed ${Math.min(i + chunkSize, recordMatches.length)} of ${recordMatches.length} records`);
        }
      }

      console.log(`Chunked processing complete: ${validRecords} valid records from ${totalRecords} total`);

      // Report 100% completion
      if (progressCallback) {
        progressCallback({
          processed: totalRecords,
          total: totalRecords,
          percentage: 100
        });
      }

      // Ensure we have some valid data
      if (validRecords === 0) {
        return {
          success: false,
          errors: [
            'No valid health records were found in the file.',
            'Please ensure this is a valid Apple Health export.',
            ...errors.slice(0, 3) // Include first few parsing errors for debugging
          ]
        };
      }

      return {
        success: true,
        data: parsedData,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Limit errors shown
        summary: {
          totalRecords,
          validRecords,
          skippedRecords: totalRecords - validRecords,
          categories
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Chunked XML processing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
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
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return {
          success: false,
          errors: ['CSV file must have at least a header row and one data row']
        };
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['date', 'data_type', 'value'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return {
          success: false,
          errors: [`Missing required CSV headers: ${missingHeaders.join(', ')}`]
        };
      }

      const parsedData: ParsedHealthDataPoint[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          if (!row.date || !row.data_type || !row.value) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          const timestamp = new Date(row.date);
          if (isNaN(timestamp.getTime())) {
            errors.push(`Row ${i + 1}: Invalid date format`);
            continue;
          }

          // Determine category based on data type
          const category = this.categorizeDataType(row.data_type);

          const dataPoint: ParsedHealthDataPoint = {
            dataType: row.data_type,
            value: row.value,
            unit: row.unit || undefined,
            timestamp: timestamp,
            source: row.source || 'csv_import',
            category: category,
            metadata: {
              rowIndex: i + 1
            }
          };

          parsedData.push(dataPoint);
          categories[category] = (categories[category] || 0) + 1;
        } catch (rowError) {
          errors.push(`Row ${i + 1}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
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
}