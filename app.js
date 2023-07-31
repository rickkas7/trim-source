const fs = require('fs');
const path = require('path');

const { hideBin } = require('yargs/helpers');
const argv = require('yargs/yargs')(hideBin(process.argv)).argv;

const rootDir = '/Users/rickk/Documents/src/TestEI/You_re_Muted__inferencing_v10';
let mapDir = 'target/5.4.1/p2';

if (!mapDir.startsWith('/')) {
    mapDir = path.join(rootDir, mapDir);
}
let mapFileName;
for(const f of fs.readdirSync(mapDir)) {
    if (f.endsWith('.map')) {
        mapFileName = f;
        break;
    }
}
if (!mapFileName) {
    console.log('map filename not found');
    process.exit(1);
}

const srcDir = path.join(rootDir, 'src');

const mapContents = fs.readFileSync(path.join(mapDir, mapFileName), 'utf8');

// libuser.a(arm_depthwise_conv_u8_basic_ver1.o)
const re = /libuser\.a\((.*)\.o\)/;

let files = {};

for(const line of mapContents.split(/\n/)) {
    const m = line.match(re);
    if (m) {
        const f = m[1];
        if (!files[f]) {
            files[f] = true;
        }
    }
}
console.log('files', files);

let removeFiles = [];
let hasFiles = {};

function processDir(d) {
    for(const dirent of fs.readdirSync(d, {withFileTypes:true})) {
        if (dirent.isDirectory()) {
            if (!dirent.name.startsWith('.')) {
                processDir(path.join(d, dirent.name));
            }
        }
        else
        if (dirent.isFile()) {
            const lastDot = dirent.name.lastIndexOf('.');
            if (lastDot) {
                const base = dirent.name.substring(0, lastDot);
                const ext = dirent.name.substring(lastDot + 1);
                if (ext == 'cpp' || ext == 'c') {
                    if (!files[base]) {
                        removeFiles.push(path.join(d, dirent.name));
                        console.log('remove ' + dirent.name + ' in ' + d);
                        if (!hasFiles[d]) {
                            hasFiles[d] = 0;
                        }
                    }
                    else {
                        if (typeof hasFiles[d] == 'undefined') {
                            hasFiles[d] = 1;
                        }
                        else {
                            hasFiles[d]++;
                        }
                    }
                }
            }

        }
    }
}

processDir(srcDir);

console.log('hasFiles', hasFiles);

let removeDirs = [];

const exceptionDirs = [
//     'edge-impulse-sdk/porting/particle',
];


for(const key in hasFiles) {
    if (hasFiles[key] === 0) {
        let isException = false;
        for(const f of exceptionDirs) {
            if (key.includes(f)) {
                isException = true;
            }
        }

        if (!isException) {
            console.log('remove dir ' + key);
            removeDirs.push(key);    
        }
    }
}

let removeFilesFiltered = [];
for(const f of removeFiles) {
    let parentDirRemoved = false;
    for(const d of removeDirs) {
        if (f.startsWith(d)) {
            parentDirRemoved = true;
            break;
        }
    }
    if (!parentDirRemoved) {
        removeFilesFiltered.push(f);
        console.log('remove file ' + f);
    }
}

console.log('removed ' + removeDirs.length + ' directories');
console.log('removed ' + removeFiles.length + ' c and cpp source files');
