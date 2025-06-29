
# React Native Implementation Plan

## Mission
Create a React Native mobile app that provides native health data access while maintaining **absolute stability** of the existing PWA. This plan follows the I1 stability constraints and implements a parallel development approach.

## Strategic Approach: Dual-Codebase Architecture

### **Why React Native Over Capacitor:**
- **I1 Compliance**: Zero risk to existing PWA - completely separate project
- **Native Performance**: Direct HealthKit/Google Fit access without web limitations  
- **Replit Preview Compatibility**: Both apps can coexist with different preview strategies
- **Better Health Data Access**: Native APIs vs plugin-dependent approach

### **Replit Preview Strategy**

```
Current Setup:
├── wellness-coach-pwa/     (your current app - unchanged)
│   ├── client/
│   ├── server/             (Express API - shared)
│   └── Port 5000 → PWA Preview

New Setup:
├── wellness-coach-pwa/     (unchanged - continues on port 5000)
├── wellness-coach-native/  (new React Native project)
│   ├── src/
│   ├── expo/
│   └── Port 19006 → Expo Web Preview (for testing)
```

**Preview Solutions:**
1. **PWA Preview**: Continues on port 5000 (unchanged)
2. **React Native Preview**: Uses Expo's web compilation on port 19006
3. **Mobile Testing**: Expo Go app + QR code from Replit
4. **Shared Backend**: Both frontends use same Express API

## Phase 1: React Native Project Setup (Days 1-2)

### **1.1 Create Separate React Native Directory Structure**
```
wellness-coach-native/
├── src/
│   ├── components/
│   ├── screens/
│   ├── services/         (API calls to existing Express server)
│   ├── hooks/           (90% reusable from PWA)
│   ├── utils/           (100% reusable)
│   └── types/           (100% reusable)
├── assets/
├── app.json             (Expo configuration)
├── package.json         (React Native dependencies)
└── App.tsx              (Entry point)
```

### **1.2 Backend Strategy: Zero Changes**
- **Express Server**: Remains unchanged on port 5000
- **API Endpoints**: 100% reusable for React Native
- **Database**: Same PostgreSQL/SQLite instance
- **File Storage**: Same upload system

### **1.3 Development Workflow**
```bash
# Terminal 1: Keep existing PWA running
npm run dev  # Runs on port 5000

# Terminal 2: Start React Native (in wellness-coach-native/)
npm start    # Expo starts on port 19006
```

## Phase 2: Health Data Native Integration (Days 3-5)

### **2.1 Native Health Libraries**
```json
{
  "react-native-health": "^1.19.0",        // iOS HealthKit
  "react-native-google-fit": "^0.20.0",    // Android Google Fit
  "expo-sensors": "~12.0.0",               // Device sensors
  "expo-permissions": "~14.0.0"            // Permission handling
}
```

### **2.2 Service Layer Reuse**
```typescript
// services/health-api.ts (90% reusable from PWA)
class HealthApiService {
  private baseUrl = 'http://0.0.0.0:5000/api'; // Points to existing Express server
  
  async uploadHealthData(data: HealthData) {
    // Same API endpoint as PWA uses
    return fetch(`${this.baseUrl}/health/upload`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}
```

### **2.3 Native Health Data Collection**
```typescript
// services/native-health-service.ts
import { HealthKit } from 'react-native-health';
import { GoogleFit } from 'react-native-google-fit';

class NativeHealthService {
  async syncHealthData() {
    // Native collection replaces XML file uploads
    const data = Platform.OS === 'ios' 
      ? await this.getHealthKitData()
      : await this.getGoogleFitData();
    
    // Send to existing Express API
    return this.healthApiService.uploadHealthData(data);
  }
}
```

## Phase 3: UI Component Migration (Days 6-8)

### **3.1 Component Mapping Strategy**
```
PWA Components → React Native Components:
├── ChatSection.tsx → ChatScreen.tsx (70% logic reuse)
├── MessageDisplayArea.tsx → MessageList.tsx (80% logic reuse)
├── FileManagerSection.tsx → FileScreen.tsx (60% logic reuse)
├── HealthDataSection.tsx → HealthScreen.tsx (90% logic reuse)
└── Hooks (useChatActions, etc.) → 95% reusable
```

### **3.2 Shared Business Logic**
```typescript
// hooks/useChatActions.ts (95% reusable)
const useChatActions = () => {
  const apiUrl = 'http://0.0.0.0:5000/api'; // Same backend
  
  const sendMessage = async (message: string) => {
    // Same API call as PWA
    return fetch(`${apiUrl}/chat/send`, { /* same logic */ });
  };
  
  return { sendMessage /* all existing logic works */ };
};
```

## Phase 4: Native Feature Implementation (Days 9-10)

### **4.1 Native Capabilities**
```typescript
// Real-time health sync (impossible in PWA)
const useHealthSync = () => {
  useEffect(() => {
    const subscription = HealthKit.subscribeToChanges();
    return () => subscription.unsubscribe();
  }, []);
};

// Background data collection
const useBackgroundSync = () => {
  useEffect(() => {
    BackgroundTask.define(() => {
      syncHealthDataToServer();
    });
  }, []);
};
```

## Phase 5: Replit Integration & Testing (Days 11-12)

### **5.1 Replit Preview Configuration**
```json
// .replit update for dual preview support
{
  "run": "npm run dev", // PWA continues unchanged
  "ports": [
    {"localPort": 5000, "externalPort": 80},    // PWA
    {"localPort": 19006, "externalPort": 8080}  // React Native web preview
  ]
}
```

### **5.2 Mobile Testing Strategy**
```bash
# In Replit terminal
cd wellness-coach-native
npm start
# Shows QR code for Expo Go testing
# Expo web preview available on port 19006
```

## Phase 6: Deployment Strategy

### **6.1 PWA Deployment (Unchanged)**
- Continues deploying to `your-repl.replit.app`
- Zero changes to existing users

### **6.2 React Native Distribution**
```bash
# Build APK/IPA (can be done in Replit)
npx eas build --platform android
npx eas build --platform ios

# Serve download links from Express server
app.get('/download/android', (req, res) => {
  res.redirect('link-to-apk-hosted-on-replit');
});
```

## Migration Benefits vs Capacitor

| Aspect | Capacitor | React Native |
|--------|-----------|--------------|
| Code Reuse | 90% | 70% |
| Native Performance | Good | Excellent |
| Health Data Access | Plugin-dependent | Direct native APIs |
| Replit Preview | Complex | Clean separation |
| Development Complexity | Medium | Medium-High |
| Future Scalability | Limited | Excellent |

## Risk Mitigation

### **I1 Compliance Guarantee**
- **Zero PWA Changes**: Existing app continues unchanged
- **Separate Codebase**: No shared dependencies
- **Shared Backend Only**: Express API remains identical
- **Independent Deployment**: PWA users unaffected

### **Rollback Strategy**
```typescript
// Feature flag for gradual migration
const APP_CONFIG = {
  pwaUrl: 'https://your-repl.replit.app',
  nativeAppAvailable: true,
  forceNativeUpgrade: false
};
```

## Success Metrics

- **PWA Stability**: 100% uptime maintained
- **Native Performance**: <2s app launch time
- **Health Sync**: Real-time data collection working
- **User Migration**: Smooth transition option available

This approach gives you the native capabilities you need while maintaining perfect I1 compliance and preserving your Replit development workflow. The PWA continues serving users while React Native provides the premium native experience for health data access.
