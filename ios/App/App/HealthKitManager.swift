import Foundation
import HealthKit
import Capacitor

@objc(HealthKitManager)
public class HealthKitManager: CAPPlugin {
    private let healthStore = HKHealthStore()
    
    private let healthKitTypes: [String: HKQuantityTypeIdentifier] = [
        "steps": .stepCount,
        "heart_rate": .heartRate,
        "active_energy": .activeEnergyBurned,
        "distance_walking": .distanceWalkingRunning,
        "body_mass": .bodyMass,
        "height": .height,
        "blood_pressure_systolic": .bloodPressureSystolic,
        "blood_pressure_diastolic": .bloodPressureDiastolic,
        "respiratory_rate": .respiratoryRate
    ]
    
    @objc func checkPermissions(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        
        var readPermissions: [String] = []
        var writePermissions: [String] = []
        
        for (key, identifier) in healthKitTypes {
            let quantityType = HKQuantityType.quantityType(forIdentifier: identifier)!
            let authStatus = healthStore.authorizationStatus(for: quantityType)
            
            if authStatus == .sharingAuthorized {
                readPermissions.append(key)
            }
        }
        
        call.resolve([
            "granted": !readPermissions.isEmpty,
            "readPermissions": readPermissions,
            "writePermissions": writePermissions
        ])
    }
    
    @objc func requestPermissions(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        
        guard let readTypes = call.getArray("readTypes", String.self) else {
            call.reject("Missing readTypes parameter")
            return
        }
        
        var typesToRead = Set<HKObjectType>()
        
        for typeString in readTypes {
            if let identifier = getIdentifierFromString(typeString) {
                if let quantityType = HKQuantityType.quantityType(forIdentifier: identifier) {
                    typesToRead.insert(quantityType)
                }
            }
        }
        
        // Add sleep analysis
        if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            typesToRead.insert(sleepType)
        }
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Permission request failed: \(error.localizedDescription)")
                    return
                }
                
                var grantedPermissions: [String] = []
                for (key, identifier) in self.healthKitTypes {
                    let quantityType = HKQuantityType.quantityType(forIdentifier: identifier)!
                    let authStatus = self.healthStore.authorizationStatus(for: quantityType)
                    
                    if authStatus == .sharingAuthorized {
                        grantedPermissions.append(key)
                    }
                }
                
                call.resolve([
                    "granted": success && !grantedPermissions.isEmpty,
                    "readPermissions": grantedPermissions,
                    "writePermissions": []
                ])
            }
        }
    }
    
    @objc func queryData(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        
        guard let queries = call.getArray("queries") else {
            call.reject("Missing queries parameter")
            return
        }
        
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing date parameters")
            return
        }
        
        let dateFormatter = ISO8601DateFormatter()
        guard let startDate = dateFormatter.date(from: startDateString),
              let endDate = dateFormatter.date(from: endDateString) else {
            call.reject("Invalid date format")
            return
        }
        
        let limit = call.getInt("limit") ?? 1000
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        var allResults: [[String: Any]] = []
        let group = DispatchGroup()
        
        for queryData in queries {
            guard let queryDict = queryData as? [String: Any],
                  let typeString = queryDict["type"] as? String,
                  let friendlyName = queryDict["friendlyName"] as? String else {
                continue
            }
            
            group.enter()
            
            if let identifier = getIdentifierFromString(typeString) {
                let quantityType = HKQuantityType.quantityType(forIdentifier: identifier)!
                
                let query = HKSampleQuery(sampleType: quantityType, predicate: predicate, limit: limit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]) { query, samples, error in
                    
                    if let samples = samples as? [HKQuantitySample] {
                        for sample in samples {
                            let result: [String: Any] = [
                                "id": sample.uuid.uuidString,
                                "type": friendlyName,
                                "value": sample.quantity.doubleValue(for: self.getUnitForType(identifier)),
                                "unit": self.getUnitStringForType(identifier),
                                "timestamp": sample.startDate.timeIntervalSince1970 * 1000,
                                "source": sample.sourceRevision.source.name,
                                "metadata": sample.metadata ?? [:]
                            ]
                            allResults.append(result)
                        }
                    }
                    
                    group.leave()
                }
                
                healthStore.execute(query)
            } else {
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            call.resolve([
                "success": true,
                "data": allResults
            ])
        }
    }
    
    private func getIdentifierFromString(_ typeString: String) -> HKQuantityTypeIdentifier? {
        switch typeString {
        case "HKQuantityTypeIdentifierStepCount":
            return .stepCount
        case "HKQuantityTypeIdentifierHeartRate":
            return .heartRate
        case "HKQuantityTypeIdentifierActiveEnergyBurned":
            return .activeEnergyBurned
        case "HKQuantityTypeIdentifierDistanceWalkingRunning":
            return .distanceWalkingRunning
        case "HKQuantityTypeIdentifierBodyMass":
            return .bodyMass
        case "HKQuantityTypeIdentifierHeight":
            return .height
        case "HKQuantityTypeIdentifierBloodPressureSystolic":
            return .bloodPressureSystolic
        case "HKQuantityTypeIdentifierBloodPressureDiastolic":
            return .bloodPressureDiastolic
        case "HKQuantityTypeIdentifierRespiratoryRate":
            return .respiratoryRate
        default:
            return nil
        }
    }
    
    private func getUnitForType(_ identifier: HKQuantityTypeIdentifier) -> HKUnit {
        switch identifier {
        case .stepCount:
            return HKUnit.count()
        case .heartRate:
            return HKUnit(from: "count/min")
        case .activeEnergyBurned:
            return HKUnit.kilocalorie()
        case .distanceWalkingRunning:
            return HKUnit.meter()
        case .bodyMass:
            return HKUnit.gramUnit(with: .kilo)
        case .height:
            return HKUnit.meter()
        case .bloodPressureSystolic, .bloodPressureDiastolic:
            return HKUnit.millimeterOfMercury()
        case .respiratoryRate:
            return HKUnit(from: "count/min")
        default:
            return HKUnit.count()
        }
    }
    
    private func getUnitStringForType(_ identifier: HKQuantityTypeIdentifier) -> String {
        switch identifier {
        case .stepCount:
            return "steps"
        case .heartRate:
            return "bpm"
        case .activeEnergyBurned:
            return "kcal"
        case .distanceWalkingRunning:
            return "m"
        case .bodyMass:
            return "kg"
        case .height:
            return "m"
        case .bloodPressureSystolic, .bloodPressureDiastolic:
            return "mmHg"
        case .respiratoryRate:
            return "breaths/min"
        default:
            return "count"
        }
    }
}