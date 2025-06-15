
# Expo Test Plan for Wellness Coach App

## Mission
Create a safe, low-risk test environment to evaluate Expo compatibility with the existing wellness coach PWA. This test follows I1 stability constraints with zero impact on the current application.

## Test Strategy: Parallel Expo Experiment

### Directory Structure
```
wellness-coach-pwa/     (your current app - untouched)
├── client/
├── server/             (shared backend)
└── Port 5000 → Current PWA

expo-test/              (new test directory)
├── App.js
├── package.json
├── app.json
└── Port 19006 → Expo preview
```

## Phase 1: Basic Expo Setup (1-2 hours)

### 1.1 Initialize Expo Project
```bash
# Create separate test directory
mkdir expo-test
cd expo-test

# Initialize Expo project
npx create-expo-app --template blank-typescript
```

### 1.2 Verify Replit Compatibility
**Test Objectives:**
- Expo development server starts correctly
- Web preview renders on port 19006
- QR code generation for mobile testing
- Hot reload functionality works in Replit environment

### 1.3 Basic Hello World Test
```typescript
// expo-test/App.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wellness Coach - Expo Test</Text>
      <Text style={styles.subtitle}>Testing Expo compatibility</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
  },
});
```

## Phase 2: Backend Integration Test (2-3 hours)

### 2.1 API Connectivity Test
```typescript
// expo-test/services/api-test.ts
const API_BASE = 'http://0.0.0.0:5000/api';

export const testBackendConnection = async () => {
  try {
    // Test existing Express API
    const response = await fetch(`${API_BASE}/settings`);
    const data = await response.json();
    
    console.log('Backend connection successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Backend connection failed:', error);
    return { success: false, error };
  }
};
```

### 2.2 Simple Chat Component Test
```typescript
// expo-test/components/ChatTest.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export const ChatTest = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const sendTestMessage = async () => {
    try {
      const result = await fetch('http://0.0.0.0:5000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      const data = await result.json();
      setResponse(data.response || 'Test successful');
    } catch (error) {
      setResponse('Connection error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Test Backend Connection:</Text>
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Enter test message"
        placeholderTextColor="#666"
      />
      <TouchableOpacity style={styles.button} onPress={sendTestMessage}>
        <Text style={styles.buttonText}>Send Test</Text>
      </TouchableOpacity>
      {response ? <Text style={styles.response}>{response}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#333',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  response: {
    color: '#00FF00',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#222',
    borderRadius: 4,
  },
});
```

## Phase 3: Health Data Access Test (3-4 hours)

### 3.1 Expo Sensors Integration
```typescript
// expo-test/components/HealthTest.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';

export const HealthTest = () => {
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    // Test basic sensor access
    const accelSubscription = Accelerometer.addListener(setAccelerometerData);
    const gyroSubscription = Gyroscope.addListener(setGyroscopeData);

    Accelerometer.setUpdateInterval(1000);
    Gyroscope.setUpdateInterval(1000);

    return () => {
      accelSubscription?.remove();
      gyroSubscription?.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Data Test</Text>
      
      <View style={styles.dataContainer}>
        <Text style={styles.label}>Accelerometer:</Text>
        <Text style={styles.data}>
          X: {accelerometerData.x.toFixed(2)} |
          Y: {accelerometerData.y.toFixed(2)} |
          Z: {accelerometerData.z.toFixed(2)}
        </Text>
      </View>

      <View style={styles.dataContainer}>
        <Text style={styles.label}>Gyroscope:</Text>
        <Text style={styles.data}>
          X: {gyroscopeData.x.toFixed(2)} |
          Y: {gyroscopeData.y.toFixed(2)} |
          Z: {gyroscopeData.z.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dataContainer: {
    marginBottom: 15,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 5,
  },
  data: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
```

### 3.2 File Upload Test
```typescript
// expo-test/components/FileTest.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export const FileTest = () => {
  const [fileResult, setFileResult] = useState<string>('No file selected');

  const testFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setFileResult(`Selected: ${result.assets[0].name}`);
        
        // Test upload to existing API
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || 'application/octet-stream',
          name: result.assets[0].name,
        } as any);

        const uploadResponse = await fetch('http://0.0.0.0:5000/api/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (uploadResponse.ok) {
          setFileResult(`Upload successful: ${result.assets[0].name}`);
        } else {
          setFileResult(`Upload failed: ${result.assets[0].name}`);
        }
      }
    } catch (error) {
      setFileResult(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Upload Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testFilePicker}>
        <Text style={styles.buttonText}>Test File Picker & Upload</Text>
      </TouchableOpacity>
      
      <Text style={styles.result}>{fileResult}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  result: {
    color: '#ffffff',
    fontSize: 14,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 4,
  },
});
```

