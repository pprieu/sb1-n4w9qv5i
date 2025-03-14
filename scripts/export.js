import fs from 'fs-extra';
import archiver from 'archiver';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Define the output directory and zip file name
const outputDir = path.join(rootDir, 'export');
const zipFileName = 'golf-tracker-export.zip';
const zipFilePath = path.join(outputDir, zipFileName);

// Create the output directory if it doesn't exist
fs.ensureDirSync(outputDir);

// Create a file to stream archive data to
const output = fs.createWriteStream(zipFilePath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', () => {
  console.log(`✅ Archive created successfully: ${zipFilePath}`);
  console.log(`📦 Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n📋 Instructions:');
  console.log('1. Extract the zip file on your local machine');
  console.log('2. Create a .env file in the root directory with your Supabase credentials');
  console.log('3. Run "npm install" to install dependencies');
  console.log('4. Run "npm run dev" to start the development server');
  console.log('5. Follow the instructions in export-instructions.md for database setup');
});

// Handle warnings and errors
archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️ Warning:', err);
  } else {
    throw err;
  }
});

archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Files and directories to include in the export
const filesToInclude = [
  'src',
  'public',
  'supabase',
  'index.html',
  'package.json',
  'package-lock.json',
  'postcss.config.js',
  'tailwind.config.js',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vitest.config.ts',
  'export-instructions.md',
  'eslint.config.js'
];

// Files to exclude from the export
const filesToExclude = [
  'node_modules',
  'dist',
  '.git',
  '.env',
  'export'
];

// Add each file/directory to the archive
for (const file of filesToInclude) {
  const filePath = path.join(rootDir, file);
  
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // Add directory to archive
        archive.directory(filePath, file, (entry) => {
          // Skip excluded files/directories
          const relativePath = entry.name.replace(`${file}/`, '');
          if (filesToExclude.some(exclude => relativePath.includes(exclude))) {
            return false;
          }
          return entry;
        });
      } else {
        // Add file to archive
        archive.file(filePath, { name: file });
      }
      
      console.log(`✓ Added: ${file}`);
    } else {
      console.log(`⚠️ Skipped (not found): ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err);
  }
}

// Create a sample .env file (without actual credentials)
const sampleEnvContent = `# Supabase Configuration
# Replace with your actual Supabase URL and anon key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
`;

archive.append(sampleEnvContent, { name: '.env.example' });
console.log('✓ Added: .env.example');

// Finalize the archive
archive.finalize();