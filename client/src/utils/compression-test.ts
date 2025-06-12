import { FileCompressionService } from '@/services/file-compression';

/**
 * Test utility to verify compression functionality
 */
export async function testCompression() {
  // Create a test XML file similar to Apple Health export
  const testXMLContent = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <ExportDate value="2024-01-01 00:00:00 +0000"/>
  <Me HKCharacteristicTypeIdentifierDateOfBirth="1990-01-01" 
      HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexMale"
      HKCharacteristicTypeIdentifierBloodType="HKBloodTypeAPositive"/>
  ${Array.from({ length: 1000 }, (_, i) => `
  <Record type="HKQuantityTypeIdentifierHeartRate" 
          sourceName="Apple Watch" 
          sourceVersion="10.0" 
          device="&lt;&lt;HKDevice: 0x123456789&gt;&gt;" 
          unit="count/min" 
          creationDate="2024-01-${String(i % 30 + 1).padStart(2, '0')} ${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00 +0000" 
          startDate="2024-01-${String(i % 30 + 1).padStart(2, '0')} ${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00 +0000" 
          endDate="2024-01-${String(i % 30 + 1).padStart(2, '0')} ${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00 +0000" 
          value="${60 + (i % 40)}"/>
  `).join('')}
</HealthData>`;

  // Create test file
  const testFile = new File([testXMLContent], 'test-health-export.xml', {
    type: 'text/xml'
  });

  console.log('Original file size:', testFile.size, 'bytes');
  console.log('Should compress file:', FileCompressionService.shouldCompressFile(testFile));
  console.log('Estimated compression ratio:', FileCompressionService.estimateCompressionRatio(testFile), '%');

  try {
    const result = await FileCompressionService.compressFile(testFile);
    console.log('Compression successful!');
    console.log('Original size:', result.originalSize, 'bytes');
    console.log('Compressed size:', result.compressedSize, 'bytes');
    console.log('Compression ratio:', result.compressionRatio.toFixed(2), '%');
    console.log('Space saved:', result.originalSize - result.compressedSize, 'bytes');
    
    return result;
  } catch (error) {
    console.error('Compression failed:', error);
    throw error;
  }
}

/**
 * Test the compression service in browser console
 * Call this function to verify everything works
 */
export function runCompressionTest() {
  testCompression()
    .then(result => {
      console.log('✅ Compression test passed!', result);
    })
    .catch(error => {
      console.error('❌ Compression test failed:', error);
    });
}