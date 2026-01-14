const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const FUNCTIONS_DIR = path.join(ROOT_DIR, 'functions');

function runCommand(command, cwd = ROOT_DIR, silent = false) {
    if (!silent) console.log(`> ${command}`);
    try {
        return execSync(command, { cwd, stdio: silent ? 'pipe' : 'inherit' });
    } catch (e) {
        // execSync throws if status != 0
        throw e;
    }
}

function getCommandOutput(command, cwd = ROOT_DIR) {
    return execSync(command, { cwd, stdio: 'pipe' }).toString().trim();
}

async function main() {
    let tgzFile = null;
    let originalPackageJson = null;
    let originalPackageLock = null;

    try {
        console.log('📦 Packing shared workspace...');
        // npm pack returns the filename on stdout
        const packOutput = getCommandOutput('npm pack --workspace=shared', ROOT_DIR);
        const filename = packOutput.trim().split('\n').pop().trim();

        const sourceTgz = path.join(ROOT_DIR, filename);
        const targetTgz = path.join(FUNCTIONS_DIR, 'shared.tgz');

        if (!fs.existsSync(sourceTgz)) {
            throw new Error(`Failed to find packed file: ${sourceTgz}`);
        }

        fs.renameSync(sourceTgz, targetTgz);
        tgzFile = targetTgz;

        console.log('📝 Backing up package configuration...');
        const pkgJsonPath = path.join(FUNCTIONS_DIR, 'package.json');
        const pkgLockPath = path.join(FUNCTIONS_DIR, 'package-lock.json');

        if (fs.existsSync(pkgJsonPath)) {
            originalPackageJson = fs.readFileSync(pkgJsonPath);
        }
        if (fs.existsSync(pkgLockPath)) {
            originalPackageLock = fs.readFileSync(pkgLockPath);
        }

        console.log('🔗 Installing shared dependency locally for deployment...');
        // Install the packed file to update package.json and package-lock.json with local file reference
        // We use npm install (not --no-save) because Cloud Build needs the lockfile to match
        runCommand('npm install ./shared.tgz', FUNCTIONS_DIR, true);

        console.log('🚀 Starting Firebase Deployment...');
        await new Promise((resolve, reject) => {
            const deploy = spawn('firebase', ['deploy', '--only', 'functions'], {
                cwd: ROOT_DIR,
                stdio: 'inherit',
                shell: true
            });

            deploy.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Deployment failed with code ${code}`));
            });
        });

    } catch (error) {
        console.error('❌ Error during deployment:', error.message);
        process.exitCode = 1;
    } finally {
        console.log('🧹 Cleaning up...');
        // Restore backups
        const pkgJsonPath = path.join(FUNCTIONS_DIR, 'package.json');
        const pkgLockPath = path.join(FUNCTIONS_DIR, 'package-lock.json');

        if (originalPackageJson) fs.writeFileSync(pkgJsonPath, originalPackageJson);
        if (originalPackageLock) fs.writeFileSync(pkgLockPath, originalPackageLock);

        // Remove tgz
        if (tgzFile && fs.existsSync(tgzFile)) {
            fs.unlinkSync(tgzFile);
        }

        console.log('🔄 Restoring workspace links...');
        // Restore the original node_modules linking
        try {
            // We need to run install in root to re-link workspaces
            runCommand('npm install', ROOT_DIR, true);
            console.log('✅ Workspace links restored.');
        } catch (e) {
            console.warn('⚠️  Could not auto-restore workspace links. Please run "npm install" in the root directory manually.');
        }
    }
}

main();
