#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileSizeAnalyzer {
    constructor() {
        this.rules = {
            routes: { maxLines: 300, pattern: /^server\/routes\/.*\.(js|ts)$/ },
            components: { maxLines: 300, pattern: /^client\/src\/components\/.*\.(tsx|jsx)$/ },
            services: { maxLines: 200, pattern: /^server\/services\/.*\.(js|ts)$/ },
            general: { maxLines: 500, pattern: /\.(js|ts|tsx|jsx)$/ }
        };
        
        this.violations = [];
        this.stats = {
            totalFiles: 0,
            oversizedFiles: 0,
            largestFile: { path: '', lines: 0 }
        };
    }

    isRelevantFile(filePath) {
        return /\.(js|ts|tsx|jsx)$/.test(filePath) && 
               !filePath.includes('node_modules') &&
               !filePath.includes('.git') &&
               !filePath.includes('dist') &&
               !filePath.includes('build');
    }

    getFileType(filePath) {
        for (const [type, rule] of Object.entries(this.rules)) {
            if (type !== 'general' && rule.pattern.test(filePath)) {
                return type;
            }
        }
        return 'general';
    }

    analyzeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const lineCount = lines.length;
            
            this.stats.totalFiles++;
            
            if (lineCount > this.stats.largestFile.lines) {
                this.stats.largestFile = { path: filePath, lines: lineCount };
            }

            const fileType = this.getFileType(filePath);
            const maxLines = this.rules[fileType].maxLines;
            
            if (lineCount > maxLines) {
                this.stats.oversizedFiles++;
                this.violations.push({
                    path: filePath,
                    type: fileType,
                    lines: lineCount,
                    maxLines: maxLines,
                    excess: lineCount - maxLines,
                    severity: this.getSeverity(lineCount, maxLines)
                });
            }
            
            return { lines: lineCount, type: fileType };
        } catch (error) {
            console.warn(`Warning: Could not analyze ${filePath}: ${error.message}`);
            return null;
        }
    }

    getSeverity(lines, maxLines) {
        const ratio = lines / maxLines;
        if (ratio > 5) return 'CRITICAL';
        if (ratio > 3) return 'HIGH';
        if (ratio > 2) return 'MEDIUM';
        return 'LOW';
    }

    scanDirectory(dir = '.') {
        const files = this.getAllFiles(dir);
        
        files.forEach(file => {
            if (this.isRelevantFile(file)) {
                this.analyzeFile(file);
            }
        });
    }

    getAllFiles(dir) {
        let results = [];
        
        try {
            const list = fs.readdirSync(dir);
            
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat && stat.isDirectory()) {
                    if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
                        results = results.concat(this.getAllFiles(filePath));
                    }
                } else {
                    results.push(filePath);
                }
            });
        } catch (error) {
            console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
        }
        
        return results;
    }

    generateReport() {
        console.log('\n📊 FILE SIZE ANALYSIS REPORT\n');
        console.log('═'.repeat(50));
        
        // Summary
        console.log(`📈 SUMMARY:`);
        console.log(`   Total files analyzed: ${this.stats.totalFiles}`);
        console.log(`   Oversized files: ${this.stats.oversizedFiles}`);
        console.log(`   Largest file: ${this.stats.largestFile.path} (${this.stats.largestFile.lines} lines)`);
        
        if (this.violations.length === 0) {
            console.log('\n✅ All files are within size limits!');
            return;
        }

        // Violations by severity
        const bySeverity = this.violations.reduce((acc, v) => {
            acc[v.severity] = (acc[v.severity] || 0) + 1;
            return acc;
        }, {});

        console.log(`\n🚨 VIOLATIONS BY SEVERITY:`);
        Object.entries(bySeverity).forEach(([severity, count]) => {
            const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟡' : '🟠';
            console.log(`   ${icon} ${severity}: ${count} files`);
        });

        // Top violations
        console.log(`\n🔥 TOP OVERSIZED FILES:`);
        this.violations
            .sort((a, b) => b.excess - a.excess)
            .slice(0, 10)
            .forEach((violation, i) => {
                const icon = violation.severity === 'CRITICAL' ? '🔴' : 
                           violation.severity === 'HIGH' ? '🟡' : '🟠';
                console.log(`   ${i + 1}. ${icon} ${violation.path}`);
                console.log(`      ${violation.lines} lines (${violation.excess} over ${violation.maxLines} limit)`);
                console.log(`      Type: ${violation.type} | Severity: ${violation.severity}`);
                console.log('');
            });

        // Recommendations
        console.log(`\n💡 RECOMMENDATIONS:`);
        const criticalFiles = this.violations.filter(v => v.severity === 'CRITICAL');
        if (criticalFiles.length > 0) {
            console.log(`   🔴 URGENT: ${criticalFiles.length} critical files need immediate refactoring`);
        }
        
        const routeViolations = this.violations.filter(v => v.type === 'routes');
        if (routeViolations.length > 0) {
            console.log(`   📁 Consider splitting ${routeViolations.length} oversized route files`);
        }
        
        const componentViolations = this.violations.filter(v => v.type === 'components');
        if (componentViolations.length > 0) {
            console.log(`   🧩 Consider breaking down ${componentViolations.length} large components`);
        }

        console.log('\n═'.repeat(50));
        
        // Exit with error code if violations found
        if (this.violations.length > 0) {
            process.exit(1);
        }
    }

    run() {
        console.log('🔍 Analyzing file sizes...\n');
        this.scanDirectory();
        this.generateReport();
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const analyzer = new FileSizeAnalyzer();
    analyzer.run();
}

export default FileSizeAnalyzer;