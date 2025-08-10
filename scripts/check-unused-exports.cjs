#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run ts-unused-exports and capture output, suppressing stdout
let output;
try {
  output = execSync('npx ts-unused-exports tsconfig.json', { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'] // Capture stdout and stderr
  });
} catch (error) {
  // If the command exits with non-zero (which ts-unused-exports does when it finds issues)
  // we still get the output in error.stdout
  if (error.stdout) {
    output = error.stdout;
  } else {
    console.error('Error running ts-unused-exports:', error.message);
    process.exit(1);
  }
}

if (!output || output.includes('0 modules with unused exports')) {
  console.log('✅ No unused exports found!');
  process.exit(0);
}

// Parse the output
const lines = output.trim().split('\n');
const unusedExports = [];

// Skip the header line and parse each export
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^(.+): (.+)$/);
  
  if (match) {
    const filePath = match[1];
    const exports = match[2].split(', ');
    
    for (const exportName of exports) {
      unusedExports.push({ filePath, exportName: exportName.trim() });
    }
  }
}

// Filter out UI components and check if exports are used within the same file
const trulyUnused = [];
const ignoredFromUI = [];
const usedInternally = [];

// Known dynamic imports that ts-unused-exports can't detect
const knownDynamicImports = [
  { filePath: 'src/lib/buildMnemonicPrompt.ts', exportName: 'buildQuickMnemonicPrompt' }
];

for (const item of unusedExports) {
  // Skip files in /components/ui folder
  if (item.filePath.includes('/components/ui/')) {
    ignoredFromUI.push(item);
    continue;
  }
  
  // Skip Next.js generated files and config
  if (item.filePath.includes('.next/') || item.filePath.endsWith('next.config.ts')) {
    ignoredFromUI.push(item);
    continue;
  }
  
  // Skip known dynamic imports
  if (knownDynamicImports.some(known =>
    item.filePath.endsWith(known.filePath) && item.exportName === known.exportName
  )) {
    usedInternally.push(item);
    continue;
  }
  
  const fileContent = fs.readFileSync(item.filePath, 'utf8');
  
  // Check if the export is used within the same file
  const usagePatterns = [
    new RegExp(`:\\s*${item.exportName}(?:[\\s<\\[{(,;]|$)`, 'm'),
    new RegExp(`<${item.exportName}[\\s>]`, 'm'),
    new RegExp(`extends\\s+${item.exportName}`, 'm'),
    new RegExp(`implements\\s+${item.exportName}`, 'm'),
    new RegExp(`\\(.*:\\s*${item.exportName}[\\s\\)|,]`, 'm'),
    new RegExp(`=\\s*${item.exportName}[\\s;]`, 'm'),
    new RegExp(`\\{[^}]*${item.exportName}[^}]*\\}\\s*from`, 'm'),
  ];
  
  let isUsedInFile = false;
  
  for (const pattern of usagePatterns) {
    if (pattern.test(fileContent)) {
      // Make sure we're not matching the export declaration itself
      const exportPattern = new RegExp(`export\\s+(?:type|interface|const|let|var|function|class)\\s+${item.exportName}`, 'm');
      const exportOnlyPattern = new RegExp(`export\\s*\\{[^}]*${item.exportName}[^}]*\\}`, 'm');
      
      // Remove export declarations from content
      const contentWithoutExports = fileContent
        .replace(exportPattern, '')
        .replace(exportOnlyPattern, '');
      
      // Check if still used after removing exports
      if (pattern.test(contentWithoutExports)) {
        isUsedInFile = true;
        break;
      }
    }
  }
  
  if (isUsedInFile) {
    usedInternally.push(item);
  } else {
    trulyUnused.push(item);
  }
}

// Format output
console.log('\n📊 Unused Exports Analysis\n');

if (trulyUnused.length === 0) {
  console.log('✅ No truly unused exports found!\n');
} else {
  // Group by file
  const byFile = {};
  for (const item of trulyUnused) {
    if (!byFile[item.filePath]) {
      byFile[item.filePath] = [];
    }
    byFile[item.filePath].push(item.exportName);
  }
  
  const fileCount = Object.keys(byFile).length;
  console.log(`❌ ${fileCount} module${fileCount > 1 ? 's' : ''} with truly unused exports:\n`);
  
  for (const [filePath, exports] of Object.entries(byFile)) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`   ${relativePath}:`);
    console.log(`   └─ ${exports.join(', ')}\n`);
  }
}

// Show statistics
console.log('📈 Statistics:');
console.log(`   • Total exports analyzed: ${unusedExports.length}`);
console.log(`   • Ignored (UI components): ${ignoredFromUI.length}`);
console.log(`   • Used internally: ${usedInternally.length}`);
console.log(`   • Truly unused: ${trulyUnused.length}`);

// Exit with error code if there are truly unused exports
if (trulyUnused.length > 0) {
  process.exit(1);
}