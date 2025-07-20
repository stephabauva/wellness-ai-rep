#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ClaudeCommandRunner {
    constructor() {
        this.commandsDir = path.join(__dirname, '.claude', 'commands');
        this.availableCommands = this.loadCommands();
    }

    loadCommands() {
        try {
            const commandFiles = fs.readdirSync(this.commandsDir)
                .filter(file => file.endsWith('.md'))
                .map(file => file.replace('.md', ''));
            return commandFiles;
        } catch (error) {
            console.error(chalk.red('Error loading commands directory:'), error.message);
            return [];
        }
    }

    showHelp() {
        console.log(chalk.cyan('\n🤖 Claude Commands for Replit\n'));
        console.log(chalk.yellow('Available commands:'));
        
        this.availableCommands.forEach(cmd => {
            const cmdPath = path.join(this.commandsDir, `${cmd}.md`);
            try {
                const content = fs.readFileSync(cmdPath, 'utf8');
                const firstLine = content.split('\n').find(line => line.trim().startsWith('#'));
                const description = firstLine ? firstLine.replace(/^#+\s*/, '') : 'No description';
                console.log(chalk.green(`  ${cmd.padEnd(15)}`), chalk.gray(description));
            } catch (error) {
                console.log(chalk.green(`  ${cmd.padEnd(15)}`), chalk.gray('Command file error'));
            }
        });

        console.log(chalk.cyan('\nUsage:'));
        console.log(chalk.white('  node claude-commands.js <command>'));
        console.log(chalk.white('  npm run claude <command>'));
        console.log(chalk.white('  npm run claude -- --help'));
        
        console.log(chalk.cyan('\nExamples:'));
        console.log(chalk.white('  node claude-commands.js workit'));
        console.log(chalk.white('  npm run claude arch-guard'));
        console.log(chalk.white('  npm run claude clean-code'));
    }

    runCommand(commandName) {
        if (!this.availableCommands.includes(commandName)) {
            console.error(chalk.red(`❌ Unknown command: ${commandName}`));
            console.log(chalk.yellow('Available commands:'), this.availableCommands.join(', '));
            return false;
        }

        const cmdPath = path.join(this.commandsDir, `${commandName}.md`);
        
        try {
            const content = fs.readFileSync(cmdPath, 'utf8');
            console.log(chalk.cyan(`\n🚀 Executing Claude Command: ${commandName}\n`));
            
            // Parse and execute the command based on its type
            switch (commandName) {
                case 'arch-guard':
                    return this.runArchGuard(content);
                case 'workit':
                    return this.runWorkit(content);
                case 'clean-code':
                    return this.runCleanCode(content);
                case 'safe-refactor':
                    return this.runSafeRefactor(content);
                case 'chew':
                    return this.runChew(content);
                case 'ultra-think':
                    return this.runUltraThink(content);
                case 'zapper':
                    return this.runZapper(content);
                case 'mobile-ux':
                    return this.runMobileUx(content);
                default:
                    return this.runGenericCommand(commandName, content);
            }
        } catch (error) {
            console.error(chalk.red(`❌ Error executing command ${commandName}:`), error.message);
            return false;
        }
    }

    runArchGuard(content) {
        console.log(chalk.blue('🛡️  Running Architecture Guardian checks...\n'));
        
        const checks = [
            { name: 'Dependency Analysis', script: 'node dependency-tracker.js', required: true },
            { name: 'Import Malformation Check', script: 'node malformed-import-detector.js', required: true },
            { name: 'File Size Analysis', script: 'npm run check:filesize', required: true },
            { name: 'Async/Await Check', script: 'npm run check:async', required: true },
            { name: 'TypeScript Check', script: 'npm run check', required: true }
        ];

        let allPassed = true;
        
        for (const check of checks) {
            try {
                console.log(chalk.yellow(`⏳ ${check.name}...`));
                const result = execSync(check.script, { encoding: 'utf8', stdio: 'pipe' });
                console.log(chalk.green(`✅ ${check.name} passed`));
                if (result.trim()) {
                    console.log(chalk.gray(result.trim()));
                }
            } catch (error) {
                console.log(chalk.red(`❌ ${check.name} failed`));
                if (error.stdout) console.log(chalk.red(error.stdout));
                if (error.stderr) console.log(chalk.red(error.stderr));
                allPassed = false;
                if (check.required) {
                    console.log(chalk.red(`🚨 Required check failed: ${check.name}`));
                }
            }
            console.log(''); // Add spacing
        }

        if (allPassed) {
            console.log(chalk.green('🎉 All architecture checks passed! Safe to proceed with development.'));
        } else {
            console.log(chalk.red('⚠️  Some architecture checks failed. Please fix issues before proceeding.'));
        }

        return allPassed;
    }

    runWorkit(content) {
        console.log(chalk.blue('🔨 WorkIt: Production-Ready Development Mode\n'));
        
        // Display the workit principles
        console.log(chalk.cyan('📋 Execution Principles:'));
        console.log(chalk.white('• Production-ready code only - every line must work'));
        console.log(chalk.white('• Simplicity first - minimal code changes'));
        console.log(chalk.white('• Integration required - no TODOs allowed'));
        console.log(chalk.white('• Test incrementally - don\'t wait until end\n'));

        // Run pre-execution validation
        console.log(chalk.yellow('🔍 Pre-execution validation...'));
        const archPassed = this.runCommand('arch-guard');
        
        if (!archPassed) {
            console.log(chalk.red('❌ Pre-execution validation failed. Fix architecture issues first.'));
            return false;
        }

        console.log(chalk.green('✅ Pre-execution validation passed. Ready for development!'));
        
        // Show key development reminders
        console.log(chalk.cyan('\n📝 Development Reminders:'));
        console.log(chalk.white('• Update system maps as you modify features'));
        console.log(chalk.white('• Test functionality after each change'));
        console.log(chalk.white('• File limits: ≤300 lines per route/component'));
        console.log(chalk.white('• Domain boundaries: health/, memory/, chat/, settings/, etc.'));
        console.log(chalk.white('• Remove old code when creating replacements\n'));

        return true;
    }

    runCleanCode(content) {
        console.log(chalk.blue('🧹 Clean Code Checklist Validation\n'));
        
        // Component count check
        try {
            const componentCount = execSync('find client/src/components -name "*.tsx" 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
            console.log(chalk.yellow(`📊 Current component count: ${componentCount}/25`));
            if (parseInt(componentCount) > 25) {
                console.log(chalk.red('⚠️  Exceeding component limit! Consider consolidation.'));
            }
        } catch (error) {
            console.log(chalk.gray('ℹ️  Could not count components (directory may not exist yet)'));
        }

        // Service count check
        try {
            const serviceCount = execSync('find server/services -name "*.ts" 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
            console.log(chalk.yellow(`🔧 Current service count: ${serviceCount}/20`));
            if (parseInt(serviceCount) > 20) {
                console.log(chalk.red('⚠️  Exceeding service limit! Consider merging single-method services.'));
            }
        } catch (error) {
            console.log(chalk.gray('ℹ️  Could not count services (directory may not exist yet)'));
        }

        // Run validation commands
        console.log(chalk.cyan('\n🔍 Running validation checks...\n'));
        const checks = [
            'node dependency-tracker.js',
            'node malformed-import-detector.js',
            'npm run check'
        ];

        let allPassed = true;
        for (const check of checks) {
            try {
                console.log(chalk.yellow(`⏳ Running: ${check}`));
                const result = execSync(check, { encoding: 'utf8', stdio: 'pipe' });
                console.log(chalk.green('✅ Passed'));
            } catch (error) {
                console.log(chalk.red('❌ Failed'));
                allPassed = false;
            }
        }

        // Display domain placement reminder
        console.log(chalk.cyan('\n📁 Domain Placement Reminder:'));
        console.log(chalk.white('• health/ - Health data, reports, medical info'));
        console.log(chalk.white('• memory/ - Chat memory, conversation state'));
        console.log(chalk.white('• chat/ - Chat interface, messaging'));
        console.log(chalk.white('• settings/ - User preferences, config'));
        console.log(chalk.white('• file-manager/ - File upload, management'));
        console.log(chalk.white('• home/ - Landing page, dashboard'));
        console.log(chalk.white('• auth/ - Authentication, login, signup'));
        console.log(chalk.white('• shared/ - ONLY cross-cutting utilities\n'));

        return allPassed;
    }

    runSafeRefactor(content) {
        console.log(chalk.blue('🔧 Safe Refactor: Large File Analysis\n'));
        
        // Run file size analysis
        try {
            console.log(chalk.yellow('📊 Analyzing file sizes...'));
            execSync('npm run check:filesize', { stdio: 'inherit' });
        } catch (error) {
            console.log(chalk.red('❌ File size analysis failed or found violations'));
        }

        console.log(chalk.cyan('\n📏 File Size Thresholds:'));
        console.log(chalk.green('• ≤300 lines: ✅ Ideal zone'));
        console.log(chalk.yellow('• 300-500 lines: ⚠️  Review for extraction opportunities'));
        console.log(chalk.red('• 500-800 lines: 🔴 Should be refactored'));
        console.log(chalk.red('• >800 lines: 💀 Critical - needs immediate splitting\n'));

        console.log(chalk.cyan('🛡️  Safety Protocol:'));
        console.log(chalk.white('1. Run architectural checks first'));
        console.log(chalk.white('2. Extract only 1-2 items per iteration'));
        console.log(chalk.white('3. Test after each extraction'));
        console.log(chalk.white('4. Maintain domain boundaries'));
        console.log(chalk.white('5. Preserve all functionality\n'));

        return true;
    }

    runChew(content) {
        console.log(chalk.blue('🤔 Chew: Deep Analysis Mode\n'));
        console.log(chalk.cyan('This command helps you think through complex problems systematically.'));
        console.log(chalk.white('📖 Review the .claude/commands/chew.md file for detailed guidance.\n'));
        return true;
    }

    runUltraThink(content) {
        console.log(chalk.blue('🧠 Ultra Think: Maximum Analysis Mode\n'));
        console.log(chalk.cyan('This command enables the deepest level of problem analysis.'));
        console.log(chalk.white('📖 Review the .claude/commands/ultra-think.md file for detailed guidance.\n'));
        return true;
    }

    runZapper(content) {
        console.log(chalk.blue('⚡ Zapper: Quick Problem Resolution\n'));
        console.log(chalk.cyan('This command focuses on rapid issue identification and resolution.'));
        console.log(chalk.white('📖 Review the .claude/commands/zapper.md file for detailed guidance.\n'));
        return true;
    }

    runMobileUx(content) {
        console.log(chalk.blue('📱 Mobile UX: Mobile-First Development\n'));
        console.log(chalk.cyan('This command ensures mobile-first design and development practices.'));
        console.log(chalk.white('📖 Review the .claude/commands/mobile-ux.md file for detailed guidance.\n'));
        return true;
    }

    runGenericCommand(commandName, content) {
        console.log(chalk.blue(`📄 Command: ${commandName}\n`));
        console.log(chalk.white('📖 Command documentation:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(content);
        console.log(chalk.gray('─'.repeat(50)));
        return true;
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new ClaudeCommandRunner();
    const command = process.argv[2];

    if (!command || command === '--help' || command === '-h') {
        runner.showHelp();
    } else {
        const success = runner.runCommand(command);
        process.exit(success ? 0 : 1);
    }
}

export default ClaudeCommandRunner;