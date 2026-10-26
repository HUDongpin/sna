import fs from 'node:fs';

// gcloud --raw gives the stable Storage JSON API field names.
const [file, projectNumber, bucketName, phase] = process.argv.slice(2);
const bucket = JSON.parse(fs.readFileSync(file, 'utf8'));
function requireSetting(condition, message) {
    if (!condition) {
        console.error(message);
        process.exit(2);
    }
}
requireSetting(bucket.name === bucketName && String(bucket.projectNumber) === projectNumber,
    'Refusing a job bucket outside the selected project or with an unexpected name.');
requireSetting(bucket.labels?.app === 'open-sna' && bucket.labels?.purpose === 'durable-jobs' && bucket.labels?.['managed-by'] === 'open-sna-worker-deploy',
    'Refusing an existing bucket without the dedicated Open SNA ownership/purpose labels. Choose a new dedicated bucket.');
requireSetting(!bucket.retentionPolicy && !bucket.defaultEventBasedHold && bucket.objectRetention?.mode !== 'Enabled',
    'Refusing a bucket with a retention policy, default hold, or per-object retention. Preserve it and choose a new dedicated bucket.');

if (phase === 'configured') {
    requireSetting(bucket.iamConfiguration?.publicAccessPrevention === 'enforced' && bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled === true,
        'Job bucket privacy verification failed: public access prevention and uniform access are required.');
    requireSetting(!bucket.versioning?.enabled && (!bucket.softDeletePolicy || Number(bucket.softDeletePolicy.retentionDurationSeconds) === 0),
        'Job bucket privacy verification failed: versioning and soft delete must be disabled.');
    const rules = bucket.lifecycle?.rule || [];
    requireSetting(rules.length === 1 && rules[0].action?.type === 'Delete' && rules[0].condition?.age === 1 &&
        JSON.stringify(rules[0].condition?.matchesPrefix) === '["jobs/"]' && Object.keys(rules[0].condition).length === 2,
        'Job bucket lifecycle verification failed: only the jobs/ one-day deletion rule is allowed.');
}
