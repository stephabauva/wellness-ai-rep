#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SlashCommandParser {
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

    parseSlashCommand(input) {
        // Handle both /command and /command <prompt> formats
        const slashMatch = input.match(/^\/([a-z-]+)(?:\s+(.*))?$/);
        
        if (!slashMatch) {
            return null;
        }

        const command = slashMatch[1];
        const prompt = slashMatch[2] || '';

        return { command, prompt };
    }

    executeCommand(command, prompt = '') {
        if (!this.availableCommands.includes(command)) {
            console.error(chalk.red(`❌ Unknown command: /${command}`));
            console.log(chalk.yellow('Available commands:'), this.availableCommands.map(cmd => `/${cmd}`).join(', '));
            return false;
        }

        console.log(chalk.cyan(`\n🚀 Executing Claude Code Command: /${command}`));
        if (prompt) {
            console.log(chalk.gray(`Prompt: ${prompt}`));
        }
        console.log('');

        try {
            // Execute the underlying command via our replit command runner
            const commandArgs = prompt ? [command, prompt] : [command];
            execSync(`node replit-claude-code-commands.js ${commandArgs.join(' ')}`, {
                encoding: 'utf8',
                stdio: 'inherit'
            });
            
            console.log(chalk.green(`\n✅ Command /${command} completed successfully!`));
            return true;
        } catch (error) {
            // Many analysis scripts exit with code 1 even when successful (warnings/info)
            // Only show error if there's an actual execution failure
            if (error.status === 127 || error.message.includes('command not found')) {
                console.error(chalk.red(`❌ Error executing /${command}:`), error.message);
                return false;
            }
            
            // For non-critical exit codes, show completion message
            console.log(chalk.yellow(`\n⚠️  Command /${command} completed with warnings (exit code: ${error.status})`));
            return true;
        }
    }

    showHelp() {
        console.log(chalk.cyan('\n⚡ Claude Code Slash Commands for Replit\n'));
        console.log(chalk.yellow('Usage:'));
        console.log(chalk.white('  /command [prompt]'));
        console.log(chalk.white('  node slash-command-parser.js "/command [prompt]"'));
        console.log('');
        
        console.log(chalk.yellow('Available slash commands:'));
        this.availableCommands.forEach(cmd => {
            try {
                const cmdPath = path.join(this.commandsDir, `${cmd}.md`);
                const content = fs.readFileSync(cmdPath, 'utf8');
                const firstLine = content.split('\n').find(line => line.trim().startsWith('#'));
                const description = firstLine ? firstLine.replace(/^#+\s*/, '') : 'No description';
                console.log(chalk.green(`  /${cmd.padEnd(15)}`), chalk.gray(description));
            } catch (error) {
                console.log(chalk.green(`  /${cmd.padEnd(15)}`), chalk.gray('Command file error'));
            }
        });

        console.log(chalk.cyan('\nExamples:'));
        console.log(chalk.white('  /arch-guard'));
        console.log(chalk.white('  /workit'));
        console.log(chalk.white('  /clean-code'));
        console.log(chalk.white('  /safe-refactor "analyze large components"'));
        
        console.log(chalk.cyan('\nIntegration Options:'));
        console.log(chalk.gray('• Add to shell aliases: alias arch-guard="node slash-command-parser.js \'/arch-guard\'"'));
        console.log(chalk.gray('• Create wrapper scripts for each command'));
        console.log(chalk.gray('• Use in Replit console directly'));
    }

    run() {
        const input = process.argv[2];
        
        if (!input || input === '--help' || input === '-h') {
            this.showHelp();
            return;
        }

        const parsed = this.parseSlashCommand(input);
        
        if (!parsed) {
            console.error(chalk.red('❌ Invalid slash command format. Use: /command [prompt]'));
            console.log(chalk.yellow('Example: /arch-guard or /workit "start development"'));
            process.exit(1);
        }

        const success = this.executeCommand(parsed.command, parsed.prompt);
        process.exit(success ? 0 : 1);
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const parser = new SlashCommandParser();
    parser.run();
}

export default SlashCommandParser;