## Testing Checklist

### Replit Environment ✅
- [ ] Expo development server starts on port 19006
- [ ] Web preview displays correctly in Replit
- [ ] QR code generates for mobile testing with Expo Go
- [ ] Hot reload works without breaking HMR on port 5000
- [ ] No conflicts with existing PWA development

### Backend Integration ✅
- [ ] API calls to existing Express server work
- [ ] Authentication flow compatible (if implemented)
- [ ] File upload functionality works
- [ ] WebSocket connections work (if used)
- [ ] Database operations function correctly

### Native Capabilities ✅
- [ ] Basic sensor access works on mobile device
- [ ] File picker functions correctly
- [ ] Camera access possible (test with ImagePicker)
- [ ] Permission system works properly
- [ ] Performance acceptable on test device

### Development Experience ✅
- [ ] TypeScript support works correctly
- [ ] Error messages are helpful
- [ ] Debugging tools function
- [ ] Build process is smooth
- [ ] Mobile testing workflow is efficient

## Success Criteria

### Technical Validation
- **API Compatibility**: All existing endpoints work with React Native fetch
- **Performance**: UI feels responsive with < 300ms interaction delays
- **Sensor Access**: Basic health data collection possible
- **File Operations**: Upload/download functionality works correctly

### Workflow Validation
- **Replit Development**: Smooth dual-port development (5000 + 19006)
- **Mobile Testing**: QR code testing works reliably
- **Code Reuse**: TypeScript interfaces and utilities work unchanged
- **Error Handling**: Graceful degradation when native features unavailable

### Decision Metrics
After testing, evaluate:

1. **Development Productivity**: How smooth is the Expo workflow in Replit?
2. **Code Reuse Potential**: How much existing logic can be preserved?
3. **Performance**: Does React Native feel native enough?
4. **Health Data Access**: Are native capabilities sufficient?
5. **Learning Curve**: Is the transition manageable within timeline?

## Risk Mitigation

### Zero Impact Guarantee
- **Isolated Testing**: Completely separate from existing PWA
- **Shared Backend**: Uses existing Express API without modification
- **Independent Ports**: No interference with current development
- **Easy Cleanup**: Can delete expo-test directory with no traces

### Rollback Strategy
- **Instant Removal**: Delete expo-test directory if issues arise
- **No Dependencies**: No changes to existing codebase
- **Preserved Workflow**: PWA development continues unchanged
- **Data Safety**: All existing data and functionality preserved

## Expected Outcomes

### If Test Succeeds
- **Confidence**: Validated approach for full React Native migration
- **Timeline**: Confirmed 10-15 day estimate is realistic
- **Architecture**: Proven dual-codebase strategy works
- **Capabilities**: Confirmed native health data access possible

### If Test Reveals Issues
- **Alternative Paths**: Consider Capacitor or pure web enhancement
- **Risk Assessment**: Updated understanding of migration complexity
- **Timeline Adjustment**: Realistic effort estimation
- **Decision Data**: Concrete information for strategic planning

## Next Steps After Testing

### Positive Test Results
1. Proceed with Phase 1 of complete React Native migration plan
2. Begin detailed feature-by-feature migration assessment
3. Start React Native project setup in production environment
4. Create detailed timeline for full application migration

### Mixed/Negative Test Results
1. Reassess migration strategy
2. Consider Capacitor alternative
3. Focus on PWA enhancements instead
4. Evaluate hybrid approach possibilities

## Timeline
- **Setup & Basic Test**: 2 hours
- **Backend Integration**: 3 hours  
- **Native Features**: 4 hours
- **Evaluation & Decision**: 1 hour
- **Total Time Investment**: 10 hours over 2-3 days

This test provides a concrete, low-risk evaluation of Expo's suitability for your wellness coach app while respecting all I1 constraints and maintaining zero impact on your existing application.
