import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export async function loadCommands() {
    const commands: Record<string, any> = {};

    const subDirs = fs.readdirSync(currentDir, { withFileTypes: true }).filter(dirent => dirent.isDirectory());

    for (const dirent of subDirs) {
        const subDirPath = path.join(currentDir, dirent.name);
        const files = fs.readdirSync(subDirPath).filter(file => file.endsWith('.ts'));

        for (const file of files) {
            const moduleName = path.basename(file, '.ts');
            const modulePath = `file://${path.join(subDirPath, file)}`;
            
            try {
                const module = await import(modulePath);
                commands[moduleName] = module;
            } catch (error) {
                console.error(`Failed to import ${modulePath}:`, error);
            }
        }
    }

    return commands;
}
