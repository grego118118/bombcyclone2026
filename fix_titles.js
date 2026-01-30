const fs = require('fs');
const path = require('path');

const directories = ['states', 'guides'];
const filesToProcess = [];

directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.html'));
        files.forEach(f => filesToProcess.push(path.join(fullPath, f)));
    }
});

filesToProcess.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    const oldTitle = /CYCLONE 26/g;
    const newTitle = 'CYCLONE 2026';

    const updatedContent = content.replace(oldTitle, newTitle);

    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent);
        console.log(`✅ Updated Title: ${path.basename(filePath)}`);
    } else {
        console.log(`ℹ️ No Title changes: ${path.basename(filePath)}`);
    }
});
