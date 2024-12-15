const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, 'node_modules', 'tinymce');
const targetDir = path.join(__dirname, 'public', 'tinymce');

// Assurez-vous que le répertoire cible existe
fs.ensureDirSync(targetDir);

// Liste des dossiers et fichiers à copier
const itemsToCopy = [
    'tinymce.min.js',
    'themes',
    'plugins',
    'icons',
    'models',
    'skins'
];

// Copier chaque élément
itemsToCopy.forEach(item => {
    const sourcePath = path.join(sourceDir, item);
    const targetPath = path.join(targetDir, item);
    
    if (fs.existsSync(sourcePath)) {
        try {
            fs.copySync(sourcePath, targetPath);
        } catch (err) {
            console.error(`Error copying ${item}:`, err);
        }
    } else {
        console.warn(`Warning: ${item} not found in source directory`);
    }
});