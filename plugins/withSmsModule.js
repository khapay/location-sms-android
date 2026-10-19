const {
    withDangerousMod,
    withMainApplication,
    withAndroidManifest,
} = require('@expo/config-plugins');
const fs = require('fs'),
    path = require('path');
module.exports = function withSmsModule(config) {
    config = withAndroidManifest(config, (c) => {
        const m = c.modResults.manifest;
        const app = m.application[0];
        app['uses-permission'] = app['uses-permission'] || [];
        return c;
    });
    config = withDangerousMod(config, [
        'android',
        async (c) => {
            const root = c.modRequest.platformProjectRoot;
            const pkg = c.android?.package || 'com.example.locationsms';
            const dir = path.join(root, 'app/src/main/java', ...pkg.split('.'));
            fs.mkdirSync(dir, { recursive: true });
            const src = fs
                .readFileSync(path.join(__dirname, 'LocationSmsModule.kt'), 'utf8')
                .replaceAll('PACKAGE_NAME', pkg);
            fs.writeFileSync(path.join(dir, 'LocationSmsModule.kt'), src);
            return c;
        },
    ]);
    config = withMainApplication(config, (c) => {
        let s = c.modResults.contents;
        const pkg = c.android?.package || 'com.example.locationsms';
        if (!s.includes('LocationSmsPackage()')) {
            s = s.replace(
                /(PackageList\(this\)\.packages\.apply\s*\{)/,
                '$1\n              add(LocationSmsPackage())',
            );
            if (!s.includes('import ' + pkg + '.LocationSmsPackage'))
                s = s.replace(
                    /(package\s+[^\n]+\n)/,
                    '$1\nimport ' + pkg + '.LocationSmsPackage\n',
                );
        }
        c.modResults.contents = s;
        return c;
    });
    return config;
};
